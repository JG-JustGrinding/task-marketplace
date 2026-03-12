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

		const { data: tasksData, error: tasksError } = await supabase
			.from("tasks")
			.select(
				"id, title, short_description, price, categories, status, created_at",
			)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.range(rangeFrom, rangeTo);

		if (tasksError) {
			console.error("Error loading created tasks page for hub", tasksError);
			return NextResponse.json(
				{ error: "Failed to load created tasks." },
				{ status: 500 },
			);
		}

		const rows = (tasksData ?? []) as Array<{
			id: number;
			title: string;
			short_description: string | null;
			price: number;
			categories: string[] | null;
			status?: string | null;
			created_at: string;
		}>;

		const hasMore = rows.length > pageSize;
		const pageTasks = rows.slice(0, pageSize);

		if (pageTasks.length === 0) {
			return NextResponse.json({ tasks: [], submissions: [], hasMore: false });
		}

		const createdTaskIds = pageTasks.map((t) => t.id);

		// Open disputes for tasks this user created.
		const { data: creatorDisputesData } = await supabase
			.from("task_submission_disputes")
			.select("task_id, status")
			.eq("creator_id", user.id)
			.eq("status", "open")
			.in("task_id", createdTaskIds);

		const openDisputedTaskIds = new Set<number>();
		for (const row of (creatorDisputesData ?? []) as any[]) {
			const taskId = row.task_id as number | null;
			if (taskId != null) openDisputedTaskIds.add(taskId);
		}

		const tasks = pageTasks.map((task) => ({
			...task,
			has_dispute: openDisputedTaskIds.has(task.id),
		}));

		// Submissions for these created tasks.
		const { data: createdSubmissionsData, error: submissionsError } =
			await supabase
				.from("task_submissions")
				.select("id, task_id, status, created_at")
				.in("task_id", createdTaskIds);

		if (submissionsError) {
			console.error(
				"Error loading created task submissions page for hub",
				submissionsError,
			);
		}

		const submissions = (createdSubmissionsData ?? []) as Array<{
			id: number;
			task_id: number;
			status: string | null;
			created_at: string;
		}>;

		return NextResponse.json({ tasks, submissions, hasMore });
	} catch (error) {
		console.error("Error in GET /api/account/hub/created-tasks", error);
		return NextResponse.json(
			{ error: "Unexpected error loading created tasks." },
			{ status: 500 },
		);
	}
}
