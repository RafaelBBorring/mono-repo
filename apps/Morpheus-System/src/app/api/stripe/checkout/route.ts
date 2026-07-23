import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe } from "@/lib/stripe";
import type { PlanId } from "@/lib/plans";
import { validateClinicAccess } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_MAP: Record<PlanId, { monthly: string; yearly: string }> = {
  essential: {
    monthly: process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_ESSENTIAL_YEARLY || "",
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_PRO_YEARLY || "",
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY || "",
    yearly: process.env.STRIPE_PRICE_ELITE_YEARLY || "",
  },
};

function getPriceId(plan: PlanId, interval: "monthly" | "yearly"): string | undefined {
  return PRICE_MAP[plan]?.[interval] || undefined;
}

async function validateCoupon(code: string) {
  const supabase = createSupabaseAdmin();
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("id, code, label, discount_pct, max_uses, current_uses, valid_from, valid_until, active")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error("Coupon DB query error:", error);
    return null;
  }
  if (!coupon || !coupon.active) return null;

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return null;
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return null;
  if (coupon.max_uses !== -1 && coupon.current_uses >= coupon.max_uses) return null;

  const pct = Number(coupon.discount_pct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
    console.error("Coupon discount_pct invalid:", coupon.discount_pct);
    return null;
  }

  return { ...coupon, discount_pct: pct };
}

