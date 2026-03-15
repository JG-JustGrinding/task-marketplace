import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import stripe from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// This route receives Stripe webhooks and updates task status after payment.

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

      // Subscription checkouts (Creator Pro / Earner Pro)
      if (session.mode === "subscription") {
        const userIdFromMetadata = session.metadata?.userId as string | undefined;
        const planType = session.metadata?.planType as string | undefined;

        const subscriptionRaw = session.subscription;
        const subscriptionId =
          typeof subscriptionRaw === "string"
            ? subscriptionRaw
            : subscriptionRaw && typeof subscriptionRaw === "object"
              ? (subscriptionRaw as Stripe.Subscription).id
              : null;

        if (userIdFromMetadata && planType && subscriptionId) {
          try {
            const supabase = createAdminClient();
            const updates: Record<string, any> = {};

            if (planType === "creator_pro") {
              updates.creator_pro_subscription_id = subscriptionId;
            } else if (planType === "earner_pro") {
              updates.earner_pro_subscription_id = subscriptionId;
            }

            if (Object.keys(updates).length > 0) {
              const { error } = await supabase
                .from("profiles")
                .update(updates)
                .eq("id", userIdFromMetadata);

              if (error) {
                console.error("Error updating profile after subscription checkout", error);
              }
            }
          } catch (innerErr) {
            console.error("Error handling subscription checkout completion", innerErr);
          }
        }
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const planType = subscription.metadata?.planType as string | undefined;

      let userId = subscription.metadata?.userId as string | undefined;

      const supabase = createAdminClient();

      let customerId: string | null = null;
      if (typeof subscription.customer === "string") {
        customerId = subscription.customer;
      } else if (subscription.customer && typeof subscription.customer === "object") {
        customerId = (subscription.customer as Stripe.Customer).id ?? null;
      }

      if (!userId && customerId) {
        const { data: profileLookup, error: profileLookupError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (profileLookupError) {
          console.error("Error looking up profile by stripe_customer_id", profileLookupError);
        }

        if (profileLookup && profileLookup.id) {
          userId = profileLookup.id as string;
        }
      }

      if (!userId || !planType) {
        console.error("Missing userId or planType on subscription event");
      } else {
        if (customerId) {
          const { error: customerUpdateError } = await supabase
            .from("profiles")
            .update({ stripe_customer_id: customerId })
            .eq("id", userId);

          if (customerUpdateError) {
            console.error("Error ensuring stripe_customer_id on profile", customerUpdateError);
          }
        }

        const isActive =
          (subscription.status === "active" || subscription.status === "trialing") &&
          !subscription.cancel_at_period_end;

        const rawCurrentPeriodEnd = (subscription as any).current_period_end as
          | number
          | null
          | undefined;

        const currentPeriodEnd = rawCurrentPeriodEnd
          ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
          : null;

        const updates: Record<string, any> = {};

        if (planType === "creator_pro") {
          updates.creator_pro_subscription_id = subscription.id;
          updates.creator_pro_active = isActive;
          updates.creator_pro_expires_at = currentPeriodEnd;
        } else if (planType === "earner_pro") {
          updates.earner_pro_subscription_id = subscription.id;
          updates.earner_pro_active = isActive;
          updates.earner_pro_expires_at = currentPeriodEnd;
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update(updates)
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating subscription fields on profile", updateError);
          }
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error handling Stripe webhook event", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
