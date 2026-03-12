import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
	try {
		const supabase = await createClient();

		const {
			data: { user },
			error: userError,
		} = await supabase.auth.getUser();

		if (!user || userError) {
			return NextResponse.json(
				{ error: "Not authenticated." },
				{ status: 401 },
			);
		}

		const url = new URL(req.url);
		const offsetParam = url.searchParams.get("offset");
		const limitParam = url.searchParams.get("limit");

		const offsetRaw = Number(offsetParam ?? "0");
		const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

		const limitRaw = Number(limitParam ?? "");
		const pageSizeBase = Number.isFinite(limitRaw) && limitRaw > 0
			? limitRaw
			: DEFAULT_PAGE_SIZE;
		const pageSize = Math.min(pageSizeBase, MAX_PAGE_SIZE);

		// Request one extra row so we can determine if another page exists.
		const rangeFrom = offset;
		const rangeTo = offset + pageSize;

		const { data: activationsData, error: activationsError } = await supabase
			.from("task_activations")
			.select(
				"id, task_id, status, created_at, is_hidden, resubmission_message, check_in_requested_at",
			)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.range(rangeFrom, rangeTo);

		if (activationsError) {
			console.error(
				"Error loading started task activations page for hub",
				activationsError,
			);
			return NextResponse.json(
				{ error: "Failed to load started tasks." },
				{ status: 500 },
			);
		}

		const rawActivations = (activationsData ?? []) as Array<{
			id: number;
			task_id: number;
			status: string | null;
			created_at: string;
			is_hidden?: boolean | null;
			resubmission_message?: string | null;
			check_in_requested_at?: string | null;
		}>;

		const hasMore = rawActivations.length > pageSize;
		const pageActivations = rawActivations.slice(0, pageSize);

		if (pageActivations.length === 0) {
			return NextResponse.json({ submissions: [], tasks: [], hasMore: false });
		}

		const submittedTaskIds = pageActivations.map((s) => s.task_id);

		// Load basic task info for the tasks the user has started.
		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select("id, title, short_description, price, categories, created_at")
			.in("id", submittedTaskIds);

		if (tasksError) {
			console.error(
				"Error loading started tasks details page for hub",
				tasksError,
			);
		}

		// Disputes where this user is the worker.
		const { data: workerDisputesData } = await supabase
			.from("task_submission_disputes")
			.select("task_id, status")
			.eq("worker_id", user.id)
			.in("task_id", submittedTaskIds);

		const disputedTaskIds = new Set<number>();
		const overturnedTaskIds = new Set<number>();
		for (const row of (workerDisputesData ?? []) as any[]) {
			const taskId = row.task_id as number | null;
			const status = row.status as string | null;
			if (taskId == null) continue;
			if (status === "open") disputedTaskIds.add(taskId);
			if (status === "resolved_upheld") overturnedTaskIds.add(taskId);
		}

		const submissions = pageActivations.map((s) => ({
			...s,
			has_dispute: disputedTaskIds.has(s.task_id),
			is_overturned: overturnedTaskIds.has(s.task_id),
		}));

		const tasks = (tasksData ?? []) as Array<{
			id: number;
			title: string;
			short_description: string | null;
			price: number;
			categories: string[] | null;
			created_at: string;
		}>;

		return NextResponse.json({ submissions, tasks, hasMore });
	} catch (error) {
		console.error("Error in GET /api/account/hub/started-tasks", error);
		return NextResponse.json(
			{ error: "Unexpected error loading started tasks." },
			{ status: 500 },
		);
	}
}
