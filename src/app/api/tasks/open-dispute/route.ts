import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications";

type OpenDisputeBody = {
  taskId?: number;
  submissionId?: number;
  reason?: string | null;
  description?: string | null;
  requestedAction?: string | null;
};

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OpenDisputeBody;

    const taskId = body.taskId;
    const submissionId = body.submissionId;
    const reason = (body.reason ?? "").toString().slice(0, 128);
    const description = (body.description ?? "").toString().slice(0, 4000);
    const requestedActionRaw = (body.requestedAction ?? "keep_task").toString();

    // Normalize the requested overturn action. We only allow a small set of
    // known values so that later resolution logic can rely on them.
    let overturnAction: string | null = null;
    if (requestedActionRaw === "keep_task" || requestedActionRaw === "delete_task") {
      overturnAction = requestedActionRaw;
    } else {
      overturnAction = "keep_task";
    }

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

    // Ensure the current user is the owner (creator) of this task.
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
        { error: "You are not allowed to open disputes for this task." },
        { status: 403 },
      );
    }

    const { data: submission, error: submissionError } = await supabase
      .from("task_submissions")
      .select("id, task_id, user_id, status")
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

    if (submission.status !== "accepted") {
      return NextResponse.json(
        { error: "Only accepted submissions can be disputed." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Ensure there is a corresponding task_earnings row and that its created_at
    // is within the 2-day dispute window.
    const { data: earnings, error: earningsError } = await admin
      .from("task_earnings")
      .select("id, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (earningsError) {
      console.error("Error loading task_earnings for dispute", earningsError);
      return NextResponse.json(
        { error: "Failed to verify dispute window." },
        { status: 500 },
      );
    }

    if (!earnings || !earnings.created_at) {
      return NextResponse.json(
        { error: "This submission is not eligible for dispute." },
        { status: 400 },
      );
    }

    const createdTime = new Date(earnings.created_at as string).getTime();
    if (!Number.isFinite(createdTime)) {
      return NextResponse.json(
        { error: "Could not determine dispute window." },
        { status: 400 },
      );
    }

    const nowTime = Date.now();
    if (nowTime - createdTime > TWO_DAYS_MS) {
      return NextResponse.json(
        { error: "The 2-day dispute window has expired for this submission." },
        { status: 400 },
      );
    }

    // Prevent multiple disputes for the same submission.
    const { data: existingDispute, error: existingDisputeError } = await admin
      .from("task_submission_disputes")
      .select("id")
      .eq("submission_id", submissionId)
      .limit(1)
      .maybeSingle();

    if (existingDisputeError) {
      console.error("Error checking for existing dispute", existingDisputeError);
      return NextResponse.json(
        { error: "Failed to check existing disputes." },
        { status: 500 },
      );
    }

    if (existingDispute) {
      return NextResponse.json(
        { error: "A dispute has already been opened for this submission." },
        { status: 400 },
      );
    }

    const { error: insertError } = await admin.from("task_submission_disputes").insert({
      task_id: taskId,
      submission_id: submissionId,
      creator_id: user.id,
      worker_id: submission.user_id,
      reason: reason || null,
      description: description || null,
      status: "open",
      overturn_action: overturnAction,
    } as any);

    if (insertError) {
      console.error("Error creating dispute", insertError);
      return NextResponse.json(
        { error: "Failed to open dispute." },
        { status: 500 },
      );
    }

    // Notify the worker that a dispute was opened on their submission.
    try {
      await queueNotification({
        userId: submission.user_id as string,
        type: "dispute_started",
        data: {
          taskId,
          taskTitle: (task as any)?.title ?? undefined,
          submissionId,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error("Error queueing dispute_started notification", notifyError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error opening dispute", error);
    return NextResponse.json(
      { error: "Failed to open dispute" },
      { status: 500 },
    );
  }
}
