import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

// This route is intended to be called from a scheduled job (cron)
// to enforce Creator Pro time limits on task activations.
//
// Responsibilities:
// - Automatically cancel activations whose submission window has expired.
// - Send a one-time warning notification to workers who are close to
//   their deadline (idempotent per activation).
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
    const nowMs = Date.now();

    // Load all activations that are still in a state where the worker
    // is expected to submit work (no submission created yet).
    const { data: activations, error: activationsError } = await admin
      .from("task_activations")
      .select("id, task_id, user_id, status, created_at")
      .in("status", ["waiting_submission", "resubmission_requested"]);

    if (activationsError) {
      console.error(
        "Error fetching activations for enforce-time-limits",
        activationsError,
      );
      return NextResponse.json(
        { error: "Failed to fetch activations for time-limit enforcement." },
        { status: 500 },
      );
    }

    const rows = activations ?? [];

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: true,
          processedActivations: 0,
          cancelledActivations: 0,
          warningsSent: 0,
          warningsAlreadySent: 0,
        },
        { status: 200 },
      );
    }

    const taskIds = Array.from(
      new Set(rows.map((a: any) => a.task_id as number | null).filter(Boolean)),
    );

    const { data: tasks, error: tasksError } = await admin
      .from("tasks")
      .select("id, title, time_limit_days")
      .in("id", taskIds);

    if (tasksError) {
      console.error(
        "Error fetching tasks for enforce-time-limits candidates",
        tasksError,
      );
      return NextResponse.json(
        { error: "Failed to fetch tasks for time-limit enforcement." },
        { status: 500 },
      );
    }

    const tasksById = new Map<
      number,
      { title: string | null; timeLimitDays: number | null }
    >();

    for (const row of tasks ?? []) {
      const anyRow = row as any;
      const id = anyRow.id as number | null;
      if (!id) continue;
      const rawLimit = anyRow.time_limit_days as number | null | undefined;
      const timeLimitDays =
        typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
          ? rawLimit
          : null;
      tasksById.set(id, {
        title: (anyRow.title as string | null) ?? null,
        timeLimitDays,
      });
    }

    let processedActivations = 0;
    let cancelledActivations = 0;
    let warningsSent = 0;
    let warningsAlreadySent = 0;

    for (const activation of rows as any[]) {
      const activationId = activation.id as number;
      const taskId = activation.task_id as number;
      const userId = activation.user_id as string;
      const status = (activation.status as string | null) ?? null;
      const createdAtRaw = activation.created_at as string | null | undefined;

      const taskInfo = tasksById.get(taskId);
      if (!taskInfo || !taskInfo.timeLimitDays || taskInfo.timeLimitDays <= 0) {
        continue;
      }

      const timeLimitDays = taskInfo.timeLimitDays;

      const createdAtDate = createdAtRaw ? new Date(createdAtRaw) : null;
      if (!createdAtDate || Number.isNaN(createdAtDate.getTime())) {
        continue;
      }

      const deadlineMs = createdAtDate.getTime() + timeLimitDays * ONE_DAY_MS;
      const remainingMs = deadlineMs - nowMs;

      processedActivations += 1;

      // If the time limit has fully expired, cancel the activation so the
      // worker can no longer submit work for this task.
      if (remainingMs <= 0) {
        try {
          const { error: updateError } = await admin
            .from("task_activations")
            .update({ status: "cancelled" })
            .eq("id", activationId)
            .in("status", ["waiting_submission", "resubmission_requested"]);

          if (updateError) {
            console.error(
              "Error auto-cancelling activation after time-limit expiry",
              { activationId, updateError },
            );
          } else {
            cancelledActivations += 1;
          }
        } catch (err) {
          console.error(
            "Unexpected error auto-cancelling activation after time-limit expiry",
            { activationId, err },
          );
        }

        continue;
      }

      // Otherwise, consider sending a one-time warning if we're under
      // the appropriate threshold.
      let shouldWarn = false;

      if (timeLimitDays > 1 && remainingMs <= ONE_DAY_MS) {
        // Tasks with more than a 1 day limit: warn when < 24 hours remain.
        shouldWarn = true;
      } else if (timeLimitDays === 1 && remainingMs <= TWELVE_HOURS_MS) {
        // Tasks with exactly a 1 day limit: warn when < 12 hours remain.
        shouldWarn = true;
      }

      if (!shouldWarn) {
        continue;
      }

      try {
        // Idempotency: check if we've already sent a time-limit warning
        // for this activation by looking for an existing notification
        // with matching user, type, and activationId in its data payload.
        const { data: existingNotification, error: existingError } = await admin
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "time_limit_warning")
          .contains("data", { activationId })
          .maybeSingle();

        if (existingError) {
          console.error(
            "Error checking for existing time_limit_warning notification",
            { activationId, existingError },
          );
        }

        if (existingNotification) {
          warningsAlreadySent += 1;
          continue;
        }

        const result = await queueNotification({
          userId,
          type: "time_limit_warning",
          data: {
            taskId,
            taskTitle: taskInfo.title ?? undefined,
            activationId,
            timeLimitDays,
          },
          // Send both in-app and email notifications (email respects
          // the user's activity email preference on their profile).
          channels: { inApp: true, email: true },
        });

        if (!result.ok) {
          console.error(
            "Error queueing time_limit_warning notification",
            { activationId },
          );
        } else {
          warningsSent += 1;
        }
      } catch (err) {
        console.error(
          "Unexpected error queueing time_limit_warning notification",
          { activationId, err },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        processedActivations,
        cancelledActivations,
        warningsSent,
        warningsAlreadySent,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in enforce-time-limits endpoint", error);
    return NextResponse.json(
      { error: "Failed to enforce time limits" },
      { status: 500 },
    );
  }
}
