import "server-only";

import type Stripe from "stripe";
import { createSupabaseAdmin } from "@/lib/supabaseServer";

function toIsoDate(timestamp?: number | null) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

function customerIdFrom(subscription: Stripe.Subscription) {
  const customer = subscription.customer;
  return typeof customer === "string" ? customer : customer.id;
}

export async function upsertBillingFromSubscription(subscription: Stripe.Subscription) {
  const supabase = createSupabaseAdmin();
  const clinicId = subscription.metadata.clinic_id;
  if (!clinicId) {
    console.warn("Webhook: subscription sem clinic_id nos metadados, ignorando.");
    return;
  }

  const firstItem = subscription.items.data[0];
  const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number | null })
    .current_period_end;

  const isTrial = subscription.status === "trialing";

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerIdFrom(subscription),
    stripe_subscription_id: subscription.id,
    stripe_price_id: firstItem?.price.id ?? null,
    stripe_status: subscription.status,
    current_period_end: toIsoDate(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (isTrial) {
    updates.trial_used = true;
  }

  const { error, count } = await supabase
    .from("clinics")
    .update(updates)
    .eq("id", clinicId);

  if (error) throw error;
  if (count === 0) {
    console.warn("Webhook: clinic not found for id:", clinicId);
  }
}

export async function rememberCheckoutSession(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdmin();
  const clinicId = session.metadata?.clinic_id;
  if (!clinicId) return;

  const customer = session.customer;
  const customerId = typeof customer === "string"
    ? customer
    : (customer as Stripe.Customer | null)?.id ?? null;

  const { error, count } = await supabase
    .from("clinics")
    .update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clinicId);

  if (error) throw error;
  if (count === 0) {
    console.warn("rememberCheckoutSession: clinic not found for id:", clinicId);
  }
}

export async function redeemCheckoutCoupon(session: Stripe.Checkout.Session) {
  const couponCode = session.metadata?.coupon_code;
  if (!couponCode) return;

  try {
    const supabase = createSupabaseAdmin();
    const { data: coupon } = await supabase
      .from("coupons")
      .select("id, current_uses")
      .eq("code", couponCode.toUpperCase())
      .maybeSingle();

    if (coupon) {
      const next = (coupon.current_uses ?? 0) + 1;
      await supabase.from("coupons").update({ current_uses: next }).eq("id", coupon.id);
    }
  } catch (err) {
    console.error("Coupon redemption in webhook failed (non-fatal):", err);
  }
}
