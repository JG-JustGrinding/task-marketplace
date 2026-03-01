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

	// Load individual pending earnings so the dashboard can show a detailed list.
	const { data: pendingEarningsData } = await supabase
		.from("task_earnings")
		.select("id, task_id, submission_id, amount_cents, available_at, tasks(title)")
		.eq("submitter_id", user.id)
		.eq("status", "pending")
		.order("available_at", { ascending: true });

	const pendingEarnings = (pendingEarningsData ?? []).map((row: any) => ({
		id: row.id as number,
		taskId: row.task_id as number,
		submissionId: row.submission_id as number,
		amountCents: Number(row.amount_cents ?? 0),
		availableAt: row.available_at as string,
		taskTitle:
			(row as any)?.tasks?.title ||
			`Task #${row.task_id}`,
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

