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

		// Request one extra row via RPC so we can determine if another page exists.
		const rpcLimit = pageSize + 1;
		const { data: tasksData, error: tasksError } = await supabase.rpc(
			"hub_created_tasks",
			{
				_creator_id: user.id,
				_limit: rpcLimit,
				_offset: offset,
			},
		);

		if (tasksError) {
			console.error("Error loading created tasks page for hub via hub_created_tasks RPC", tasksError);
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
			has_dispute?: boolean | null;
		}>;

		const hasMore = rows.length > pageSize;
		const pageTasks = hasMore ? rows.slice(0, pageSize) : rows;

		if (pageTasks.length === 0) {
			return NextResponse.json({ tasks: [], submissions: [], hasMore: false });
		}

		const createdTaskIds = pageTasks.map((t) => t.id);

		// The RPC already includes has_dispute, but we keep the mapping step for a stable shape.
		const tasks = pageTasks.map((task) => ({
			...task,
			has_dispute: Boolean(task.has_dispute),
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
