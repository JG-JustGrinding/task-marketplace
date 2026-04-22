import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAuthorizedCronRequest } from "@/lib/authSecrets";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// This route is intended to be called from a scheduled job (cron)
// to automatically expire activations with overdue check-in requests.
//
// For basic protection, you can optionally set CRON_SECRET in your env
// and include it as an `x-cron-secret` header when calling this endpoint.

export async function POST(request: Request) {
  try {
    if (!isAuthorizedCronRequest(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const supabase = await createClient();

    const cutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();

    const { data: activations, error: activationsError } = await supabase
      .from("task_activations")
      .select("id, task_id, user_id, status, check_in_requested_at")
      .in("status", [
        "waiting_submission",
        "pending",
        "resubmission",
        "resubmission_requested",
      ])
      .not("check_in_requested_at", "is", null)
      .lte("check_in_requested_at", cutoff);

    if (activationsError) {
      console.error("Error fetching activations for expire-checkins", activationsError);
      return NextResponse.json(
        { error: "Failed to fetch activations for expiration." },
        { status: 500 },
      );
    }

    const rows = activations ?? [];
    let cancelledCount = 0;
    let clearedOnlyCount = 0;

    for (const activation of rows) {
      const activationId = (activation as any).id as number;
      const taskId = (activation as any).task_id as number;
      const userId = (activation as any).user_id as string;

      const { count: submissionsCount, error: submissionsError } = await supabase
        .from("task_submissions")
        .select("id", { count: "exact", head: true })
        .eq("task_id", taskId)
        .eq("user_id", userId);

      if (submissionsError) {
        console.error(
          "Error checking submissions before auto-cancelling activation",
          { activationId, submissionsError },
        );
        continue;
      }

      if ((submissionsCount ?? 0) === 0) {
        const { error: cancelError } = await supabase
          .from("task_activations")
          .update({ status: "cancelled", check_in_requested_at: null })
          .eq("id", activationId);

        if (cancelError) {
          console.error(
            "Error auto-cancelling activation after missed check-in",
            { activationId, cancelError },
          );
          continue;
        }

        cancelledCount += 1;
      } else {
        const { error: clearError } = await supabase
          .from("task_activations")
          .update({ check_in_requested_at: null })
          .eq("id", activationId);

        if (clearError) {
          console.error("Error clearing expired check-in request", {
            activationId,
            clearError,
          });
          continue;
        }

        clearedOnlyCount += 1;
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: rows.length,
        cancelled: cancelledCount,
        clearedOnly: clearedOnlyCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in expire-checkins endpoint", error);
    return NextResponse.json(
      { error: "Failed to expire check-ins" },
      { status: 500 },
    );
  }
}
