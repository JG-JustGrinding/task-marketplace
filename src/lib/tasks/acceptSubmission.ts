import { queueNotification } from "@/lib/notifications";

type AcceptTaskSubmissionRpcResult = {
  ok?: boolean;
  error?: string;
};

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

  // Preload other submitter and activation users so we can notify
  // everyone who is affected when a single submission is accepted.
  const otherSubmitterIds = new Set<string>();
  const otherActivationUserIds = new Set<string>();

  try {
    const { data: otherSubs } = await client
      .from("task_submissions")
      .select("user_id, id")
      .eq("task_id", taskId)
      .neq("id", submissionId);

    for (const row of (otherSubs ?? []) as any[]) {
      if (row.user_id && typeof row.user_id === "string") {
        otherSubmitterIds.add(row.user_id);
      }
    }
  } catch (err) {
    console.error("Error preloading other submitters for notifications", err);
  }

  try {
    const { data: otherActivations } = await client
      .from("task_activations")
      .select("user_id")
      .eq("task_id", taskId)
      .neq("user_id", submitterId);

    for (const row of (otherActivations ?? []) as any[]) {
      if (row.user_id && typeof row.user_id === "string") {
        otherActivationUserIds.add(row.user_id);
      }
    }
  } catch (err) {
    console.error("Error preloading other activation users for notifications", err);
  }

  // Fetch the task to ensure it is still active and to get payout details.
  const { data: task, error: taskError } = await client
    .from("tasks")
    .select("id, user_id, status, title")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    return { ok: false, error: "Task not found" as const };
  }

  if ((task as any).status !== "active") {
    return { ok: false, error: "Task is not active" as const };
  }

  const { data: rpcData, error: rpcError } = await client.rpc(
    "accept_task_submission_with_payout",
    {
      p_task_id: taskId,
      p_submission_id: submissionId,
    },
  );

  if (rpcError) {
    console.error("Error running accept_task_submission_with_payout RPC", rpcError);
    return {
      ok: false,
      error: "Failed to run acceptance payout transaction" as const,
    };
  }

  const rpcResult = (rpcData ?? {}) as AcceptTaskSubmissionRpcResult;
  if (!rpcResult.ok) {
    return {
      ok: false,
      error: (rpcResult.error ?? "Failed to accept submission") as
        | "Submission not found"
        | "Submission does not belong to this task"
        | "Submission is not awaiting review"
        | "Task not found"
        | "Task is not active"
        | "Failed to accept submission",
    };
  }

  // Notify the submitter that their submission was accepted.
  try {
    await queueNotification({
      userId: submitterId,
      type: "task_submission_accepted",
      data: {
        taskId,
        taskTitle: (task as any)?.title ?? undefined,
        submissionId,
      },
      channels: { inApp: true, email: true },
    });
  } catch (notifyError) {
    console.error("Error queueing task_submission_accepted notification", notifyError);
  }

  // Notify other submitters that their submissions were rejected.
  for (const otherUserId of Array.from(otherSubmitterIds)) {
    if (otherUserId === submitterId) continue;
    try {
      await queueNotification({
        userId: otherUserId,
        type: "task_submission_rejected",
        data: {
          taskId,
          taskTitle: (task as any)?.title ?? undefined,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error("Error queueing task_submission_rejected notification", notifyError);
    }
  }

  // Notify users whose activations were cancelled because another
  // worker's submission was accepted.
  for (const otherUserId of Array.from(otherActivationUserIds)) {
    if (otherUserId === submitterId) continue;
    try {
      await queueNotification({
        userId: otherUserId,
        type: "task_activation_cancelled",
        data: {
          taskId,
          taskTitle: (task as any)?.title ?? undefined,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error(
        "Error queueing task_activation_cancelled notification after acceptance",
        notifyError,
      );
    }
  }

  return { ok: true as const };
}
