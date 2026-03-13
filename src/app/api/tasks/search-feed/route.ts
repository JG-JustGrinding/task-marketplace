import { NextResponse } from "next/server";
import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursorParam = url.searchParams.get("cursor");
    const rawQuery = url.searchParams.get("q") ?? "";
    const searchQuery = rawQuery.trim();

    const offset = cursorParam ? Number(cursorParam) : 0;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const supabase = await createClient();

    // Base query: active tasks only
    let queryBuilder = supabase
      .from("tasks")
      .select("id, user_id, title, categories, short_description, price", { count: "exact" })
      .eq("status", "active");

    if (searchQuery) {
      // Use Postgres full-text search on the precomputed search_vector
      queryBuilder = queryBuilder.textSearch("search_vector", searchQuery, {
        type: "websearch",
      });
    }

    const { data, error } = await queryBuilder
      .order("id", { ascending: false })
      // Fetch one extra row to know if there is another page
      .range(safeOffset, safeOffset + PAGE_SIZE);

    if (error) {
      console.error("Error fetching tasks for search-feed API via textSearch", error);
      return NextResponse.json(
        { error: "Failed to fetch search results" },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as Array<{
      id: number;
      user_id: string;
      title: string;
      categories: string[] | null;
      short_description: string | null;
      price: number;
    }>;

    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);

    const nextCursor = hasMore ? String(safeOffset + PAGE_SIZE) : null;

    const listings: Listing[] = pageRows.map((task) => ({
      id: task.id,
      title: task.title,
      categories: task.categories ?? [],
      description: task.short_description ?? undefined,
      price: task.price,
      currency: "USD",
    }));

    return NextResponse.json({ listings, hasMore, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/tasks/search-feed", error);
    return NextResponse.json(
      { error: "Failed to fetch search results" },
      { status: 500 },
    );
  }
}
