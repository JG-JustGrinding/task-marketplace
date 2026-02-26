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
      .select("stripe_account_id, available_balance_cents")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error loading profile for withdrawal", profileError);
      return NextResponse.json(
        { error: "Unable to load your profile for withdrawal." },
        { status: 500 },
      );
    }

    const stripeAccountId = (profile as any).stripe_account_id as string | null;
    const availableCentsRaw = (profile as any).available_balance_cents;
    const availableCents = Number.isFinite(availableCentsRaw)
      ? (availableCentsRaw as number)
      : Number(availableCentsRaw ?? 0);

    if (!stripeAccountId) {
      return NextResponse.json(
        { error: "You need to connect a Stripe account before withdrawing funds." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(availableCents) || availableCents <= 0) {
      return NextResponse.json(
        { error: "You have no available balance to withdraw." },
        { status: 400 },
      );
    }

    // Optional: allow partial withdrawals via JSON body { amount_cents }
    let requestedAmount: number | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.amount_cents === "number") {
        requestedAmount = Math.floor(body.amount_cents);
      }
    } catch {
      // no body or invalid JSON is fine; we'll default to full balance
    }

    const amount = requestedAmount && requestedAmount > 0 && requestedAmount <= availableCents
      ? requestedAmount
      : availableCents;

    try {
      const transfer = await stripe.transfers.create({
        amount,
        currency: "usd",
        destination: stripeAccountId,
        metadata: {
          user_id: user.id,
        },
      });

      const newBalance = availableCents - amount;

      const { error: updateError } = await admin
        .from("profiles")
        .update({ available_balance_cents: newBalance })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating available_balance_cents after withdrawal", updateError);
        // We still return success because the transfer has already been created.
      }

      return NextResponse.json({
        success: true,
        transferId: transfer.id,
        new_balance_cents: newBalance,
      });
    } catch (stripeError) {
      console.error("Stripe error when creating transfer", stripeError);
      return NextResponse.json(
        {
          error:
            "Stripe was unable to start your payout. Please make sure your payout details are complete and try again.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("Error handling withdrawal request", error);
    return NextResponse.json(
      { error: "Unexpected error starting withdrawal." },
      { status: 500 },
    );
  }
}
