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
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("task_activations")
      .select("id, status, resubmission_message")
      .eq("user_id", user.id)
      .eq("task_id", numericId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching task activation", error);
      return NextResponse.json(
        { error: "Failed to fetch task activation" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json({ activation: null }, { status: 200 });
    }

    return NextResponse.json({ activation: data }, { status: 200 });
  } catch (error) {
    console.error("Error in task activation GET", error);
    return NextResponse.json(
      { error: "Failed to fetch task activation" },
      { status: 500 },
    );
  }
}
