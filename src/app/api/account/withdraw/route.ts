import { NextRequest, NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maturePendingEarningsForUser } from "@/lib/earnings";

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

    // Before reading balances, move any matured earnings from pending -> available.
    await maturePendingEarningsForUser(user.id);

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

      // After a successful transfer, mark the corresponding task_earnings rows as withdrawn.
      try {
        const nowIso = new Date().toISOString();

        const { data: earnings, error: earningsError } = await admin
          .from("task_earnings")
          .select("id, amount_cents, task_id, submission_id, available_at")
          .eq("submitter_id", user.id)
          .eq("status", "available")
          .order("available_at", { ascending: true })
          .order("id", { ascending: true });

        if (earningsError) {
          console.error("Error loading available task_earnings for withdrawal tagging", earningsError);
        } else if (earnings && earnings.length > 0) {
          let remaining = amount;
          const fullyWithdrawIds: number[] = [];

          for (const row of earnings as any[]) {
            if (remaining <= 0) break;

            const rowAmountRaw = row.amount_cents;
            const rowAmount = Number.isFinite(rowAmountRaw)
              ? (rowAmountRaw as number)
              : Number(rowAmountRaw ?? 0);

            if (!Number.isFinite(rowAmount) || rowAmount <= 0) {
              continue;
            }

            if (rowAmount <= remaining) {
              // This earning is fully withdrawn.
              fullyWithdrawIds.push(row.id as number);
              remaining -= rowAmount;
            } else {
              // Partial withdrawal from this earning: split into a withdrawn portion and a
              // remaining available portion. We do this by inserting a new withdrawn row
              // and reducing the amount on the existing available row.
              const withdrawnPortion = remaining;
              const remainingPortion = rowAmount - withdrawnPortion;

              if (withdrawnPortion > 0) {
                const { error: insertWithdrawnError } = await admin
                  .from("task_earnings")
                  .insert({
                    submitter_id: user.id,
                    task_id: row.task_id,
                    submission_id: row.submission_id,
                    amount_cents: withdrawnPortion,
                    status: "withdrawn",
                    created_at: row.created_at ?? nowIso,
                    available_at: row.available_at,
                    withdrawn_at: nowIso,
                  } as any);

                if (insertWithdrawnError) {
                  console.error("Error inserting partial withdrawn task_earnings row", insertWithdrawnError);
                } else {
                  const { error: updatePartialError } = await admin
                    .from("task_earnings")
                    .update({ amount_cents: remainingPortion })
                    .eq("id", row.id);

                  if (updatePartialError) {
                    console.error("Error updating remaining amount on task_earnings row", updatePartialError);
                  }
                }

                remaining = 0;
              }

              break;
            }
          }

          if (fullyWithdrawIds.length > 0) {
            const { error: markWithdrawnError } = await admin
              .from("task_earnings")
              .update({ status: "withdrawn", withdrawn_at: nowIso })
              .in("id", fullyWithdrawIds);

            if (markWithdrawnError) {
              console.error("Error marking task_earnings rows as withdrawn", markWithdrawnError);
            }
          }
        }
      } catch (tagError) {
        console.error("Unexpected error updating task_earnings statuses after withdrawal", tagError);
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
