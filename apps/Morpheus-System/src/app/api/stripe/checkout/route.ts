import { NextResponse } from "next/server";
import { DEFAULT_BILLING_ACCOUNT_ID } from "@/lib/billing";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe, getStripePriceId } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      plan?: "monthly" | "yearly";
      email?: string;
    };
    const plan = body.plan === "yearly" ? "yearly" : "monthly";
    const priceId = getStripePriceId(plan);

    if (!priceId) {
      return NextResponse.json({ error: "Plano Stripe não configurado." }, { status: 500 });
    }

    let stripeCustomerId: string | undefined;

    try {
      const supabase = createSupabaseAdmin();
      const { data: account } = await supabase
        .from("billing_accounts")
        .select("stripe_customer_id")
        .eq("id", DEFAULT_BILLING_ACCOUNT_ID)
        .maybeSingle();
      stripeCustomerId = account?.stripe_customer_id || undefined;
    } catch (error) {
      console.warn("Checkout will continue without an existing Stripe customer:", error);
    }

    const appUrl = getAppUrl();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      customer_email: stripeCustomerId ? undefined : body.email?.trim() || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/app?checkout=success`,
      cancel_url: `${appUrl}/landing?checkout=canceled`,
      metadata: {
        billing_account_id: DEFAULT_BILLING_ACCOUNT_ID,
        plan,
      },
      subscription_data: {
        metadata: {
          billing_account_id: DEFAULT_BILLING_ACCOUNT_ID,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout failed:", error);
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento." }, { status: 500 });
  }
}
