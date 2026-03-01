import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Returns a Stripe Express dashboard login link for the current user's connected account.
export async function POST(req: NextRequest) {
  try {
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
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error loading profile for Stripe login link", profileError);
      return NextResponse.json(
        { error: "Unable to load your Stripe account information." },
        { status: 500 },
      );
    }

    const stripeAccountId = (profile as any).stripe_account_id as string | null;

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "You don't have a connected Stripe account yet." },
        { status: 400 },
      );
    }

    try {
      // Create a Stripe Express dashboard login link. We don't pass a redirect_url
      // to keep compatibility with all supported Stripe API versions.
      const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

      return NextResponse.json({ url: loginLink.url });
    } catch (stripeError) {
      console.error("Error creating Stripe login link", stripeError);
      return NextResponse.json(
        { error: "Stripe was unable to create a login link. Please try again." },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Unexpected error creating Stripe login link", error);
    return NextResponse.json(
      { error: "Unexpected error creating Stripe login link." },
      { status: 500 },
    );
  }
}
