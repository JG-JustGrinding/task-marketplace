import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";

type ActivateTaskBody = {
  taskId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ActivateTaskBody;

    const taskId = body.taskId;
    if (!taskId || !Number.isFinite(taskId)) {
      return NextResponse.json(
        { error: "A valid taskId is required." },
        { status: 400 }
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
    // Check for existing activations for this user/task.
    const { data: existing } = await supabase
      .from("task_activations")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId);

    if (existing && existing.length > 0) {
      const hasCancelled = existing.some((row) => (row as any).status === "cancelled");
      if (hasCancelled) {
        return NextResponse.json(
          { error: "You cancelled this task and can\'t start it again." },
          { status: 400 },
        );
      }

      // Already activated in some other state; treat as success/idempotent.
      return NextResponse.json(
        { activation: { user_id: user.id, task_id: taskId } },
        { status: 200 },
      );
    }

    // User does not yet have an activation for this task.
    // Enforce a maximum of 3 active tasks across all activations.
    const { count: activeCount, error: countError } = await supabase
      .from("task_activations")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", [
        "waiting_submission",
        "pending",
        "resubmission",
        "resubmission_requested",
      ]);

    if (countError) {
      console.error("Error counting active task activations", countError);
      return NextResponse.json(
        { error: "Failed to check active tasks. Please try again." },
        { status: 500 },
      );
    }

    if ((activeCount ?? 0) >= 3) {
      return NextResponse.json(
        { error: "You already have 3 active tasks. Complete or cancel one before starting another." },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("task_activations")
      .insert({ user_id: user.id, task_id: taskId, status: "waiting_submission" });

    if (error) {
      // If there's a unique constraint on (user_id, task_id), treat conflicts as success.
      if ((error as any).code === "23505") {
        return NextResponse.json({ activation: { user_id: user.id, task_id: taskId } }, { status: 200 });
      }

      return NextResponse.json(
        { error: "Failed to activate task. Please try again." },
        { status: 500 }
      );
    }

    // Notify the task owner that someone started their task.
    const { data: taskRow, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, title")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      console.error("Error loading task for task_started notification", taskError);
    } else if (taskRow && (taskRow as any).user_id) {
      const ownerId = (taskRow as any).user_id as string;
      const title = (taskRow as any).title as string | undefined;

      // Fire-and-forget; failures are logged inside queueNotification.
      await queueNotification({
        userId: ownerId,
        type: "task_started",
        data: { taskId, taskTitle: title },
        channels: { inApp: true, email: true },
      });
    }

    return NextResponse.json(
      { activation: { user_id: user.id, task_id: taskId } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error activating task", error);
    return NextResponse.json(
      { error: "Failed to activate task" },
      { status: 500 }
    );
  }
}
