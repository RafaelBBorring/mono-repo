import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe } from "@/lib/stripe";
import type { PlanId } from "@/lib/plans";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      plan?: PlanId;
      interval?: "monthly" | "yearly";
      email?: string;
      clinicId?: string;
      trial?: boolean;
    };

    const plan: PlanId = body.plan || "pro";
    const interval: "monthly" | "yearly" = body.interval || "monthly";
    const isTrial = body.trial === true;
    const priceId = getPriceId(plan, interval);

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe nao configurado." }, { status: 500 });
    }

    let stripeCustomerId: string | undefined;
    let clinicId = body.clinicId;

    try {
      const supabase = createSupabaseAdmin();
      if (!clinicId) {
        return NextResponse.json({ error: "clinicId e obrigatorio." }, { status: 400 });
      }

      const { data: clinicRow } = await supabase
        .from("clinics")
        .select("stripe_customer_id")
        .eq("id", clinicId)
        .maybeSingle();
      stripeCustomerId = clinicRow?.stripe_customer_id || undefined;
    } catch (error) {
      console.warn("Checkout will continue without an existing Stripe customer:", error);
    }

    const appUrl = getAppUrl();
    const stripe = getStripe();

    const sessionConfig: Record<string, unknown> = {
      mode: "subscription",
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : body.email?.trim() || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/app?checkout=success`,
      cancel_url: `${appUrl}/app?checkout=canceled`,
      metadata: {
        clinic_id: clinicId || "",
        plan,
        interval,
        trial: isTrial ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          clinic_id: clinicId || "",
          plan,
          interval,
        },
      },
    };

    if (isTrial) {
      (sessionConfig.subscription_data as Record<string, unknown>).trial_period_days = 7;
      (sessionConfig.subscription_data as Record<string, unknown>).trial_settings = {
        end_behavior: { missing_payment_method: "cancel" },
      };
    }

    const session = await stripe.checkout.sessions.create(
      sessionConfig as Stripe.Checkout.SessionCreateParams
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: "Nao foi possivel iniciar o pagamento." }, { status: 500 });
  }
}
