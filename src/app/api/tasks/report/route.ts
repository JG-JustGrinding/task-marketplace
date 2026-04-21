import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRateLimitResponse, rateLimitByUser } from "@/lib/rateLimit";

const ALLOWED_REASONS = [
  "spam",
  "fraud",
  "abuse",
  "scam",
  "inappropiate_content",
  "other",
] as const;

type ReportReason = (typeof ALLOWED_REASONS)[number];

type ReportTaskBody = {
  taskId?: number;
  reason?: string | null;
  description?: string | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReportTaskBody;

    const rawTaskId = body.taskId;
    const rawReason = (body.reason ?? "").toString();
    const description = (body.description ?? "").toString().slice(0, 2000);

    if (!rawTaskId || !Number.isFinite(rawTaskId)) {
      return NextResponse.json(
        { error: "A valid taskId is required." },
        { status: 400 },
      );
    }

    const taskId = Number(rawTaskId);

    // Normalize reason to a known enum value; fall back to "other".
    const lowerReason = rawReason.toLowerCase();
    const matchedReason = ALLOWED_REASONS.find((r) => r === lowerReason);
    const reason: ReportReason = matchedReason ?? "other";

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rateLimitResult = await rateLimitByUser("reportTask", user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(
        "Too many reports submitted. Please try again later.",
        rateLimitResult,
      );
    }

    // Ensure the task exists before creating a report.
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const { error: insertError } = await supabase.from("reports").insert({
      task_id: taskId,
      reporter_id: user.id,
      reason,
      description: description || null,
    });

    if (insertError) {
      console.error("Error creating report", insertError);
      return NextResponse.json(
        { error: "Failed to create report" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error handling report request", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 },
    );
  }
}
