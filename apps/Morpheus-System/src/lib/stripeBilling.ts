import "server-only";

import type Stripe from "stripe";
import { DEFAULT_BILLING_ACCOUNT_ID } from "@/lib/billing";
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
  const accountId = subscription.metadata.billing_account_id || DEFAULT_BILLING_ACCOUNT_ID;
  const firstItem = subscription.items.data[0];
  const periodEnd = (subscription as Stripe.Subscription & { current_period_end?: number | null })
    .current_period_end;

  const { error } = await supabase.from("billing_accounts").upsert(
    {
      id: accountId,
      stripe_customer_id: customerIdFrom(subscription),
      stripe_subscription_id: subscription.id,
      stripe_price_id: firstItem?.price.id ?? null,
      stripe_status: subscription.status,
      current_period_end: toIsoDate(periodEnd),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function rememberCheckoutSession(session: Stripe.Checkout.Session) {
  const supabase = createSupabaseAdmin();
  const accountId = session.metadata?.billing_account_id || DEFAULT_BILLING_ACCOUNT_ID;
  const customerId = typeof session.customer === "string" ? session.customer : null;

  const { error } = await supabase.from("billing_accounts").upsert(
    {
      id: accountId,
      stripe_customer_id: customerId,
      last_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}
