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
      const taskIdRaw = session.metadata?.taskId;

      if (taskIdRaw) {
        const supabase = createAdminClient();
        const taskIdNum = Number(taskIdRaw);

        if (Number.isFinite(taskIdNum)) {
          const { error } = await supabase
            .from("tasks")
            .update({ status: "active" })
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

    // You can also handle other event types here if needed.

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Error handling Stripe webhook event", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }
}
