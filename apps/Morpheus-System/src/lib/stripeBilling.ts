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

function planFromPrice(priceId?: string | null) {
  if (!priceId) return null;
  const plans = ["ESSENTIAL", "PRO", "ELITE"] as const;
  for (const plan of plans) {
    if (priceId === process.env[`STRIPE_PRICE_${plan}_MONTHLY`] || priceId === process.env[`STRIPE_PRICE_${plan}_YEARLY`]) {
      return plan.toLowerCase();
    }
  }
  return null;
}

export async function upsertBillingFromSubscription(subscription: Stripe.Subscription) {
  const supabase = createSupabaseAdmin();
  const clinicId = subscription.metadata.clinic_id;
  if (!clinicId) {
    console.warn("Webhook: subscription sem clinic_id nos metadados, ignorando.");
    return;
  }

  const firstItem = subscription.items.data[0];
  const periodEnd = firstItem?.current_period_end
    ?? (subscription as Stripe.Subscription & { current_period_end?: number | null }).current_period_end;

  const isTrial = subscription.status === "trialing";

  const updates: Record<string, unknown> = {
    stripe_customer_id: customerIdFrom(subscription),
    stripe_subscription_id: subscription.id,
    stripe_price_id: firstItem?.price.id ?? null,
    stripe_status: subscription.status,
    current_period_end: toIsoDate(periodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_checkout_session_id: null,
    trial_checkout_expires_at: null,
    updated_at: new Date().toISOString(),
  };

  const plan = planFromPrice(firstItem?.price.id) || subscription.metadata.plan;
  if (plan === "essential" || plan === "pro" || plan === "elite") {
    updates.plan_id = plan;
  }

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
    const { data: redeemed, error } = await supabase.rpc("redeem_morpheus_coupon", {
      coupon_code: couponCode,
    });
    if (error) throw error;
    if (!redeemed) {
      console.warn("Coupon redemption skipped because the coupon is no longer valid:", couponCode);
    }
  } catch (err) {
    console.error("Coupon redemption in webhook failed (non-fatal):", err);
  }
}
