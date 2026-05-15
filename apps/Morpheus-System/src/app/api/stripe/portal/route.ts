import { NextResponse } from "next/server";
import { DEFAULT_BILLING_ACCOUNT_ID } from "@/lib/billing";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = createSupabaseAdmin();
    const { data: account, error } = await supabase
      .from("billing_accounts")
      .select("stripe_customer_id")
      .eq("id", DEFAULT_BILLING_ACCOUNT_ID)
      .maybeSingle();

    if (error) throw error;
    if (!account?.stripe_customer_id) {
      return NextResponse.json({ error: "Cliente Stripe ainda não existe." }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${getAppUrl()}/app`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed:", error);
    return NextResponse.json({ error: "Não foi possível abrir o portal de cobrança." }, { status: 500 });
  }
}
