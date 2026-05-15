import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { clinicId?: string };

    if (!body.clinicId) {
      return NextResponse.json({ error: "clinicId e obrigatorio." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("stripe_customer_id")
      .eq("id", body.clinicId)
      .maybeSingle();

    if (error) throw error;
    if (!clinic?.stripe_customer_id) {
      return NextResponse.json({ error: "Cliente Stripe ainda nao existe." }, { status: 404 });
    }

    const session = await getStripe().billingPortal.sessions.create({
      customer: clinic.stripe_customer_id,
      return_url: `${getAppUrl()}/app?action=subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed:", error);
    return NextResponse.json({ error: "Nao foi possivel abrir o portal de cobranca." }, { status: 500 });
  }
}
