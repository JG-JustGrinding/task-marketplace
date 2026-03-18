import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptTaskSubmissionWithPayout } from "@/lib/tasks/acceptSubmission";
import { isPremiumActive } from "@/lib/premium";

const BASE_AUTO_ACCEPT_MS = 3 * 24 * 60 * 60 * 1000; // default window
const CREATOR_PRO_AUTO_ACCEPT_MS = 7 * 24 * 60 * 60 * 1000; // extended window for Creator Pro

// This route is intended to be called from a scheduled job (cron)
// to automatically accept stale submissions when the creator has not
// taken action within the review window and there is only a single
// submission for the task. The review window is 3 days by default,
// extended to 7 days for creators with active Creator Pro.
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

    // Use the shortest window (3 days) for the initial candidate search.
    const cutoff = new Date(Date.now() - BASE_AUTO_ACCEPT_MS).toISOString();

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

    // Load task creators for the candidate tasks so we can determine
    // whether Creator Pro is active and adjust the review window.
    const candidateTaskIds = Array.from(
      new Set(candidates.map((s: any) => s.task_id as number)),
    );

    let taskToCreator = new Map<number, string>();
    let creatorsById = new Map<
      string,
      { creator_pro_active: boolean | null; creator_pro_expires_at: string | null }
    >();

    if (candidateTaskIds.length > 0) {
      const { data: tasks, error: tasksError } = await admin
        .from("tasks")
        .select("id, user_id")
        .in("id", candidateTaskIds);

      if (tasksError) {
        console.error(
          "Error fetching tasks for auto-accept candidates",
          tasksError,
        );
        return NextResponse.json(
          { error: "Failed to fetch tasks for auto-accept candidates" },
          { status: 500 },
        );
      }

      const creatorIds = new Set<string>();
      for (const row of tasks ?? []) {
        const taskId = (row as any).id as number;
        const creatorId = (row as any).user_id as string | null;
        if (!creatorId) continue;
        taskToCreator.set(taskId, creatorId);
        creatorIds.add(creatorId);
      }

      if (creatorIds.size > 0) {
        const { data: creators, error: creatorsError } = await admin
          .from("profiles")
          .select("id, creator_pro_active, creator_pro_expires_at")
          .in("id", Array.from(creatorIds));

        if (creatorsError) {
          console.error(
            "Error fetching creator profiles for auto-accept",
            creatorsError,
          );
          return NextResponse.json(
            { error: "Failed to fetch creator profiles for auto-accept" },
            { status: 500 },
          );
        }

        for (const row of creators ?? []) {
          const creatorId = (row as any).id as string;
          creatorsById.set(creatorId, {
            creator_pro_active: (row as any).creator_pro_active as boolean | null,
            creator_pro_expires_at: (row as any)
              .creator_pro_expires_at as string | null,
          });
        }
      }
    }

    for (const submission of candidates as any[]) {
      const taskId = submission.task_id as number;
      const submissionId = submission.id as number;

       const createdAtRaw = submission.created_at as string | null | undefined;
       const createdAtDate = createdAtRaw ? new Date(createdAtRaw) : null;
       if (!createdAtDate || Number.isNaN(createdAtDate.getTime())) {
         // If we can't parse the timestamp, skip auto-accept for safety.
         continue;
       }

       const creatorId = taskToCreator.get(taskId) ?? null;
       let reviewWindowMs = BASE_AUTO_ACCEPT_MS;

       if (creatorId) {
         const creator = creatorsById.get(creatorId);
         if (creator) {
           const creatorProActive = isPremiumActive(
             creator.creator_pro_active,
             creator.creator_pro_expires_at,
           );

           if (creatorProActive) {
             reviewWindowMs = CREATOR_PRO_AUTO_ACCEPT_MS;
           }
         }
       }

       const ageMs = Date.now() - createdAtDate.getTime();
       if (ageMs < reviewWindowMs) {
         // Still within the creator's review window; do not auto-accept yet.
         continue;
       }

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
