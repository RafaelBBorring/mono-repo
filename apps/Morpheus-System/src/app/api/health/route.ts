import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseServer";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkSupabase() {
  const supabase = createSupabaseAdmin();
  return Promise.all([
    supabase.from("clinics").select("id,plan_id,trial_used", { head: true, count: "exact" }),
    supabase.from("stripe_webhook_events").select("event_id", { head: true, count: "exact" }),
  ]);
}

export async function GET() {
  const checks = {
    app: "ok",
    database: "error",
    schema: "error",
    stripe: "error",
  };

  try {
    let [clinicResult, eventResult] = await checkSupabase();
    if (clinicResult.error || eventResult.error) {
      [clinicResult, eventResult] = await checkSupabase();
    }

    if (!clinicResult.error) checks.database = "ok";
    if (!clinicResult.error && !eventResult.error) checks.schema = "ok";
  } catch {}

  try {
    const priceId = process.env.STRIPE_PRICE_ESSENTIAL_MONTHLY;
    if (priceId) {
      const price = await getStripe().prices.retrieve(priceId);
      if (price.active) checks.stripe = "ok";
    }
  } catch {}

  const ready = checks.database === "ok" && checks.schema === "ok" && checks.stripe === "ok";
  return NextResponse.json(
    { ready, checks, checkedAt: new Date().toISOString() },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
