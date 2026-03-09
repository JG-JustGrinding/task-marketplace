const dynamic = "force-dynamic";

import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import HomeFeedClient from "@/components/HomeFeedClient";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let activatedTaskIds = new Set<number>();
  let takenTaskIds = new Set<number>();

  if (user) {
    const { data: activations, error: activationsError } = await supabase
      .from("task_activations")
      .select("task_id")
      .eq("user_id", user.id);

    if (activationsError) {
      console.error("Error fetching user task activations (search)", activationsError);
    }

    if (activations) {
      activatedTaskIds = new Set(
        activations
          .map((row: any) => row.task_id)
          .filter((id: unknown): id is number => typeof id === "number"),
      );
    }
  }

  const { data: activeActivations, error: activeActivationsError } = await supabase
    .from("task_activations")
    .select("task_id, status")
    .in("status", [
      "waiting_submission",
      "pending",
      "resubmission",
      "resubmission_requested",
    ]);

  if (activeActivationsError) {
    console.error("Error fetching active task activations (search)", activeActivationsError);
  }

  if (activeActivations) {
    takenTaskIds = new Set(
      activeActivations
        .map((row: any) => row.task_id)
        .filter((id: unknown): id is number => typeof id === "number"),
    );
  }

  const query = (resolvedSearchParams.q ?? "").trim();

  let queryBuilder = supabase
    .from("tasks")
    .select(
      "id, user_id, title, categories, short_description, price, status, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (query) {
    const pattern = `%${query}%`;
    queryBuilder = queryBuilder.or(
      `title.ilike.${pattern},short_description.ilike.${pattern}`,
    );
  }

  const { data, error } = await queryBuilder;

  if (error) {
    console.error("Error fetching tasks for search", error);
  }

  const listings: Listing[] = (data ?? [])
    .filter((task: any) => {
      if (user && task.user_id === user.id) return false;
      if (user && activatedTaskIds.has(task.id)) return false;
      if (takenTaskIds.has(task.id)) return false;
      return true;
    })
    .map((task: any) => ({
      id: task.id,
      title: task.title,
      categories: task.categories ?? [],
      description: task.short_description ?? undefined,
      price: task.price,
      currency: "USD",
    }));

  const initialSearch = query;

  return <HomeFeedClient listings={listings} initialSearch={initialSearch} />;
}
