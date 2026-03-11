import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptTaskSubmissionWithPayout } from "@/lib/tasks/acceptSubmission";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

// This route is intended to be called from a scheduled job (cron)
// to automatically accept stale submissions when the creator has not
// taken action within 3 days and there is only a single submission
// for the task.
//
// Protection: set CRON_SECRET in the env and send it as
// `x-cron-secret` header when invoking this endpoint.

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const headerSecret = request.headers.get("x-cron-secret");
      if (!headerSecret || headerSecret !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const admin = createAdminClient();

    const cutoff = new Date(Date.now() - THREE_DAYS_MS).toISOString();

    // 1) Find all submissions awaiting review (initial or resubmission)
    //    that are older than the cutoff window.
    const { data: pendingSubs, error: pendingError } = await admin
      .from("task_submissions")
      .select("id, task_id, user_id, status, created_at")
      .in("status", ["pending", "resubmission"])
      .lte("created_at", cutoff);

    if (pendingError) {
      console.error("Error fetching pending submissions for auto-accept", pendingError);
      return NextResponse.json(
        { error: "Failed to fetch pending submissions" },
        { status: 500 },
      );
    }

    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          processed: 0,
          candidates: 0,
          autoAccepted: 0,
          skippedNotUnique: 0,
        },
        { status: 200 },
      );
    }

    const taskIds = Array.from(new Set(pendingSubs.map((s: any) => s.task_id as number)));

    // 2) For those tasks, count how many submissions exist in total so we only
    // auto-accept when there is exactly ONE submission for the task.
    const { data: allSubsForTasks, error: allSubsError } = await admin
      .from("task_submissions")
      .select("id, task_id")
      .in("task_id", taskIds);

    if (allSubsError) {
      console.error("Error fetching all submissions for candidate tasks", allSubsError);
      return NextResponse.json(
        { error: "Failed to fetch submissions for candidate tasks" },
        { status: 500 },
      );
    }

    const countsByTask = new Map<number, number>();
    for (const row of allSubsForTasks ?? []) {
      const taskId = (row as any).task_id as number;
      countsByTask.set(taskId, (countsByTask.get(taskId) ?? 0) + 1);
    }

    const candidates = pendingSubs.filter((s: any) => {
      const taskId = s.task_id as number;
      const totalForTask = countsByTask.get(taskId) ?? 0;
      return totalForTask === 1;
    });

    let autoAcceptedCount = 0;
    const skippedNotUnique = pendingSubs.length - candidates.length;

    for (const submission of candidates as any[]) {
      const taskId = submission.task_id as number;
      const submissionId = submission.id as number;

      const result = await acceptTaskSubmissionWithPayout(admin, {
        taskId,
        submissionId,
      });

      if (!result.ok) {
        console.error("Error auto-accepting submission", {
          taskId,
          submissionId,
          error: result.error,
        });
        continue;
      }

      autoAcceptedCount += 1;
    }

    return NextResponse.json(
      {
        success: true,
        processed: pendingSubs.length,
        candidates: candidates.length,
        autoAccepted: autoAcceptedCount,
        skippedNotUnique,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in auto-accept-submissions endpoint", error);
    return NextResponse.json(
      { error: "Failed to auto-accept submissions" },
      { status: 500 },
    );
  }
}
