import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HubDashboard from "@/components/HubDashboard";
import stripe from "@/lib/stripe";
import { maturePendingEarningsForUser } from "@/lib/earnings";

type Task = {
	id: number;
	title: string;
	short_description: string | null;
	price: number;
	categories: string[] | null;
	status?: string | null;
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
	has_dispute?: boolean | null;
	// True when a dispute on this submission has been resolved in favor of the creator
	// and the original acceptance was effectively overturned.
	is_overturned?: boolean | null;
};

export default async function HubPage() {
	const supabase = await createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	// Ensure any matured earnings are reflected in the user's balances
	// before we load and display them in the dashboard.
	await maturePendingEarningsForUser(user.id);

	// Load the current user's payout balance, pending balance, and Stripe account status
	const { data: profileData } = await supabase
		.from("profiles")
		.select("available_balance_cents, pending_balance_cents, stripe_account_id")
		.eq("id", user.id)
		.single();

	const availableBalanceCents =
		(typeof profileData?.available_balance_cents === "number"
			? profileData.available_balance_cents
			: 0) || 0;

	const pendingBalanceCents =
		(typeof profileData?.pending_balance_cents === "number"
			? profileData.pending_balance_cents
			: 0) || 0;

	const hasStripeAccount = Boolean(profileData?.stripe_account_id);

	let hasCompletedStripeOnboarding = false;

	if (profileData?.stripe_account_id) {
		try {
			const account = await stripe.accounts.retrieve(
				profileData.stripe_account_id as string,
			);

			hasCompletedStripeOnboarding = Boolean(
				// "details_submitted" indicates the onboarding flow was completed
				(account as any).details_submitted && (account as any).charges_enabled,
			);
		} catch (err) {
			console.error("Error checking Stripe onboarding status", err);
		}
	}

	const { data: createdTasksData, error: createdError } = await supabase
		.from("tasks")
		.select("id, title, short_description, price, categories, status, created_at")
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
		.select("id, task_id, status, created_at, is_hidden, resubmission_message")
		.eq("user_id", user.id)
		.order("created_at", { ascending: false });

	const rawMySubmissions: TaskSubmission[] = mySubmissionsData ?? [];
	const submittedTaskIds = rawMySubmissions.map((s) => s.task_id);

	// Track both currently open disputes and disputes that have been resolved
	// in favor of the creator (overturned) so the worker sees accurate status.
	const disputedTaskIds = new Set<number>();
	const overturnedTaskIds = new Set<number>();
	if (submittedTaskIds.length > 0) {
		const { data: disputesData } = await supabase
			.from("task_submission_disputes")
			.select("task_id, status")
			.eq("worker_id", user.id)
			.in("task_id", submittedTaskIds);

		for (const row of disputesData ?? []) {
			const taskId = (row as any).task_id as number | null;
			const status = (row as any).status as string | null;
			if (taskId == null) continue;
			if (status === "open") {
				disputedTaskIds.add(taskId);
			}
			if (status === "resolved_upheld") {
				overturnedTaskIds.add(taskId);
			}
		}
	}

	const mySubmissions: TaskSubmission[] = rawMySubmissions.map((s) => ({
		...s,
		has_dispute: disputedTaskIds.has(s.task_id),
		is_overturned: overturnedTaskIds.has(s.task_id),
	}));
	const submittedTaskIdsWithDetails = mySubmissions.map((s) => s.task_id);

	let submittedTasks: Task[] = [];
	if (submittedTaskIdsWithDetails.length > 0) {
		const { data } = await supabase
			.from("tasks")
			.select("id, title, short_description, price, categories, created_at")
			.in("id", submittedTaskIdsWithDetails);
		submittedTasks = data ?? [];
	}

	// Load individual pending earnings so the dashboard can show a detailed list.
	const { data: pendingEarningsData } = await supabase
		.from("task_earnings")
		.select("id, task_id, submission_id, amount_cents, available_at, tasks(title)")
		.eq("submitter_id", user.id)
		.eq("status", "pending")
		.order("available_at", { ascending: true });

	// Determine which of the pending earnings currently have an open dispute
	// for this worker so we can highlight disputed payouts in the UI.
	const pendingSubmissionIds = (pendingEarningsData ?? [])
		.map((row: any) => row.submission_id as number | null)
		.filter((id): id is number => id != null);

	let disputedSubmissionIds = new Set<number>();
	if (pendingSubmissionIds.length > 0) {
		const { data: disputedRows } = await supabase
			.from("task_submission_disputes")
			.select("submission_id")
			.eq("worker_id", user.id)
			.eq("status", "open")
			.in("submission_id", pendingSubmissionIds);

		for (const row of disputedRows ?? []) {
			const sid = (row as any).submission_id as number | null;
			if (sid != null) {
				disputedSubmissionIds.add(sid);
			}
		}
	}

	const pendingEarnings = (pendingEarningsData ?? []).map((row: any) => ({
		id: row.id as number,
		taskId: row.task_id as number,
		submissionId: row.submission_id as number,
		amountCents: Number(row.amount_cents ?? 0),
		availableAt: row.available_at as string,
		taskTitle:
			(row as any)?.tasks?.title ||
			`Task #${row.task_id}`,
		hasDispute: disputedSubmissionIds.has(row.submission_id as number),
	}));

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
					availableBalanceCents={availableBalanceCents}
					pendingBalanceCents={pendingBalanceCents}
					pendingEarnings={pendingEarnings}
					hasStripeAccount={hasStripeAccount}
					hasCompletedStripeOnboarding={hasCompletedStripeOnboarding}
				/>
			</div>
		</main>
	);
}

