import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";

interface Body {
  collectionId?: number | null;
  name?: string | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    let { collectionId, name } = body;

    if (typeof collectionId === "string") {
      const parsed = Number(collectionId);
      collectionId = Number.isFinite(parsed) ? parsed : undefined;
    }

    if (name != null) {
      name = name.trim();
      if (name === "") {
        name = null;
      }
    }

    if (typeof collectionId === "undefined" && !name) {
      return NextResponse.json(
        { error: "Either collectionId or name is required" },
        { status: 400 },
      );
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, collection_id")
      .eq("id", numericId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if ((task as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to modify this task." },
        { status: 403 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("creator_pro_active, creator_pro_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile for collections", profileError);
    }

    const hasCreatorPro = profile
      ? isPremiumActive(
          (profile as any).creator_pro_active,
          (profile as any).creator_pro_expires_at,
        )
      : false;

    if (!hasCreatorPro) {
      return NextResponse.json(
        { error: "Creator Pro is required to manage task collections." },
        { status: 403 },
      );
    }

    const oldCollectionId = (task as any).collection_id as number | null;

    // Removing from any collection
    if (collectionId === null && !name) {
      if (oldCollectionId == null) {
        return NextResponse.json({ collection: null }, { status: 200 });
      }

      const { error: updateError } = await supabase
        .from("tasks")
        .update({ collection_id: null })
        .eq("id", numericId);

      if (updateError) {
        console.error("Error removing task from collection", updateError);
        return NextResponse.json(
          { error: "Failed to update task collection" },
          { status: 500 },
        );
      }

      if (oldCollectionId != null) {
        const { count: remainingCount } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("collection_id", oldCollectionId);

        if ((remainingCount ?? 0) === 0) {
          const { error: deleteError } = await supabase
            .from("task_collections")
            .delete()
            .eq("id", oldCollectionId)
            .eq("user_id", user.id);

          if (deleteError) {
            console.error(
              "Error deleting empty task collection after removal",
              deleteError,
            );
          }
        }
      }

      return NextResponse.json({ collection: null }, { status: 200 });
    }

    // Ensure we have a target collection id
    let targetCollectionId: number | null =
      typeof collectionId === "number" && Number.isFinite(collectionId)
        ? collectionId
        : null;
    let targetCollectionName: string | null = null;

    if (targetCollectionId != null) {
      const { data: existingCollection, error: collectionError } = await supabase
        .from("task_collections")
        .select("id, user_id, name")
        .eq("id", targetCollectionId)
        .maybeSingle();

      if (collectionError) {
        console.error("Error loading target collection", collectionError);
      }

      if (!existingCollection || (existingCollection as any).user_id !== user.id) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 },
        );
      }

      targetCollectionName = (existingCollection as any).name as string | null;
    } else if (name) {
      // Find or create collection by name for this user, enforcing a max
      // of 5 collections per creator.
      const { data: existingByName, error: existingByNameError } = await supabase
        .from("task_collections")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("name", name)
        .maybeSingle();

      if (existingByNameError) {
        console.error(
          "Error checking existing task collection by name",
          existingByNameError,
        );
      }

      if (existingByName) {
        targetCollectionId = (existingByName as any).id as number;
        targetCollectionName = (existingByName as any).name as string | null;
      } else {
        const { count: existingCollectionsCount } = await supabase
          .from("task_collections")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if ((existingCollectionsCount ?? 0) >= 5) {
          return NextResponse.json(
            {
              error:
                "You can create up to 5 collections. Delete or reuse an existing collection before creating a new one.",
            },
            { status: 400 },
          );
        }

        const { data: inserted, error: insertError } = await supabase
          .from("task_collections")
          .insert({ user_id: user.id, name })
          .select("id, name")
          .single();

        if (insertError || !inserted) {
          console.error("Error creating task collection", insertError);
          return NextResponse.json(
            { error: "Failed to create collection" },
            { status: 500 },
          );
        }

        targetCollectionId = (inserted as any).id as number;
        targetCollectionName = (inserted as any).name as string | null;
      }
    }

    if (targetCollectionId == null) {
      return NextResponse.json(
        { error: "Could not resolve target collection" },
        { status: 400 },
      );
    }

    if (oldCollectionId === targetCollectionId) {
      return NextResponse.json(
        {
          collection: {
            id: targetCollectionId,
            name: targetCollectionName,
          },
        },
        { status: 200 },
      );
    }

    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("collection_id", targetCollectionId);

    const existingCount = count ?? 0;

    if (existingCount >= 5) {
      return NextResponse.json(
        { error: "This collection already has the maximum of 5 tasks." },
        { status: 400 },
      );
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ collection_id: targetCollectionId })
      .eq("id", numericId);

    if (updateError) {
      console.error("Error assigning task to collection", updateError);
      return NextResponse.json(
        { error: "Failed to update task collection" },
        { status: 500 },
      );
    }

    if (oldCollectionId != null && oldCollectionId !== targetCollectionId) {
      const { count: remainingCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("collection_id", oldCollectionId);

      if ((remainingCount ?? 0) === 0) {
        const { error: deleteError } = await supabase
          .from("task_collections")
          .delete()
          .eq("id", oldCollectionId)
          .eq("user_id", user.id);

        if (deleteError) {
          console.error(
            "Error deleting empty task collection after reassignment",
            deleteError,
          );
        }
      }
    }

    return NextResponse.json(
      {
        collection: {
          id: targetCollectionId,
          name: targetCollectionName,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error in POST /api/tasks/[id]/collection", error);
    return NextResponse.json(
      { error: "Failed to update task collection" },
      { status: 500 },
    );
  }
}
