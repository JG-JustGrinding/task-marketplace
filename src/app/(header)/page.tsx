import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import HomeFeedClient from "@/components/HomeFeedClient";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If the user is logged in, fetch the tasks they have already activated
  // so we can exclude them from the public feed.
  let activatedTaskIds = new Set<number>();

  if (user) {
    const { data: activations, error: activationsError } = await supabase
      .from("task_activations")
      .select("task_id")
      .eq("user_id", user.id);

    if (activationsError) {
      console.error("Error fetching user task activations", activationsError);
    }

    if (activations) {
      activatedTaskIds = new Set(
        activations
          .map((row: any) => row.task_id)
          .filter((id: unknown): id is number => typeof id === "number"),
      );
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, user_id, title, categories, short_description, price, status, created_at",
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks for home feed", error);
  }

  const listings: Listing[] = (data ?? [])
    // Exclude tasks created by the current user and tasks they have activated.
    .filter((task: any) => {
      if (user && task.user_id === user.id) return false;
      if (user && activatedTaskIds.has(task.id)) return false;
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

  return <HomeFeedClient listings={listings} />;
}
