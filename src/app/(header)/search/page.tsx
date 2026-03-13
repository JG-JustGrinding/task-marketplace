export const dynamic = "force-dynamic";

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
  const query = (resolvedSearchParams.q ?? "").trim();
  const seed = Math.floor(Math.random() * 1_000_000_000);

  // Use Supabase full-text search on the search_vector column for search results
  let queryBuilder = supabase
    .from("tasks")
    .select("id, user_id, title, categories, short_description, price")
    .eq("status", "active");

  if (query) {
    queryBuilder = queryBuilder.textSearch("search_vector", query, {
      type: "websearch",
    });
  }

  const { data, error } = await queryBuilder
    .order("id", { ascending: false })
    // Fetch one extra item so the client can know if there is another page
    .range(0, PAGE_SIZE);

  if (error) {
    console.error("Error fetching tasks for search via textSearch", error);
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
  const nextCursor = hasMore ? String(PAGE_SIZE) : null;

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
