const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import HomeFeedClient from "@/components/HomeFeedClient";

export const metadata: Metadata = {
  description:
    "Browse active tasks on Bountask and find work you can complete for cash payouts.",
};

const PAGE_SIZE = 12;

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const seed = Math.floor(Math.random() * 1_000_000_000);

  const { data, error } = await supabase.rpc("tasks_feed", {
    p_user_id: user?.id ?? null,
    p_cursor_rnd: null,
    p_cursor_id: null,
    p_page_size: PAGE_SIZE,
    p_search: null,
    p_seed: seed,
  });

  if (error) {
    console.error("Error fetching tasks for home feed via RPC", error);
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

  return (
    <HomeFeedClient
      listings={listings}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
      initialSeed={seed}
    />
  );
}
