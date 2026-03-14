export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HubDashboard from "@/components/HubDashboard";
import stripe from "@/lib/stripe";
import { maturePendingEarningsForUser } from "@/lib/earnings";

export const metadata: Metadata = {
	title: "Your Hub",
	description:
		"View your Bountask earnings, balances, submissions, and task activity in one dashboard.",
	robots: {
		index: false,
		follow: false,
	},
};

type Task = {
	id: number;
	title: string;
	short_description: string | null;
	price: number;
	categories: string[] | null;
	status?: string | null;
	created_at: string;
	has_dispute?: boolean | null;
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
	check_in_requested_at?: string | null;
	has_dispute?: boolean | null;
	// True when a dispute on this submission has been resolved in favor of the creator
	// and the original acceptance was effectively overturned.
	is_overturned?: boolean | null;
};

const CREATED_PAGE_SIZE = 20;
const STARTED_PAGE_SIZE = 20;

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

	// Load the current user's payout balance, pending balance, Stripe account
	// status, created tasks, submissions, and pending earnings in grouped
	// parallel queries (after earnings have been matured).
	const [
		{ data: profileData },
		{ data: createdTasksData, error: createdError },
		{ data: mySubmissionsData },
		{ data: pendingEarningsData },
	] = await Promise.all([
		supabase
			.from("profiles")
			.select(
				"available_balance_cents, pending_balance_cents, stripe_account_id",
			)
			.eq("id", user.id)
			.single(),
		supabase.rpc("hub_created_tasks", {
			_creator_id: user.id,
			_limit: CREATED_PAGE_SIZE,
			_offset: 0,
		}),
		supabase.rpc("hub_started_tasks", {
			_worker_id: user.id,
			_limit: STARTED_PAGE_SIZE,
			_offset: 0,
		}),
		supabase
			.from("task_earnings")
			.select(
				"id, task_id, submission_id, amount_cents, available_at, tasks(title)",
			)
			.eq("submitter_id", user.id)
			.eq("status", "pending")
			.order("available_at", { ascending: true }),
	]);

	const availableBalanceCents =
		(typeof profileData?.available_balance_cents === "number"
			? profileData.available_balance_cents
			: 0) || 0;

	const pendingBalanceCents =
		(typeof profileData?.pending_balance_cents === "number"
			? profileData.pending_balance_cents
			: 0) || 0;

	const stripeAccountId = profileData?.stripe_account_id as string | undefined;
	const hasStripeAccount = Boolean(stripeAccountId);

	const [stripeAccount, creatorDisputesData, createdSubmissionsData, workerDisputesData, submittedTasksData, pendingEarningDisputesData] =
		await Promise.all([
			stripeAccountId
				? stripe.accounts.retrieve(stripeAccountId).catch((err: unknown) => {
						console.error("Error checking Stripe onboarding status", err);
						return null;
				  })
				: Promise.resolve(null),
			// The following queries depend on IDs derived from created and submitted tasks.
			(async () => {
				const createdTasksRaw: Task[] = createdTasksData ?? [];
				const createdTaskIds = createdTasksRaw.map((t) => t.id);
				if (createdTaskIds.length === 0) return null;
				const { data } = await supabase
					.from("task_submission_disputes")
					.select("task_id, status")
					.eq("creator_id", user.id)
					.eq("status", "open")
					.in("task_id", createdTaskIds);
				return data ?? null;
			})(),
			(async () => {
				const createdTasksRaw: Task[] = createdTasksData ?? [];
				const createdTaskIds = createdTasksRaw.map((t) => t.id);
				if (createdTaskIds.length === 0) return null;
				const { data } = await supabase
					.from("task_submissions")
					.select("id, task_id, status, created_at")
					.in("task_id", createdTaskIds);
				return data ?? null;
			})(),
			(async () => {
				const rawMySubmissions: TaskSubmission[] = mySubmissionsData ?? [];
				const submittedTaskIds = rawMySubmissions.map((s) => s.task_id);
				if (submittedTaskIds.length === 0) return null;
				const { data } = await supabase
					.from("task_submission_disputes")
					.select("task_id, status")
					.eq("worker_id", user.id)
					.in("task_id", submittedTaskIds);
				return data ?? null;
			})(),
			(async () => {
				const rawMySubmissions: TaskSubmission[] = mySubmissionsData ?? [];
				const submittedTaskIds = rawMySubmissions.map((s) => s.task_id);
				if (submittedTaskIds.length === 0) return null;
				const { data } = await supabase
					.from("tasks")
					.select(
						"id, title, short_description, price, categories, created_at",
					)
					.in("id", submittedTaskIds);
				return data ?? null;
			})(),
			(async () => {
				const pendingSubmissionIds = (pendingEarningsData ?? [])
					.map((row: any) => row.submission_id as number | null)
					.filter((id): id is number => id != null);
				if (pendingSubmissionIds.length === 0) return null;
				const { data } = await supabase
					.from("task_submission_disputes")
					.select("submission_id")
					.eq("worker_id", user.id)
					.eq("status", "open")
					.in("submission_id", pendingSubmissionIds);
				return data ?? null;
			})(),
		]);

	let hasCompletedStripeOnboarding = false;
	if (stripeAccount) {
		hasCompletedStripeOnboarding = Boolean(
			(stripeAccount as any).details_submitted &&
				(stripeAccount as any).charges_enabled,
		);
	}

	const createdTasksRaw: Task[] = createdTasksData ?? [];
	const openDisputedTaskIds = new Set<number>();
	for (const row of (creatorDisputesData ?? []) as any[]) {
		const taskId = row.task_id as number | null;
		if (taskId != null) openDisputedTaskIds.add(taskId);
	}

	const createdTasks: Task[] = createdTasksRaw.map((task) => ({
		...task,
		has_dispute: openDisputedTaskIds.has(task.id),
	}));

	const createdSubmissions: TaskSubmission[] =
		(createdSubmissionsData as TaskSubmission[] | null) ?? [];

	const rawMySubmissions: TaskSubmission[] = mySubmissionsData ?? [];
	const disputedTaskIds = new Set<number>();
	const overturnedTaskIds = new Set<number>();
	for (const row of (workerDisputesData ?? []) as any[]) {
		const taskId = row.task_id as number | null;
		const status = row.status as string | null;
		if (taskId == null) continue;
		if (status === "open") disputedTaskIds.add(taskId);
		if (status === "resolved_upheld") overturnedTaskIds.add(taskId);
	}

	const mySubmissions: TaskSubmission[] = rawMySubmissions.map((s) => ({
		...s,
		has_dispute: disputedTaskIds.has(s.task_id),
		is_overturned: overturnedTaskIds.has(s.task_id),
	}));

	const submittedTasks: Task[] = (submittedTasksData as Task[] | null) ?? [];

	const disputedSubmissionIds = new Set<number>();
	for (const row of (pendingEarningDisputesData ?? []) as any[]) {
		const sid = row.submission_id as number | null;
		if (sid != null) disputedSubmissionIds.add(sid);
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

