import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// When a funded task is deleted before completion, we issue a partial
// refund and keep a small cancellation fee as platform earnings.
const PLATFORM_CANCELLATION_FEE_RATE = 0.15; // 15%

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, short_description")
      .eq("id", numericId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching task", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch the task and verify ownership + status/payment details
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, status, price, stripe_payment_intent_id")
      .eq("id", numericId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to delete this task." },
        { status: 403 },
      );
    }

    const status = (task as any).status as string | null;

    if (status === "task_accepted") {
      return NextResponse.json(
        { error: "You cannot delete a task that already has an accepted submission." },
        { status: 400 },
      );
    }

    // Ensure nobody is actively working on the task. Any activation in a
    // working/accepted state blocks deletion.
    const activeActivationStatuses = [
      "waiting_submission",
      "pending",
      "resubmission",
      "resubmission_requested",
      "accepted",
    ];

    const { count: activationCount, error: activationError } = await supabase
      .from("task_activations")
      .select("id", { count: "exact", head: true })
      .eq("task_id", numericId)
      .in("status", activeActivationStatuses as any[]);

    if (activationError) {
      return NextResponse.json(
        { error: "Failed to verify task state. Please try again." },
        { status: 500 },
      );
    }

    const activeCount = activationCount ?? 0;
    if (activeCount > 0) {
      return NextResponse.json(
        { error: "This task cannot be deleted because it has active activations." },
        { status: 400 },
      );
    }

    // Branch 1: unfunded tasks still awaiting payment can be hard deleted
    if (status === "pending_payment") {
      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", numericId);

      if (deleteError) {
        return NextResponse.json(
          { error: "Failed to delete task. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Branch 2: funded, active tasks with no active activations → partial refund
    if (status === "active") {
      const priceRaw = (task as any).price as number | null;
      const priceDollars =
        typeof priceRaw === "number" && Number.isFinite(priceRaw)
          ? priceRaw
          : Number(priceRaw ?? 0);

      const grossCents = Math.max(0, Math.round(priceDollars * 100));

      if (!Number.isFinite(grossCents) || grossCents <= 0) {
        return NextResponse.json(
          { error: "This task does not appear to have a valid funded amount." },
          { status: 400 },
        );
      }

      const paymentIntentId = (task as any).stripe_payment_intent_id as
        | string
        | null
        | undefined;

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "This task cannot be deleted because its payment record is incomplete." },
          { status: 400 },
        );
      }

      const platformFeeCents = Math.max(
        0,
        Math.round(grossCents * PLATFORM_CANCELLATION_FEE_RATE),
      );
      const refundCents = Math.max(0, grossCents - platformFeeCents);

      try {
        if (refundCents > 0) {
          await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: refundCents,
          });
        } else {
          // If the computed refund is 0 (e.g. very small tasks), keep it simple
          // and do not attempt a Stripe refund.
          console.warn(
            `Computed zero refund for task ${numericId}; skipping Stripe refund call.`,
          );
        }
      } catch (stripeError) {
        console.error("Error issuing Stripe refund for deleted task", stripeError);
        return NextResponse.json(
          { error: "Failed to issue refund for this task. Please try again." },
          { status: 500 },
        );
      }

      // Record the platform's cancellation fee and mark the task as cancelled.
      try {
        const admin = createAdminClient();

        if (platformFeeCents > 0) {
          const { error: platformEarningsError } = await admin
            .from("platform_earnings")
            .insert({
              task_id: numericId,
              submitter_id: user.id,
              amount_cents: platformFeeCents,
            } as any);

          if (platformEarningsError) {
            console.error(
              "Error inserting platform_earnings row for cancelled task",
              platformEarningsError,
            );
          }
        }

        const { error: taskUpdateError } = await admin
          .from("tasks")
          .update({ status: "pending_payment" })
          .eq("id", numericId);

        if (taskUpdateError) {
          console.error(
            "Error updating task status to pending_payment after refund",
            taskUpdateError,
          );
          return NextResponse.json(
            { error: "Refund issued but failed to update task status." },
            { status: 500 },
          );
        }

        // actually delete the task
        const { error: deleteError } = await admin
          .from("tasks")
          .delete()
          .eq("id", numericId);

        if (deleteError) {
          console.error("Error deleting task after refund", deleteError);
          return NextResponse.json(
            { error: "Refund issued but failed to delete task." },
            { status: 500 },
          );
        }
      } catch (dbError) {
        console.error("Error recording deletion earnings or updating task", dbError);
        return NextResponse.json(
          { error: "Refund issued but failed to record deletion in database." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Any other status is not deletable with this flow.
    return NextResponse.json(
      { error: "This task cannot be deleted in its current state." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error deleting task", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
