import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createRateLimitResponse,
  rateLimitByIp,
  rateLimitByUser,
} from "@/lib/rateLimit";

type PlanType = "creator" | "earner";

type CreateSubscriptionCheckoutBody = {
  plan: PlanType;
};

const getBaseUrl = (req: Request) => {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;

  if (envBase && /^https?:\/\//i.test(envBase)) {
    return envBase.replace(/\/$/, "");
  }

  const url = new URL(req.url);
  return url.origin;
};

const getPriceIdForPlan = (plan: PlanType): string | null => {
  if (plan === "creator") {
    return process.env.STRIPE_CREATOR_PRO_PRICE_ID ?? null;
  }

  if (plan === "earner") {
    return process.env.STRIPE_EARNER_PRO_PRICE_ID ?? null;
  }

  return null;
};

export async function POST(req: Request) {
  try {
    const { plan }: CreateSubscriptionCheckoutBody = await req.json();

    if (plan !== "creator" && plan !== "earner") {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const priceId = getPriceIdForPlan(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: "Subscription pricing is not configured." },
        { status: 500 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const ipRateLimitResult = await rateLimitByIp(
      "subscriptionCheckoutIp",
      req,
    );
    if (!ipRateLimitResult.success) {
      return createRateLimitResponse(
        "Too many subscription checkout attempts from this network. Please try again later.",
        ipRateLimitResult,
      );
    }

    const rateLimitResult = await rateLimitByUser(
      "subscriptionCheckout",
      user.id,
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        "Too many subscription checkout attempts. Please try again later.",
        rateLimitResult,
      );
    }

    const baseUrl = getBaseUrl(req);
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error loading profile for subscription checkout", profileError);
      return NextResponse.json(
        { error: "Unable to load your profile for subscription checkout." },
        { status: 500 },
      );
    }

    let stripeCustomerId = (profile as any)?.stripe_customer_id as string | null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error saving Stripe customer id to profile", updateError);
        return NextResponse.json(
          { error: "Failed to save billing information. Please try again." },
          { status: 500 },
        );
      }
    }

    const planType = plan === "creator" ? "creator_pro" : "earner_pro";

    const successUrl = `${baseUrl}/account?tab=Subscription&billing=success`;
    const cancelUrl = `${baseUrl}/account?tab=Subscription&billing=cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: user.id,
        planType,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planType,
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating subscription checkout session", error);
    return NextResponse.json(
      { error: "Unexpected error creating subscription checkout session." },
      { status: 500 },
    );
  }
}
