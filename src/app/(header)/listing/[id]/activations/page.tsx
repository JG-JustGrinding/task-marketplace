import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TaskActivationsClient from "@/components/TaskActivationsClient";

type PageParams = {
	params: Promise<{ id: string }>;
};

type TaskRow = {
	id: number;
	user_id: string;
	title: string;
};

type ActivationRow = {
	id: number;
	user_id: string;
	status: string | null;
	created_at: string;
	last_check_in_at?: string | null;
	check_in_requested_at?: string | null;
};

type ProfileRow = {
	id: string;
	username: string | null;
};

export const metadata: Metadata = {
	title: "Task activations",
	description:
		"View and manage worker activations for this Bountask listing as the task creator.",
	robots: {
		index: false,
		follow: false,
	},
};

export default async function ListingActivationsPage({ params }: PageParams) {
    if (10 > 2) {
        return notFound();
    }
    
    const { id } = await params;
	const numericId = Number(id);

	if (!Number.isFinite(numericId)) {
		return notFound();
	}

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return notFound();
	}

	const { data: task, error: taskError } = await supabase
		.from("tasks")
		.select("id, user_id, title")
		.eq("id", numericId)
		.single<TaskRow>();

	if (taskError || !task) {
		return notFound();
	}

	const isPoster = task.user_id === user.id;

	if (!isPoster) {
		return notFound();
	}

	const { data: activationsData } = await supabase
		.from("task_activations")
		.select(
			"id, user_id, status, created_at, last_check_in_at, check_in_requested_at",
		)
		.eq("task_id", task.id)
		.order("created_at", { ascending: false });

	const activations = (activationsData ?? []) as ActivationRow[];

	const userIds = Array.from(new Set(activations.map((a) => a.user_id))).filter(
		Boolean,
	);

	let profilesById = new Map<string, ProfileRow>();
	if (userIds.length > 0) {
		const { data: profilesData } = await supabase
			.from("profiles")
			.select("id, username")
			.in("id", userIds as string[]);

		(profilesData ?? []).forEach((p) => {
			profilesById.set(p.id, p as ProfileRow);
		});
	}

	let hasSubmissionByUser = new Map<string, boolean>();
	if (userIds.length > 0) {
		const { data: submissionsData } = await supabase
			.from("task_submissions")
			.select("user_id")
			.eq("task_id", task.id)
			.in("user_id", userIds as string[]);

		(submissionsData ?? []).forEach((row) => {
			const uid = (row as { user_id: string }).user_id;
			hasSubmissionByUser.set(uid, true);
		});
	}

	const filteredActivations = activations.filter(
		(a) => !hasSubmissionByUser.get(a.user_id),
	);

	const serializedActivations = filteredActivations.map((a) => ({
		id: a.id,
		userId: a.user_id,
		username: profilesById.get(a.user_id)?.username ?? null,
		createdAt: a.created_at,
		lastCheckInAt: a.last_check_in_at ?? null,
		checkInRequestedAt: a.check_in_requested_at ?? null,
		status: a.status,
		hasSubmission: hasSubmissionByUser.get(a.user_id) ?? false,
	}));

	return (
		<TaskActivationsClient
			taskId={task.id}
			taskTitle={task.title}
			currentUserId={user.id}
			isPoster={isPoster}
			activations={serializedActivations}
		/>
	);
}
