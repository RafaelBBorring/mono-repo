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

  const { error } = await supabase
    .from("clinics")
    .update(updates)
    .eq("id", clinicId);

  if (error) throw error;
}

export async function rememberCheckoutSession(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdmin();
  const clinicId = session.metadata?.clinic_id;
  if (!clinicId) return;

  const customerId = typeof session.customer === "string" ? session.customer : null;

  const { error } = await supabase
    .from("clinics")
    .update({
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clinicId);

  if (error) throw error;
}
