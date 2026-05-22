import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getAppUrl, getStripe } from "@/lib/stripe";
import { validateClinicAccess } from "@/lib/apiAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const access = await validateClinicAccess(request);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const { clinicId } = access;

    const supabase = createSupabaseAdmin();
    const { data: clinic, error } = await supabase
      .from("clinics")
      .select("stripe_customer_id")
      .eq("id", clinicId)
      .maybeSingle();
    if (error) throw error;
    if (!clinic?.stripe_customer_id) {
      return NextResponse.json({ error: "Cliente Stripe nao encontrado." }, { status: 404 });
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: clinic.stripe_customer_id,
      return_url: `${getAppUrl()}/app?action=subscription`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal failed:", error);
    return NextResponse.json({ error: "Nao foi possivel abrir o portal." }, { status: 500 });
  }
}
