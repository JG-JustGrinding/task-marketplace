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
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id ?? null;

    const pageIndexRaw = cursor ? Number(cursor) : 0;
    const pageIndex = Number.isFinite(pageIndexRaw) && pageIndexRaw >= 0 ? pageIndexRaw : 0;
    const limit = PAGE_SIZE + 1;
    const offset = pageIndex * PAGE_SIZE;

    const { data, error } = await supabase.rpc("profile_tasks", {
      _profile_user_id: userId,
      _viewer_user_id: currentUserId,
      _limit: limit,
      _offset: offset,
    });

    if (error) {
      console.error("Error fetching tasks by user via profile_tasks RPC", error);
      return NextResponse.json(
        { error: "Failed to fetch user tasks" },
        { status: 500 },
      );
    }

    const rows = (data as any[] | null) ?? [];
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor = hasMore ? String(pageIndex + 1) : null;

    return NextResponse.json({ tasks: page, hasMore, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/tasks/by-user", error);
    return NextResponse.json(
      { error: "Failed to fetch user tasks" },
      { status: 500 },
    );
  }
}
