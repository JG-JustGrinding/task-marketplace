import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type AcceptSubmissionBody = {
  taskId?: number;
  submissionId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AcceptSubmissionBody;

    const taskId = body.taskId;
    const submissionId = body.submissionId;

    if (!taskId || !Number.isFinite(taskId) || !submissionId || !Number.isFinite(submissionId)) {
      return NextResponse.json(
        { error: "A valid taskId and submissionId are required." },
        { status: 400 },
      );
    }

    // Use the normal server client for auth and permission checks
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Ensure the current user is the owner of this task and fetch payout details.
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, status, price")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to review submissions for this task." },
        { status: 403 },
      );
    }

    // Look up the accepted submission to find the submitting user.
    const { data: submission, error: submissionError } = await supabase
      .from("task_submissions")
      .select("id, task_id, user_id")
      .eq("id", submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    if (submission.task_id !== taskId) {
      return NextResponse.json(
        { error: "Submission does not belong to this task." },
        { status: 400 },
      );
    }

    if (task.status !== "active") {
      return NextResponse.json(
        { error: "Cannot accept submission for a task that is not active." },
        { status: 400 },
      );
    }

    const submitterId = submission.user_id as string;

    // Determine how much the submitter should earn for this task and how much the
    // platform keeps as a fee. We use the task's price and convert to cents for
    // precise accounting.
    const taskPrice = (task as any).price as number | null;
    const grossCents = taskPrice && Number.isFinite(taskPrice)
      ? Math.round(taskPrice * 100)
      : 0;

    // Platform take rate (e.g. 10% of the task price).
    const PLATFORM_TAKE_RATE = 0.1;

    const workerCents = Math.round(grossCents * (1 - PLATFORM_TAKE_RATE));
    const platformCents = Math.max(0, grossCents - workerCents);

    // Mark the accepted submission row as accepted.
    const { error: acceptedUpdateError } = await supabase
      .from("task_submissions")
      .update({ status: "accepted" })
      .eq("id", submissionId);

    if (acceptedUpdateError) {
      console.error("Error updating accepted task_submissions row", acceptedUpdateError);
      return NextResponse.json(
        { error: "Failed to update accepted submission" },
        { status: 500 },
      );
    }

    // Mark all *other* submissions for this task as rejected.
    const { error: otherSubsError } = await supabase
      .from("task_submissions")
      .update({ status: "rejected" })
      .eq("task_id", taskId)
      .neq("id", submissionId);

    if (otherSubsError) {
      console.error("Error rejecting other submissions for task", otherSubsError);
      return NextResponse.json(
        { error: "Failed to reject other submissions" },
        { status: 500 },
      );
    }

    // Mark the corresponding activation for the accepted submitter as accepted.
    const { error: activationAcceptError } = await supabase
      .from("task_activations")
      .update({ status: "accepted" })
      .eq("user_id", submitterId)
      .eq("task_id", taskId);

    if (activationAcceptError) {
      console.error("Error updating accepted task_activations row", activationAcceptError);
      return NextResponse.json(
        { error: "Failed to update accepted activation" },
        { status: 500 },
      );
    }

    // Mark all *other* activations for this task as rejected so those users
    // can no longer work on it.
    const { error: otherActivationsError } = await supabase
      .from("task_activations")
      .update({ status: "rejected" })
      .eq("task_id", taskId)
      .neq("user_id", submitterId);

    if (otherActivationsError) {
      console.error("Error rejecting other task_activations rows", otherActivationsError);
      return NextResponse.json(
        { error: "Failed to update other activations" },
        { status: 500 },
      );
    }

    // Finally, mark the task itself as having an accepted submission.
    const { error: taskStatusError } = await supabase
      .from("tasks")
      .update({ status: "task_accepted" })
      .eq("id", taskId);

    if (taskStatusError) {
      console.error("Error updating task status to task_accepted", taskStatusError);
      return NextResponse.json(
        { error: "Failed to update task status" },
        { status: 500 },
      );
    }

    // Credit the submitter's internal balance using the pending -> available system
    // for the worker's share, and record the platform's share separately.
    // Assumptions:
    // - numeric column `pending_balance_cents` on `profiles`.
    // - `task_earnings` table to track when earnings become available.
    // - optional `platform_earnings` table for analytics of platform revenue.
    if (workerCents > 0 || platformCents > 0) {
      const admin = createAdminClient();

      if (workerCents > 0) {
        // 1) Create a pending earnings record for the worker that will mature after 3 days.
        const availableAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

        const { error: earningsError } = await admin.from("task_earnings").insert({
          submitter_id: submitterId,
          task_id: taskId,
          submission_id: submissionId,
          amount_cents: workerCents,
          status: "pending",
          available_at: availableAt,
        } as any);

        if (earningsError) {
          console.error("Error inserting pending task_earnings row", earningsError);
        }

        // 2) Increment the submitter's pending_balance_cents.
        const { data: profile, error: profileError } = await admin
          .from("profiles")
          .select("pending_balance_cents")
          .eq("id", submitterId)
          .single();

        if (profileError) {
          console.error("Error fetching submitter profile for pending balance update", profileError);
        } else {
          const currentPending =
            (profile as any)?.pending_balance_cents &&
            Number.isFinite((profile as any).pending_balance_cents)
              ? (profile as any).pending_balance_cents
              : 0;

          const newPending = currentPending + workerCents;

          const { error: pendingError } = await admin
            .from("profiles")
            .update({ pending_balance_cents: newPending })
            .eq("id", submitterId);

          if (pendingError) {
            console.error("Error updating submitter pending_balance_cents", pendingError);
          }
        }
      }

      // 3) Optionally record the platform's share for analytics/reporting.
      if (platformCents > 0) {
        const { error: platformEarningsError } = await admin
          .from("platform_earnings")
          .insert({
            task_id: taskId,
            submitter_id: submitterId,
            amount_cents: platformCents,
          } as any);

        if (platformEarningsError) {
          console.error("Error inserting platform_earnings row", platformEarningsError);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error accepting submission", error);
    return NextResponse.json(
      { error: "Failed to accept submission" },
      { status: 500 },
    );
  }
}
