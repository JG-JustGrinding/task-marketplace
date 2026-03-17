import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type RequestCheckInBody = {
  activationId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestCheckInBody;

    const activationId = body.activationId;
    if (!activationId || !Number.isFinite(activationId)) {
      return NextResponse.json(
        { error: "A valid activationId is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { data: activation, error: activationError } = await supabase
      .from("task_activations")
      .select(
        "id, task_id, user_id, status, created_at, last_check_in_at, check_in_requested_at",
      )
      .eq("id", activationId)
      .single();

    if (activationError || !activation) {
      return NextResponse.json(
        { error: "Activation not found" },
        { status: 404 },
      );
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, title")
      .eq("id", activation.task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Task not found for activation" },
        { status: 404 },
      );
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to request check-ins for this task." },
        { status: 403 },
      );
    }

    const status = (activation as any).status as string | null;
    const activeStatuses = [
      "waiting_submission",
      "pending",
      "resubmission",
      "resubmission_requested",
    ];

    if (!status || !activeStatuses.includes(status)) {
      return NextResponse.json(
        { error: "You can only request a check-in for an active activation." },
        { status: 400 },
      );
    }

    const createdAt = new Date(activation.created_at as string);
    if (Number.isNaN(createdAt.getTime())) {
      return NextResponse.json(
        { error: "Activation has an invalid created_at timestamp." },
        { status: 400 },
      );
    }

    const now = Date.now();
    const ageMs = now - createdAt.getTime();
    if (ageMs < THREE_DAYS_MS) {
      return NextResponse.json(
        {
          error:
            "Activation must be active for at least 3 days before you can request a check-in.",
        },
        { status: 400 },
      );
    }

    const lastCheckInAt = activation.last_check_in_at
      ? new Date(activation.last_check_in_at as string)
      : null;

    if (lastCheckInAt && now - lastCheckInAt.getTime() < ONE_WEEK_MS) {
      return NextResponse.json(
        {
          error:
            "You can only request a check-in once every 7 days for the same activation.",
        },
        { status: 400 },
      );
    }

    const checkInRequestedAt = activation.check_in_requested_at
      ? new Date(activation.check_in_requested_at as string)
      : null;

    if (checkInRequestedAt && now - checkInRequestedAt.getTime() < ONE_DAY_MS) {
      return NextResponse.json(
        { error: "There is already an active check-in request for this activation." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("task_activations")
      .update({ check_in_requested_at: new Date().toISOString() })
      .eq("id", activationId);

    if (updateError) {
      console.error("Error requesting check-in", updateError);
      return NextResponse.json(
        { error: "Failed to request check-in. Please try again." },
        { status: 500 },
      );
    }

    // Notify the worker that a check-in was requested.
    try {
      await queueNotification({
        userId: activation.user_id as string,
        type: "checkin_requested",
        data: {
          taskId: activation.task_id,
          taskTitle: (task as any)?.title ?? undefined,
          activationId: activation.id,
        },
        channels: { inApp: true, email: true },
      });
    } catch (notifyError) {
      console.error("Error queueing checkin_requested notification", notifyError);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error requesting check-in", error);
    return NextResponse.json(
      { error: "Failed to request check-in" },
      { status: 500 },
    );
  }
}
