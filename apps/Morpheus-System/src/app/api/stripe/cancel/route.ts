import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getStripe } from "@/lib/stripe";

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
      .select("stripe_subscription_id")
      .eq("id", body.clinicId)
      .maybeSingle();

    if (error) throw error;
    if (!clinic?.stripe_subscription_id) {
      return NextResponse.json({ error: "Assinatura Stripe nao encontrada." }, { status: 404 });
    }

    const subscription = await getStripe().subscriptions.cancel(clinic.stripe_subscription_id);

    const { error: updateError } = await supabase
      .from("clinics")
      .update({
        stripe_status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.clinicId);

    if (updateError) throw updateError;

    return NextResponse.json({ ok: true, status: subscription.status });
  } catch (error) {
    console.error("Stripe cancel failed:", error);
    return NextResponse.json({ error: "Nao foi possivel cancelar a assinatura." }, { status: 500 });
  }
}
