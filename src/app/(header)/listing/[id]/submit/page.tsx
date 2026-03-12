import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitClient from "@/components/SubmitClient";

type TaskRow = {
	id: number;
	title: string | null;
};

export const metadata: Metadata = {
	title: "Submit work",
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
		.select("id, title")
		.eq("id", listingId)
		.single<TaskRow>();

	if (taskError || !task) {
		return notFound();
	}

	let activationStatus: string | null = null;
	let resubmissionMessage: string | null = null;

	if (user) {
		const { data: activation } = await supabase
			.from("task_activations")
			.select("status, resubmission_message")
			.eq("user_id", user.id)
			.eq("task_id", task.id)
			.maybeSingle();

		if (activation) {
			activationStatus = (activation as any).status ?? null;
			resubmissionMessage = (activation as any).resubmission_message ?? null;
		}
	}

	return (
		<SubmitClient
			id={id}
			listingId={listingId}
			taskTitle={task.title}
			activationStatus={activationStatus}
			resubmissionMessage={resubmissionMessage}
		/>
	);
}

