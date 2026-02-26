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

    // Determine how much the submitter should earn for this task.
    // We use the task's price and convert to cents for precise accounting.
    const taskPrice = (task as any).price as number | null;
    const payoutCents = taskPrice && Number.isFinite(taskPrice)
      ? Math.round(taskPrice * 100)
      : 0;

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

    // Credit the submitter's internal balance for withdrawal.
    // This assumes a numeric column `available_balance_cents` on `profiles`.
    if (payoutCents > 0) {
      const admin = createAdminClient();

      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("available_balance_cents")
        .eq("id", submitterId)
        .single();

      if (profileError) {
        console.error("Error fetching submitter profile for balance update", profileError);
      } else {
        const currentCents =
          (profile as any)?.available_balance_cents &&
          Number.isFinite((profile as any).available_balance_cents)
            ? (profile as any).available_balance_cents
            : 0;

        const newBalance = currentCents + payoutCents;

        const { error: balanceError } = await admin
          .from("profiles")
          .update({ available_balance_cents: newBalance })
          .eq("id", submitterId);

        if (balanceError) {
          console.error("Error updating submitter available_balance_cents", balanceError);
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
