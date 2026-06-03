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
  const { data: coupon } = await supabase
    .from("coupons")
    .select("id, code, label, discount_pct, max_uses, current_uses, valid_from, valid_until, active")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!coupon || !coupon.active) return null;

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return null;
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return null;
  if (coupon.max_uses !== -1 && coupon.current_uses >= coupon.max_uses) return null;

  return coupon;
}

async function redeemCoupon(couponId: string) {
  try {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase.from("coupons").select("current_uses").eq("id", couponId).maybeSingle();
    const next = (data?.current_uses ?? 0) + 1;
    await supabase.from("coupons").update({ current_uses: next }).eq("id", couponId);
  } catch {}
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
    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe nao configurado." }, { status: 500 });
    }

    if (isTrial) {
      const supabase = createSupabaseAdmin();
      const { data: clinic } = await supabase
        .from("clinics")
        .select("trial_used")
        .eq("id", clinicId)
        .maybeSingle();
      if (clinic?.trial_used) {
        return NextResponse.json({ error: "Periodo de teste ja utilizado." }, { status: 400 });
      }
    }

    let stripeCustomerId: string | undefined;
    try {
      const supabase = createSupabaseAdmin();
      const { data: clinicRow } = await supabase
        .from("clinics")
        .select("stripe_customer_id")
        .eq("id", clinicId)
        .maybeSingle();
      stripeCustomerId = clinicRow?.stripe_customer_id || undefined;
    } catch (error) {
      console.warn("Checkout will continue without an existing Stripe customer.");
    }

    const appUrl = getAppUrl();
    const stripe = getStripe();

    let stripeCouponId: string | undefined;

    if (body.couponCode) {
      const coupon = await validateCoupon(body.couponCode);
      if (coupon) {
        const stripeCoupon = await stripe.coupons.create({
          percent_off: coupon.discount_pct,
          duration: "repeating",
          duration_in_months: 1,
          name: `${coupon.label} (${coupon.code})`,
        });
        stripeCouponId = stripeCoupon.id;
        await redeemCoupon(coupon.id);
      }
    }

    const sessionConfig: Record<string, unknown> = {
      mode: "subscription",
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : body.email?.trim() || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
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

    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
    }

    if (isTrial) {
      (sessionConfig.subscription_data as Record<string, unknown>).trial_period_days = 7;
    }

    const session = await stripe.checkout.sessions.create(
      sessionConfig as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: "Nao foi possivel iniciar o pagamento." }, { status: 500 });
  }
}
