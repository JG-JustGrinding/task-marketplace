import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// This route receives Stripe webhooks and:
// - Activates one-off task payments
// - Manages Creator/Earner Pro subscriptions on the profiles table

type ProPlan = "creator" | "earner";

const normalizePlanFromMetadata = (raw: string | null | undefined): ProPlan | null => {
  if (!raw) return null;
  const value = raw.toLowerCase();

  if (value === "creator" || value === "creator_pro") return "creator";
  if (value === "earner" || value === "earner_pro") return "earner";

  return null;
};

const syncProfileSubscription = async (
  subscription: Stripe.Subscription,
  explicitUserId?: string | null,
  explicitPlan?: ProPlan | null
) => {
  try {
    const supabase = createAdminClient();

    const metadata = subscription.metadata ?? {};

    // ---------------------------
    // Resolve user ID
    // ---------------------------

    let userId =
      explicitUserId ||
      (metadata.userId as string | undefined) ||
      (metadata.user_id as string | undefined) ||
      null;

    const customerRaw = subscription.customer;
    const stripeCustomerId =
      typeof customerRaw === "string"
        ? customerRaw
        : customerRaw && typeof customerRaw === "object"
        ? (customerRaw as Stripe.Customer).id
        : null;

    // Fallback lookup via stripe_customer_id
    if (!userId && stripeCustomerId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", stripeCustomerId)
        .maybeSingle();

      if (error) {
        console.error("Error looking up profile via stripe_customer_id", error);
      }

      if (data?.id) {
        userId = data.id;
      }
    }

    // ---------------------------
    // Resolve plan type
    // ---------------------------

    const plan: ProPlan | null =
      explicitPlan ||
      normalizePlanFromMetadata(
        (metadata.planType as string | undefined) ??
        (metadata.plan as string | undefined)
      );

    if (!userId || !plan) {
      console.error("Subscription webhook missing user or plan metadata", {
        subscriptionId: subscription.id,
        userId,
        plan,
      });
      return;
    }

    const columnPrefix = plan === "creator" ? "creator_pro" : "earner_pro";

    // ---------------------------
    // Subscription state
    // ---------------------------

    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;

    const isActive =
      (status === "active" || status === "trialing") && !cancelAtPeriodEnd;

    // ---------------------------
    // Expiration date
    // ---------------------------

    const subscriptionAny = subscription as any;

    const rawCurrentPeriodEnd =
      subscriptionAny?.items?.data?.[0]?.current_period_end ??
      subscriptionAny?.current_period_end ??
      subscriptionAny?.ended_at ??
      null;

    const expiresAtIso = rawCurrentPeriodEnd
      ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
      : null;

    // ---------------------------
    // Build update payload
    // ---------------------------

    const updatePayload: Record<string, any> = {
      [`${columnPrefix}_subscription_id`]: subscription.id,
      [`${columnPrefix}_active`]: isActive,
    };

    // Always update expires_at if Stripe provides it
    if (expiresAtIso) {
      updatePayload[`${columnPrefix}_expires_at`] = expiresAtIso;
    }

    if (stripeCustomerId) {
      updatePayload.stripe_customer_id = stripeCustomerId;
    }

    // ---------------------------
    // Update database
    // ---------------------------

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (error) {
      console.error("Error updating profile subscription from webhook", {
        userId,
        plan,
        subscriptionId: subscription.id,
        error,
      });
    } else {
      console.log("Updated profile subscription from webhook", {
        userId,
        plan,
        subscriptionId: subscription.id,
        active: isActive,
        expiresAtIso,
        cancelAtPeriodEnd,
        status,
      });
    }
  } catch (err) {
    console.error(
      "Unexpected error syncing profile subscription from webhook",
      err
    );
  }
};

// Main webhook handler
export async function POST(req: Request) {
  const body = await req.text();
  const headerList = await headers();
  const signature = headerList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Error verifying Stripe webhook", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Task payments (one-off payments for tasks)
      if (session.mode === "payment") {
        const taskIdRaw = session.metadata?.taskId;

        const paymentIntentRaw = session.payment_intent;
        let paymentIntentId: string | null = null;

        if (typeof paymentIntentRaw === "string") {
          paymentIntentId = paymentIntentRaw;
        } else if (paymentIntentRaw && typeof paymentIntentRaw === "object") {
          paymentIntentId = (paymentIntentRaw as Stripe.PaymentIntent).id ?? null;
        }

        if (taskIdRaw) {
          const supabase = createAdminClient();
          const taskIdNum = Number(taskIdRaw);

          if (Number.isFinite(taskIdNum)) {
            const updatePayload: Record<string, any> = { status: "active" };

            if (paymentIntentId) {
              updatePayload.stripe_payment_intent_id = paymentIntentId;
            }

            const { error } = await supabase
              .from("tasks")
              .update(updatePayload)
              .eq("id", taskIdNum);

            console.log(`Marked task ${taskIdNum} as active after successful payment.`);
            if (error) {
              console.error("Error setting task status to active after payment", error);
            }
          } else {
            console.error("Invalid task id on checkout.session.completed", taskIdRaw);
          }
        }
      }

      // Subscription checkout completion (Creator/Earner Pro)
      if (session.mode === "subscription") {
        try {
          const subscriptionRaw = session.subscription;
          let subscriptionId: string | null = null;

          if (typeof subscriptionRaw === "string") {
            subscriptionId = subscriptionRaw;
          } else if (subscriptionRaw && typeof subscriptionRaw === "object") {
            subscriptionId = (subscriptionRaw as Stripe.Subscription).id ?? null;
          }

          if (!subscriptionId) {
            console.error("Subscription checkout.session.completed missing subscription id", {
              sessionId: session.id,
            });
          } else {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);

            const sessionMetadata = session.metadata ?? {};
            const explicitUserId =
              (sessionMetadata.userId as string | undefined) ||
              (sessionMetadata.user_id as string | undefined) ||
              null;
            const explicitPlan = normalizePlanFromMetadata(
              (sessionMetadata.planType as string | undefined) ??
                (sessionMetadata.plan as string | undefined),
            );

            await syncProfileSubscription(subscription, explicitUserId, explicitPlan);
          }
        } catch (err) {
          console.error("Error handling subscription checkout completion", err);
        }
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const partial = event.data.object as Stripe.Subscription;
      const subscription = await stripe.subscriptions.retrieve(partial.id);
      await syncProfileSubscription(subscription);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error handling Stripe webhook event", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}