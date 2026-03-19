import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("task_collections")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching task collections", error);
      return NextResponse.json(
        { error: "Failed to fetch collections" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        collections: (data ?? []).map((row: any) => ({
          id: row.id as number,
          name: row.name as string,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in GET /api/tasks/collections", error);
    return NextResponse.json(
      { error: "Failed to fetch collections" },
      { status: 500 },
    );
  }
}
