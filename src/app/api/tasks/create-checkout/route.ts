import stripe from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const { amount, taskId } = await req.json();

    // Determine a valid absolute base URL for redirect callbacks
    // Prefer NEXT_PUBLIC_SITE_URL if it includes a scheme; otherwise use the request origin
    const envBase = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl =
        envBase && /^https?:\/\//i.test(envBase)
            ? envBase.replace(/\/$/, "")
            : new URL(req.url).origin;

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
                    unit_amount: amount * 100,
                },
                quantity: 1,
            },
        ],
        metadata: {
            taskId,
        },
        success_url: `${baseUrl}/success`,
        cancel_url: `${baseUrl}/cancel`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
}