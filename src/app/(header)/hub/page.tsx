import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HubDashboard from "@/components/HubDashboard";

type Task = {
	id: number;
	title: string;
	short_description: string | null;
	price: number;
	categories: string[] | null;
	created_at: string;
};

type SubmissionStatus =
	| "pending"
	| "accepted"
	| "rejected"
	| "resubmission_requested"
	| "cancelled"
	| string
	| null;

type TaskSubmission = {
	id: number;
	task_id: number;
	status: SubmissionStatus;
	created_at: string;
	is_hidden?: boolean | null;
};

export default async function HubPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: createdTasksData, error: createdError } = await supabase
		.from("tasks")
		.select("id, title, short_description, price, categories, created_at")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false });

	const createdTasks: Task[] = createdTasksData ?? [];
	const createdTaskIds = createdTasks.map((t) => t.id);

	let createdSubmissions: TaskSubmission[] = [];
	if (createdTaskIds.length > 0) {
		const { data } = await supabase
			.from("task_submissions")
			.select("id, task_id, status, created_at")
			.in("task_id", createdTaskIds);
		createdSubmissions = data ?? [];
	}

	const { data: mySubmissionsData } = await supabase
		.from("task_activations")
		.select("id, task_id, status, created_at, is_hidden")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false });

	const mySubmissions: TaskSubmission[] = mySubmissionsData ?? [];
	const submittedTaskIds = mySubmissions.map((s) => s.task_id);

	let submittedTasks: Task[] = [];
	if (submittedTaskIds.length > 0) {
		const { data } = await supabase
			.from("tasks")
			.select("id, title, short_description, price, categories, created_at")
			.in("id", submittedTaskIds);
		submittedTasks = data ?? [];
	}

	return (
		<main className="min-h-[calc(100vh-4rem)] bg-[var(--bg-primary)] px-4 py-8 text-sm text-[var(--text-primary)]">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
				<HubDashboard
					createdTasks={createdTasks}
					createdSubmissions={createdSubmissions}
					mySubmissions={mySubmissions}
					submittedTasks={submittedTasks}
					createdError={!!createdError}
					hasRealCreated={createdTasks.length > 0 && !createdError}
					hasRealSubmitted={mySubmissions.length > 0}
				/>
			</div>
		</main>
	);
}

