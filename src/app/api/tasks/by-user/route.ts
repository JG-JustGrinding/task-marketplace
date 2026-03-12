import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const cursor = url.searchParams.get("cursor");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = await createClient();

    let query = supabase
      .from("tasks")
      .select(
        "id, title, short_description, price, categories, status, created_at",
      )
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    const cursorId = cursor ? Number(cursor) : null;
    if (cursorId && Number.isFinite(cursorId)) {
      query = query.lt("id", cursorId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching tasks by user", error);
      return NextResponse.json(
        { error: "Failed to fetch user tasks" },
        { status: 500 },
      );
    }

    const rows = data ?? [];
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor =
      hasMore && page.length > 0 ? String(page[page.length - 1].id) : null;

    return NextResponse.json({ tasks: page, hasMore, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/tasks/by-user", error);
    return NextResponse.json(
      { error: "Failed to fetch user tasks" },
      { status: 500 },
    );
  }
}
