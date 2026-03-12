const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import HomeFeedClient from "@/components/HomeFeedClient";

export const metadata: Metadata = {
  title: "Search tasks",
  description:
    "Search active tasks on Bountask by keywords and browse matching work opportunities.",
  robots: {
    index: false,
    follow: true,
  },
};

const PAGE_SIZE = 12;

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const query = (resolvedSearchParams.q ?? "").trim();
  const seed = Math.floor(Math.random() * 1_000_000_000);

  const { data, error } = await supabase.rpc("tasks_feed", {
    p_user_id: user?.id ?? null,
    p_cursor_rnd: null,
    p_cursor_id: null,
    p_page_size: PAGE_SIZE,
    p_search: query || null,
    p_seed: seed,
  });

  if (error) {
    console.error("Error fetching tasks for search via RPC", error);
  }

  const rows = (data ?? []) as Array<{
    id: number;
    user_id: string;
    title: string;
    categories: string[] | null;
    short_description: string | null;
    price: number;
    rnd: number;
  }>;

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = rows.slice(0, PAGE_SIZE);
  const nextCursor =
    hasMore && pageRows.length > 0
      ? `${pageRows[pageRows.length - 1]!.rnd}:${pageRows[pageRows.length - 1]!.id}`
      : null;

  const listings: Listing[] = pageRows.map((task) => ({
    id: task.id,
    title: task.title,
    categories: task.categories ?? [],
    description: task.short_description ?? undefined,
    price: task.price,
    currency: "USD",
  }));

  const initialSearch = query;

  return (
    <HomeFeedClient
      listings={listings}
      initialSearch={initialSearch}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
      initialSeed={seed}
    />
  );
}
