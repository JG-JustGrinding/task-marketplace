import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CancelTaskBody = {
  taskId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CancelTaskBody;

    const taskId = body.taskId;
    if (!taskId || !Number.isFinite(taskId)) {
      return NextResponse.json(
        { error: "A valid taskId is required." },
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

    const { error } = await supabase
      .from("task_activations")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("task_id", taskId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to cancel task. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error cancelling task activation", error);
    return NextResponse.json(
      { error: "Failed to cancel task" },
      { status: 500 },
    );
  }
}
