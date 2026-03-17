import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";

type RejectSubmissionBody = {
  taskId?: number;
  submissionId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RejectSubmissionBody;

    const taskId = body.taskId;
    const submissionId = body.submissionId;

    if (!taskId || !Number.isFinite(taskId) || !submissionId || !Number.isFinite(submissionId)) {
      return NextResponse.json(
        { error: "A valid taskId and submissionId are required." },
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

    // Ensure the current user is the owner of this task.
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, title")
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

    // Look up the submission to find the submitting user.
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

    const submitterId = submission.user_id as string;

    // Mark the corresponding activation as rejected so the user cannot start again.
    const { error: activationError } = await supabase
      .from("task_activations")
      .update({ status: "rejected" })
      .eq("user_id", submitterId)
      .eq("task_id", taskId);

    const { error: submissionUpdateError } = await supabase
      .from("task_submissions")
      .update({ status: "rejected" })
      .eq("id", submissionId);

    if (activationError) {
      console.error("Error updating task_activations status to rejected", activationError);
      return NextResponse.json(
        { error: "Failed to update activation status" },
        { status: 500 },
      );
    }

    if (submissionUpdateError) {
      console.error("Error updating task_submissions status to rejected", submissionUpdateError);
      return NextResponse.json(
        { error: "Failed to update submission status" },
        { status: 500 },
      );
    }

    // Notify the submitter that their submission was rejected.
    try {
      await queueNotification({
        userId: submitterId,
        type: "task_submission_rejected",
        data: {
          taskId,
          taskTitle: (task as any)?.title ?? undefined,
          submissionId,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error("Error queueing task_submission_rejected notification", notifyError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error rejecting submission", error);
    return NextResponse.json(
      { error: "Failed to reject submission" },
      { status: 500 },
    );
  }
}