export async function POST(request: Request) {
  try {
    const access = await validateClinicAccess(request);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const { clinicId } = access;

    const body = (await request.json().catch(() => ({}))) as {
      plan?: PlanId;
      interval?: "monthly" | "yearly";
      email?: string;
      trial?: boolean;
      couponCode?: string;
    };

    const plan: PlanId = body.plan || "pro";
    const interval: "monthly" | "yearly" = body.interval || "monthly";
    const isTrial = body.trial === true;
    if (!(["essential", "pro", "elite"] as string[]).includes(plan)) {
      return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
    }
    if (!(["monthly", "yearly"] as string[]).includes(interval)) {
      return NextResponse.json({ error: "Periodicidade invalida." }, { status: 400 });
    }
    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe nao configurado." }, { status: 500 });
    }

    let stripeCustomerId: string | undefined;
    let trialClaimed = false;
    const supabase = createSupabaseAdmin();
    const { data: clinicRow, error: clinicError } = await supabase
      .from("clinics")
      .select("stripe_customer_id, stripe_subscription_id, stripe_status, trial_used, trial_checkout_session_id, trial_checkout_expires_at")
      .eq("id", clinicId)
      .maybeSingle();
    if (clinicError) throw clinicError;
    if (!clinicRow) return NextResponse.json({ error: "Clinica nao encontrada." }, { status: 404 });
    if (clinicRow.stripe_subscription_id && ["active", "trialing", "past_due"].includes(clinicRow.stripe_status)) {
      return NextResponse.json({ error: "Esta clinica ja possui uma assinatura. Use o portal para alterar o plano." }, { status: 409 });
    }
    if (isTrial) {
      if (plan !== "essential") {
        return NextResponse.json({ error: "O teste gratuito esta disponivel no plano Essential." }, { status: 400 });
      }
      if (clinicRow.trial_used) {
        return NextResponse.json({ error: "Periodo de teste ja utilizado." }, { status: 400 });
      }
      const stripe = getStripe();
      if (
        clinicRow.trial_checkout_session_id &&
        clinicRow.trial_checkout_expires_at &&
        new Date(clinicRow.trial_checkout_expires_at) > new Date()
      ) {
        const previousSession = await stripe.checkout.sessions.retrieve(clinicRow.trial_checkout_session_id);
        if (previousSession.status === "open" && previousSession.url) {
          return NextResponse.json({ url: previousSession.url, reused: true });
        }
      }

      const claimExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { data: claimed } = await supabase
        .from("clinics")
        .update({
          trial_checkout_session_id: null,
          trial_checkout_expires_at: claimExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", clinicId)
        .eq("trial_used", false)
        .or(`trial_checkout_expires_at.is.null,trial_checkout_expires_at.lt.${new Date().toISOString()}`)
        .select("id")
        .maybeSingle();
      if (!claimed) {
        return NextResponse.json({ error: "O checkout do teste ja esta sendo preparado. Tente novamente em instantes." }, { status: 409 });
      }
      trialClaimed = true;
    }
    stripeCustomerId = clinicRow.stripe_customer_id || undefined;

    const appUrl = getAppUrl();
    const stripe = getStripe();

    let stripeCouponId: string | undefined;

    if (body.couponCode) {
      try {
        const coupon = await validateCoupon(body.couponCode);
        if (coupon) {
          const stableCouponId = `morpheus_${coupon.id.replace(/-/g, "")}`;
          try {
            const existingCoupon = await stripe.coupons.retrieve(stableCouponId);
            if (!existingCoupon.deleted) stripeCouponId = existingCoupon.id;
          } catch {
            try {
              const stripeCoupon = await stripe.coupons.create({
                id: stableCouponId,
                percent_off: coupon.discount_pct,
                duration: "once",
                name: `${coupon.label} (${coupon.code})`,
                max_redemptions: coupon.max_uses === -1 ? undefined : coupon.max_uses,
                redeem_by: coupon.valid_until
                  ? Math.floor(new Date(coupon.valid_until).getTime() / 1000)
                  : undefined,
                metadata: { morpheus_coupon_id: coupon.id, morpheus_coupon_code: coupon.code },
              });
              stripeCouponId = stripeCoupon.id;
            } catch (creationError) {
              const concurrentCoupon = await stripe.coupons.retrieve(stableCouponId);
              if (concurrentCoupon.deleted) throw creationError;
              stripeCouponId = concurrentCoupon.id;
            }
          }
        } else {
          return NextResponse.json({ error: "Cupom invalido, expirado ou sem usos disponiveis." }, { status: 400 });
        }
      } catch (couponErr) {
        console.error("Stripe coupon creation failed:", couponErr);
        return NextResponse.json(
          { error: "Nao foi possivel aplicar o cupom. Tente sem o cupom ou use outro codigo." },
          { status: 400 }
        );
      }
    }

    const customerEmail = stripeCustomerId ? undefined : (body.email?.trim() || undefined);

    const sessionConfig: Record<string, unknown> = {
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app?checkout=success`,
      cancel_url: `${appUrl}/app?checkout=canceled`,
      metadata: {
        clinic_id: clinicId,
        plan,
        interval,
        trial: isTrial ? "true" : "false",
        coupon_code: body.couponCode || "",
      },
      subscription_data: {
        metadata: {
          clinic_id: clinicId,
          plan,
          interval,
        },
      },
    };

    if (stripeCustomerId) {
      sessionConfig.customer = stripeCustomerId;
    } else if (customerEmail) {
      sessionConfig.customer_email = customerEmail;
    }

    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
    } else {
      sessionConfig.allow_promotion_codes = true;
    }

    if (isTrial) {
      (sessionConfig.subscription_data as Record<string, unknown>).trial_period_days = 7;
    }

    let session;
    try {
      session = await stripe.checkout.sessions.create(
        sessionConfig as Parameters<typeof stripe.checkout.sessions.create>[0],
        isTrial ? { idempotencyKey: `morpheus-trial-${clinicId}` } : undefined
      );
      if (isTrial) {
        const { error: sessionStoreError } = await supabase
          .from("clinics")
          .update({
            trial_checkout_session_id: session.id,
            trial_checkout_expires_at: new Date(session.expires_at * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", clinicId)
          .eq("trial_used", false);
        if (sessionStoreError) throw sessionStoreError;
      }
    } catch (error) {
      if (trialClaimed) {
        await createSupabaseAdmin()
          .from("clinics")
          .update({ trial_checkout_session_id: null, trial_checkout_expires_at: null })
          .eq("id", clinicId)
          .eq("trial_used", false);
      }
      throw error;
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe checkout failed:", message);
    return NextResponse.json({ error: message || "Nao foi possivel iniciar o pagamento." }, { status: 500 });
  }
}
