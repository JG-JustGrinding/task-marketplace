import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type CheckInBody = {
  activationId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CheckInBody;

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
        "id, task_id, user_id, status, check_in_requested_at, last_check_in_at",
      )
      .eq("id", activationId)
      .single();

    if (activationError || !activation) {
      return NextResponse.json(
        { error: "Activation not found" },
        { status: 404 },
      );
    }

    if (activation.user_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "You are not allowed to check in for an activation that is not yours.",
        },
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
        { error: "You can only check in for an active activation." },
        { status: 400 },
      );
    }

    if (!activation.check_in_requested_at) {
      return NextResponse.json(
        { error: "There is no active check-in request for this activation." },
        { status: 400 },
      );
    }

    const requestedAt = new Date(activation.check_in_requested_at as string);
    if (Number.isNaN(requestedAt.getTime())) {
      return NextResponse.json(
        { error: "Check-in request has an invalid timestamp." },
        { status: 400 },
      );
    }

    const now = Date.now();

    if (now - requestedAt.getTime() > ONE_DAY_MS) {
      // The cron-driven expire-checkins route is responsible for
      // cancelling or clearing overdue check-in requests. Here we
      // just report that the window has expired.
      return NextResponse.json(
        { error: "This check-in window has expired." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("task_activations")
      .update({
        last_check_in_at: new Date().toISOString(),
        check_in_requested_at: null,
      })
      .eq("id", activationId);

    if (updateError) {
      console.error("Error saving check-in", updateError);
      return NextResponse.json(
        { error: "Failed to save check-in. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error in check-in endpoint", error);
    return NextResponse.json(
      { error: "Failed to perform check-in" },
      { status: 500 },
    );
  }
}
