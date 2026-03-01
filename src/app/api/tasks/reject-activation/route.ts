import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RejectActivationBody = {
    activationId?: number;
};

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as RejectActivationBody;

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
            .select("id, task_id, user_id, status, created_at")
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
            .select("id, user_id")
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
                { error: "You are not allowed to manage activations for this task." },
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
                { error: "This activation cannot be rejected in its current state." },
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

        const ageMs = Date.now() - createdAt.getTime();
        if (ageMs < THREE_DAYS_MS) {
            return NextResponse.json(
                { error: "Activation must be active for at least 3 days before it can be rejected." },
                { status: 400 },
            );
        }

        const { count: submissionsCount, error: submissionsError } = await supabase
            .from("task_submissions")
            .select("id", { count: "exact", head: true })
            .eq("task_id", activation.task_id)
            .eq("user_id", activation.user_id);

        if (submissionsError) {
            console.error("Error checking submissions for activation", submissionsError);
            return NextResponse.json(
                { error: "Failed to check submissions for activation." },
                { status: 500 },
            );
        }

        if ((submissionsCount ?? 0) > 0) {
            return NextResponse.json(
                { error: "Cannot reject an activation that already has a submission." },
                { status: 400 },
            );
        }

        const { error: updateError } = await supabase
            .from("task_activations")
            .update({ status: "rejected" })
            .eq("id", activationId);

        if (updateError) {
            console.error("Error rejecting task activation", updateError);
            return NextResponse.json(
                { error: "Failed to reject task activation. Please try again." },
                { status: 500 },
            );
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Error rejecting task activation", error);
        return NextResponse.json(
            { error: "Failed to reject task activation" },
            { status: 500 },
        );
    }
}
