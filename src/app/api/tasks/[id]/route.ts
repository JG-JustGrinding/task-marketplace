import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, short_description")
      .eq("id", numericId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching task", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
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

    // Fetch the task and verify ownership + status
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, status")
      .eq("id", numericId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to delete this task." },
        { status: 403 },
      );
    }

    // Only allow deletion when the task is still awaiting payment (unfunded)
    if (task.status !== "pending_payment") {
      return NextResponse.json(
        { error: "This task can only be deleted while it is awaiting payment." },
        { status: 400 },
      );
    }

    // Ensure nobody has started the task (any non-cancelled activation blocks deletion)
    const { count: activationCount, error: activationError } = await supabase
      .from("task_activations")
      .select("id", { count: "exact", head: true })
      .eq("task_id", numericId)
      .not("status", "eq", "cancelled");

    if (activationError) {
      return NextResponse.json(
        { error: "Failed to verify task state. Please try again." },
        { status: 500 },
      );
    }

    if ((activationCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "This task cannot be deleted because someone has already started it." },
        { status: 400 },
      );
    }

    // Hard delete — all conditions met
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("id", numericId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete task. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting task", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
