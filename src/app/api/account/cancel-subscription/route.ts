import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type CancelPlanType = "creator" | "earner";

interface CancelSubscriptionBody {
  plan: CancelPlanType;
}

export async function POST(req: Request) {
  try {
    const { plan }: CancelSubscriptionBody = await req.json();

    if (plan !== "creator" && plan !== "earner") {
      return NextResponse.json({ error: "Invalid plan specified." }, { status: 400 });
    }

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
      .select("creator_pro_subscription_id, earner_pro_subscription_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error loading profile for cancel subscription", profileError);
      return NextResponse.json(
        { error: "Unable to load your profile for subscription management." },
        { status: 500 },
      );
    }

    const creatorSubId = (profile as any)?.creator_pro_subscription_id as string | null | undefined;
    const earnerSubId = (profile as any)?.earner_pro_subscription_id as string | null | undefined;

    const subscriptionId = plan === "creator" ? creatorSubId : earnerSubId;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found to cancel for this plan." },
        { status: 400 },
      );
    }

    // Mark subscription to cancel at period end to avoid immediate loss of access.
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling subscription", error);
    return NextResponse.json(
      { error: "Unexpected error cancelling subscription. Please try again." },
      { status: 500 },
    );
  }
}
