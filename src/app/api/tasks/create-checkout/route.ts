import stripe from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateCheckoutBody = {
    amount: number;
    taskId: string | number;
    source?: "create" | "listing";
};

export async function POST(req: Request) {
    const { amount, taskId, source }: CreateCheckoutBody = await req.json();

    // Determine a valid absolute base URL for redirect callbacks
    // Prefer NEXT_PUBLIC_SITE_URL if it includes a scheme; otherwise use the request origin
    const envBase = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl =
        envBase && /^https?:\/\//i.test(envBase)
            ? envBase.replace(/\/$/, "")
            : new URL(req.url).origin;

    // Normalise ids and amounts
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
            { error: "A valid amount is required for checkout." },
            { status: 400 },
        );
    }

    const taskIdString = String(taskId);
    if (!taskIdString) {
        return NextResponse.json(
            { error: "A valid task id is required for checkout." },
            { status: 400 },
        );
    }

    // Mark the task as pending payment while the user is in checkout
    // so it is treated as unavailable until Stripe confirms.
    try {
        const supabase = await createClient();
        const numericTaskId = Number(taskIdString);
        if (Number.isFinite(numericTaskId)) {
            await supabase
                .from("tasks")
                .update({ status: "pending_payment" })
                .eq("id", numericTaskId);
        }
    } catch (err) {
        // If this fails we still allow checkout to proceed; webhook will be source of truth.
        console.error("Failed to mark task as pending_payment before checkout", err);
    }

    // Decide where Stripe should send the user back after checkout
    const isCreateFlow = source === "create";
    const successUrl = isCreateFlow
        ? `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=success`
        : `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=success`;

    const cancelUrl = isCreateFlow
        ? `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=cancel`
        : `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=cancel`;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: "Task Funding",
                    },
                    unit_amount: Math.round(numericAmount * 100),
                },
                quantity: 1,
            },
        ],
        metadata: {
            taskId: taskIdString,
            source: isCreateFlow ? "create" : "listing",
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
}