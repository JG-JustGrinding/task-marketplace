import stripe from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
    createRateLimitResponse,
    rateLimitByIp,
    rateLimitByUser,
} from "@/lib/rateLimit";

type CreateCheckoutBody = {
    taskId: string | number;
    source?: "create" | "listing";
};

export async function POST(req: Request) {
    const body = (await req.json().catch(() => null)) as CreateCheckoutBody | null;

    if (!body) {
        return NextResponse.json(
            { error: "Invalid request body." },
            { status: 400 },
        );
    }

    const { taskId, source } = body;

    // Determine a valid absolute base URL for redirect callbacks
    const envBase = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl =
        envBase && /^https?:\/\//i.test(envBase)
            ? envBase.replace(/\/$/, "")
            : new URL(req.url).origin;

    const numericTaskId = Number(taskId);
    if (!Number.isFinite(numericTaskId) || numericTaskId <= 0) {
        return NextResponse.json(
            { error: "A valid task id is required for checkout." },
            { status: 400 },
        );
    }

    const supabase = await createClient();

    // Require authentication before creating any Stripe session.
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
        return NextResponse.json(
            { error: "Not authenticated." },
            { status: 401 },
        );
    }

    const ipRateLimitResult = await rateLimitByIp("taskCheckoutIp", req);
    if (!ipRateLimitResult.success) {
        return createRateLimitResponse(
            "Too many checkout attempts from this network. Please try again later.",
            ipRateLimitResult,
        );
    }

    const rateLimitResult = await rateLimitByUser("taskCheckout", user.id);
    if (!rateLimitResult.success) {
        return createRateLimitResponse(
            "Too many checkout attempts. Please try again later.",
            rateLimitResult,
        );
    }

    // Fetch the task and verify the caller is the task owner.
    // The amount charged is derived from the stored task price to avoid
    // trusting any client-supplied amount.
    const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select("id, user_id, price, status")
        .eq("id", numericTaskId)
        .single();

    if (taskError || !task) {
        return NextResponse.json(
            { error: "Task not found." },
            { status: 404 },
        );
    }

    if ((task as any).user_id !== user.id) {
        return NextResponse.json(
            { error: "You are not allowed to fund this task." },
            { status: 403 },
        );
    }

    const rawPrice = (task as any).price as number | string | null;
    const serverAmount =
        typeof rawPrice === "string" ? Number(rawPrice) : rawPrice;

    if (!serverAmount || !Number.isFinite(serverAmount) || serverAmount < 5) {
        return NextResponse.json(
            { error: "Task has an invalid price." },
            { status: 400 },
        );
    }

    // Mark the task as pending payment while the user is in checkout.
    // Scoped to the task owner to prevent any other user from changing status.
    try {
        await supabase
            .from("tasks")
            .update({ status: "pending_payment" })
            .eq("id", numericTaskId)
            .eq("user_id", user.id);
    } catch (err) {
        console.error("Failed to mark task as pending_payment before checkout", err);
    }

    const taskIdString = String(numericTaskId);
    const isCreateFlow = source === "create";
    const successUrl = `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=success`;
    const cancelUrl = `${baseUrl}/listing/${encodeURIComponent(taskIdString)}?payment=cancel`;

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
                    unit_amount: Math.round(serverAmount * 100),
                },
                quantity: 1,
            },
        ],
        metadata: {
            taskId: taskIdString,
            source: isCreateFlow ? "create" : "listing",
            userId: user.id,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
}
