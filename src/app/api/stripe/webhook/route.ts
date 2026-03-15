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
      event.type === "customer.subscription.created" ||
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
          subscription.status === "active" || subscription.status === "trialing";

        const rawCurrentPeriodEnd =
          subscription.items?.data?.[0]?.current_period_end ??
          (subscription as any).current_period_end ??
          subscription.ended_at ??
          null;

        const currentPeriodEnd = rawCurrentPeriodEnd
          ? new Date(rawCurrentPeriodEnd * 1000).toISOString()
          : null;

        console.log(currentPeriodEnd, rawCurrentPeriodEnd);

        const updates: Record<string, any> = {};

        if (planType === "creator_pro") {
          updates.creator_pro_subscription_id = subscription.id;
          updates.creator_pro_active = isActive;
          if (rawCurrentPeriodEnd != null && currentPeriodEnd != null)
          {
            updates.creator_pro_expires_at = currentPeriodEnd;
          }
        } else if (planType === "earner_pro") {
          updates.earner_pro_subscription_id = subscription.id;
          updates.earner_pro_active = isActive;
          if (rawCurrentPeriodEnd != null && currentPeriodEnd != null)
          {
            updates.earner_pro_expires_at = currentPeriodEnd;
          }
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

    // Use invoice.payment_succeeded to consistently set the current period end (expires_at)
    // and ensure the subscription is marked active once the first (or next) payment succeeds.
    /*
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      const subscriptionRawFromInvoice = (invoice as any).subscription as
        | string
        | Stripe.Subscription
        | null
        | undefined;

      if (!subscriptionRawFromInvoice) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      let customerId: string | null = null;
      if (typeof invoice.customer === "string") {
        customerId = invoice.customer;
      } else if (invoice.customer && typeof invoice.customer === "object") {
        customerId = (invoice.customer as Stripe.Customer).id ?? null;
      }

      if (!customerId) {
        console.error("invoice.payment_succeeded missing customer id");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabase = createAdminClient();

      const { data: profileLookup, error: profileLookupError } = await supabase
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (profileLookupError) {
        console.error(
          "Error looking up profile by stripe_customer_id (invoice.payment_succeeded)",
          profileLookupError,
        );
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (!profileLookup || !profileLookup.id) {
        console.error("No profile found for customer on invoice.payment_succeeded");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const userIdForInvoice = profileLookup.id as string;

      const creatorPriceId = process.env.STRIPE_CREATOR_PRO_PRICE_ID ?? null;
      const earnerPriceId = process.env.STRIPE_EARNER_PRO_PRICE_ID ?? null;

      const lines = invoice.lines?.data ?? [];

      let planTypeFromInvoice: "creator_pro" | "earner_pro" | null = null;
      let periodEndUnix: number | null = null;

      for (const line of lines) {
        const lineAny = line as any;
        const price = lineAny.price as Stripe.Price | null | undefined;
        const priceId = price?.id ?? null;
        const candidateEnd = lineAny.period?.end ?? null;

        if (!priceId || !candidateEnd) {
          continue;
        }

        if (creatorPriceId && priceId === creatorPriceId) {
          planTypeFromInvoice = "creator_pro";
          periodEndUnix = candidateEnd;
          break;
        }

        if (earnerPriceId && priceId === earnerPriceId) {
          planTypeFromInvoice = "earner_pro";
          periodEndUnix = candidateEnd;
          break;
        }
      }

      if (!planTypeFromInvoice || !periodEndUnix) {
        // Not one of our subscription plans; ignore.
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const currentPeriodEnd = new Date(periodEndUnix * 1000).toISOString();

      const subscriptionRaw = subscriptionRawFromInvoice;
      const subscriptionId =
        typeof subscriptionRaw === "string"
          ? subscriptionRaw
          : subscriptionRaw && typeof subscriptionRaw === "object"
            ? (subscriptionRaw as Stripe.Subscription).id
            : null;

      const updatesFromInvoice: Record<string, any> = {};

      if (planTypeFromInvoice === "creator_pro") {
        if (subscriptionId) {
          updatesFromInvoice.creator_pro_subscription_id = subscriptionId;
        }
        updatesFromInvoice.creator_pro_active = true;
        updatesFromInvoice.creator_pro_expires_at = currentPeriodEnd;
      } else if (planTypeFromInvoice === "earner_pro") {
        if (subscriptionId) {
          updatesFromInvoice.earner_pro_subscription_id = subscriptionId;
        }
        updatesFromInvoice.earner_pro_active = true;
        updatesFromInvoice.earner_pro_expires_at = currentPeriodEnd;
      }

      if (Object.keys(updatesFromInvoice).length > 0) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(updatesFromInvoice)
          .eq("id", userIdForInvoice);

        if (updateError) {
          console.error(
            "Error updating subscription fields from invoice.payment_succeeded",
            updateError,
          );
        }
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }
      */

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error handling Stripe webhook event", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}