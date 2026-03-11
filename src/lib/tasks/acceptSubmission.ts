import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shared helper to accept a task submission, update related rows, and
 * create earnings records. This mirrors the logic in the manual
 * accept-submission API route so it can also be used from cron-style
 * auto-accept flows.
 *
 * This function assumes that any necessary authorization checks
 * (e.g. that the caller is the task owner) have already been done
 * by the caller.
 */
export async function acceptTaskSubmissionWithPayout(
  client: any,
  params: { taskId: number; submissionId: number },
) {
  const { taskId, submissionId } = params;

  const admin = createAdminClient();

  // Look up the accepted submission to find the submitting user.
  const { data: submission, error: submissionError } = await client
    .from("task_submissions")
    .select("id, task_id, user_id")
    .eq("id", submissionId)
    .single();

  if (submissionError || !submission) {
    return { ok: false, error: "Submission not found" as const };
  }

  if ((submission as any).task_id !== taskId) {
    return { ok: false, error: "Submission does not belong to this task" as const };
  }

  const submitterId = (submission as any).user_id as string;

  // Fetch the task to ensure it is still active and to get payout details.
  const { data: task, error: taskError } = await client
    .from("tasks")
    .select("id, user_id, status, price")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { ok: false, error: "Task not found" as const };
  }

  if ((task as any).status !== "active") {
    return { ok: false, error: "Task is not active" as const };
  }

  const taskPrice = (task as any).price as number | null;
  const grossCents = taskPrice && Number.isFinite(taskPrice)
    ? Math.round(taskPrice * 100)
    : 0;

  const PLATFORM_TAKE_RATE = 0.1;

  const workerCents = Math.round(grossCents * (1 - PLATFORM_TAKE_RATE));
  const platformCents = Math.max(0, grossCents - workerCents);

  // Mark the accepted submission row as accepted.
  const { error: acceptedUpdateError } = await client
    .from("task_submissions")
    .update({ status: "accepted" })
    .eq("id", submissionId);

  if (acceptedUpdateError) {
    console.error("Error updating accepted task_submissions row", acceptedUpdateError);
    return { ok: false, error: "Failed to update accepted submission" as const };
  }

  // Mark all *other* submissions for this task as rejected.
  const { error: otherSubsError } = await client
    .from("task_submissions")
    .update({ status: "rejected" })
    .eq("task_id", taskId)
    .neq("id", submissionId);

  if (otherSubsError) {
    console.error("Error rejecting other submissions for task", otherSubsError);
    return { ok: false, error: "Failed to reject other submissions" as const };
  }

  // Mark the corresponding activation for the accepted submitter as accepted.
  const { error: activationAcceptError } = await client
    .from("task_activations")
    .update({ status: "accepted" })
    .eq("user_id", submitterId)
    .eq("task_id", taskId);

  if (activationAcceptError) {
    console.error("Error updating accepted task_activations row", activationAcceptError);
    return { ok: false, error: "Failed to update accepted activation" as const };
  }

  // Mark all *other* activations for this task as rejected so those users
  // can no longer work on it.
  const { error: otherActivationsError } = await client
    .from("task_activations")
    .update({ status: "rejected" })
    .eq("task_id", taskId)
    .neq("user_id", submitterId);

  if (otherActivationsError) {
    console.error("Error rejecting other task_activations rows", otherActivationsError);
    return { ok: false, error: "Failed to update other activations" as const };
  }

  // Finally, mark the task itself as having an accepted submission.
  const { error: taskStatusError } = await client
    .from("tasks")
    .update({ status: "task_accepted" })
    .eq("id", taskId);

  if (taskStatusError) {
    console.error("Error updating task status to task_accepted", taskStatusError);
    return { ok: false, error: "Failed to update task status" as const };
  }

  // Credit the submitter's internal balance using the pending -> available system
  // for the worker's share, and record the platform's share separately.
  if (workerCents > 0 || platformCents > 0) {
    if (workerCents > 0) {
      // Create a pending earnings record for the worker that will mature after 3 days.
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

  return { ok: true as const };
}
