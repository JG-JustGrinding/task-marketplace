import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitClient from "@/components/SubmitClient";
import { isPremiumActive } from "@/lib/premium";

type TaskRow = {
	id: number;
	title: string | null;
	time_limit_days?: number | null;
};

export const metadata: Metadata = {
	title: "Submit Work",
	description:
		"Submit your completed work for this Bountask listing and track its review status.",
	robots: {
		index: false,
		follow: false,
	},
};

export default async function SubmitPage({
	params,
}: {
		params: Promise<{ id: string }>;
	}) {
	const { id } = await params;
	const listingId = Number(id);
	if (!Number.isFinite(listingId)) {
		return notFound();
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { data: task, error: taskError } = await supabase
		.from("tasks")
		.select("id, title, time_limit_days")
		.eq("id", listingId)
		.single<TaskRow>();

	if (taskError || !task) {
		return notFound();
	}

	let activationStatus: string | null = null;
	let resubmissionMessage: string | null = null;
	let isEarnerProActive = false;
	let activationCreatedAt: string | null = null;

	if (user) {
		const { data: profile } = await supabase
			.from("profiles")
			.select("earner_pro_active, earner_pro_expires_at")
			.eq("id", user.id)
			.maybeSingle();

		if (profile) {
			isEarnerProActive = isPremiumActive(
				(profile as any).earner_pro_active,
				(profile as any).earner_pro_expires_at,
			);
		}

		const { data: activation } = await supabase
			.from("task_activations")
			.select("status, resubmission_message, created_at")
			.eq("user_id", user.id)
			.eq("task_id", task.id)
			.maybeSingle();

		if (activation) {
			activationStatus = (activation as any).status ?? null;
			resubmissionMessage = (activation as any).resubmission_message ?? null;
			activationCreatedAt = (activation as any).created_at ?? null;
		}
	}

	// Only allow users who have an active activation for this task
	// to access the submission page. Others are redirected back to
	// the main listing view where they can activate the task first.
	const allowedActivationStatuses = new Set([
		"waiting_submission",
		"resubmission_requested",
	]);

	if (!activationStatus || !allowedActivationStatuses.has(activationStatus)) {
		return redirect(`/listing/${id}`);
	}

	const timeLimitDays =
		typeof (task as any).time_limit_days === "number"
			? ((task as any).time_limit_days as number)
			: null;

	return (
		<SubmitClient
			id={id}
			listingId={listingId}
			taskTitle={task.title}
			activationStatus={activationStatus}
			resubmissionMessage={resubmissionMessage}
			isEarnerProActive={isEarnerProActive}
			timeLimitDays={timeLimitDays}
			activationCreatedAt={activationCreatedAt}
		/>
	);
}

