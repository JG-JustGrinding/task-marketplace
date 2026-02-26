import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (profileError) {
      console.error("Error loading profile for Stripe onboarding", profileError);
      return NextResponse.json(
        { error: "Unable to load your profile for Stripe onboarding." },
        { status: 500 },
      );
    }

    let accountId = (profile as any)?.stripe_account_id as string | null;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      accountId = account.id;

      const { error: updateError } = await admin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error saving Stripe account id to profile", updateError);
        return NextResponse.json(
          { error: "Failed to save your Stripe account. Please try again." },
          { status: 500 },
        );
      }
    }

    const origin = new URL(req.url).origin;

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/hub?onboarding=refresh`,
      return_url: `${origin}/hub?onboarding=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating Stripe account link", error);
    return NextResponse.json(
      { error: "Unexpected error starting Stripe onboarding." },
      { status: 500 },
    );
  }
}
