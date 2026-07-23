import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { redeemCheckoutCoupon, rememberCheckoutSession, upsertBillingFromSubscription } from "@/lib/stripeBilling";
import { createSupabaseAdmin } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function syncSubscription(subscriptionId?: string | null) {
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  await upsertBillingFromSubscription(subscription);
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const rawSubscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
    .subscription;

  if (!rawSubscription) return null;
  return typeof rawSubscription === "string" ? rawSubscription : rawSubscription.id;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe não configurado." }, { status: 400 });
  }

  const payload = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature failed:", error);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdmin();
    const { error: eventError } = await supabase
      .from("stripe_webhook_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (eventError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (eventError) throw eventError;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await rememberCheckoutSession(session);
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id ?? null;
        await syncSubscription(subId);
        await redeemCheckoutCoupon(session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertBillingFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        await syncSubscription(subscriptionIdFromInvoice(event.data.object as Stripe.Invoice));
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    try {
      await createSupabaseAdmin().from("stripe_webhook_events").delete().eq("event_id", event.id);
    } catch {}
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json({ error: "Falha ao processar webhook." }, { status: 500 });
  }
}
