import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getStripe } from "@/lib/stripe";
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
      .select("stripe_subscription_id, cancel_at_period_end")
      .eq("id", clinicId)
      .maybeSingle();
    if (error) throw error;
    if (!clinic?.stripe_subscription_id) {
      return NextResponse.json({ error: "Assinatura nao encontrada." }, { status: 404 });
    }
    if (clinic.cancel_at_period_end) {
      return NextResponse.json({ ok: true, status: "already_scheduled" });
    }

    const subscription = await getStripe().subscriptions.update(
      clinic.stripe_subscription_id,
      { cancel_at_period_end: true }
    );

    const { error: updateError } = await supabase
      .from("clinics")
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clinicId);
    if (updateError) {
      console.error("DB update failed after Stripe cancel — data out of sync:", updateError);
    }

    return NextResponse.json({ ok: true, status: subscription.status });
  } catch (error) {
    console.error("Stripe cancel failed:", error);
    return NextResponse.json({ error: "Nao foi possivel cancelar a assinatura." }, { status: 500 });
  }
}
