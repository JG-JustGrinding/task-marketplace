import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptTaskSubmissionWithPayout } from "@/lib/tasks/acceptSubmission";
import { queueNotification } from "@/lib/notifications";

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

    // Ensure the current user is the owner of this task.
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, status, title")
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

    // Delegate the actual acceptance + payout logic to a shared helper
    // so it can also be used from cron-based auto-accept flows.
    const result = await acceptTaskSubmissionWithPayout(supabase, {
      taskId,
      submissionId,
    });

    if (!result.ok) {
      const message = result.error;
      const status =
        message === "Submission not found" || message === "Task not found"
          ? 404
          : message === "Task is not active" ||
            message === "Submission does not belong to this task" ||
            message === "Submission is not awaiting review"
            ? 400
            : 500;

      return NextResponse.json({ error: message }, { status });
    }

    // Notify the submitter that their submission was accepted.
    try {
      const { data: submission, error: submissionError } = await supabase
        .from("task_submissions")
        .select("id, task_id, user_id")
        .eq("id", submissionId)
        .single();

      if (!submissionError && submission && submission.user_id) {
        await queueNotification({
          userId: submission.user_id as string,
          type: "task_submission_accepted",
          data: {
            taskId,
            taskTitle: (task as any)?.title ?? undefined,
            submissionId,
          },
          channels: { inApp: true, email: true },
        });
      }
    } catch (notifyError) {
      console.error("Error queueing task_submission_accepted notification", notifyError);
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
