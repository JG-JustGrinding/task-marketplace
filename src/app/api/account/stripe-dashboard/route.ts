import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const getBaseUrl = (req: Request) => {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;

  if (envBase && /^https?:\/\//i.test(envBase)) {
    return envBase.replace(/\/$/, "");
  }

  const url = new URL(req.url);
  return url.origin;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const subscriptionId = typeof body?.subscriptionId === "string" ? body.subscriptionId : null;

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error loading profile for stripe dashboard", profileError);
      return NextResponse.json(
        { error: "Unable to load your billing information." },
        { status: 500 },
      );
    }

    const stripeCustomerId = (profile as any)?.stripe_customer_id as string | null | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please set up a subscription first." },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl(req);

    const sessionParams: Parameters<typeof stripe.billingPortal.sessions.create>[0] = {
      customer: stripeCustomerId,
      return_url: `${baseUrl}/account?tab=Subscription`,
    };

    // Scope the portal to the specific subscription so the user lands on
    // the correct plan's management page instead of the portal home.
    if (subscriptionId) {
      sessionParams.flow_data = {
        type: "subscription_update",
        subscription_update: {
          subscription: subscriptionId,
        },
      };
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error creating Stripe billing portal session", error);
    return NextResponse.json(
      { error: "Unexpected error opening subscription management. Please try again." },
      { status: 500 },
    );
  }
}
