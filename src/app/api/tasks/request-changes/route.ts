import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";

type RequestChangesBody = {
  taskId?: number;
  submissionId?: number;
  note?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestChangesBody;

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

    // Update the submission status so creator and submitter views stay in sync.
    const { error: submissionUpdateError } = await supabase
      .from("task_submissions")
      .update({ status: "resubmission_requested" })
      .eq("id", submissionId);

    if (submissionUpdateError) {
      console.error("Error updating task_submissions status to resubmission_requested", submissionUpdateError);
      return NextResponse.json(
        { error: "Failed to update submission status" },
        { status: 500 },
      );
    }

    // Also mark the corresponding activation as resubmission_requested and store the message.
    const { error: activationError } = await supabase
      .from("task_activations")
      .update({
        status: "resubmission_requested",
        resubmission_message: body.note ?? null,
      })
      .eq("user_id", submitterId)
      .eq("task_id", taskId);

    if (activationError) {
      console.error("Error updating task_activations status to resubmission_requested", activationError);
      return NextResponse.json(
        { error: "Failed to update activation status" },
        { status: 500 },
      );
    }

    // Notify the submitter that changes were requested on their submission.
    try {
      await queueNotification({
        userId: submitterId,
        type: "submission_changes_requested",
        data: {
          taskId,
          taskTitle: (task as any)?.title ?? undefined,
          submissionId,
          note: body.note ?? null,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error("Error queueing submission_changes_requested notification", notifyError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error requesting changes", error);
    return NextResponse.json(
      { error: "Failed to request changes" },
      { status: 500 },
    );
  }
}
