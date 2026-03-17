import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    let limit = Number(limitParam ?? "20");
    if (!Number.isFinite(limit) || limit < 0) limit = 20;
    if (limit > 100) limit = 100;

    // Fetch the last time the user opened the notification panel.
    const { data: profileData } = await supabase
      .from("profiles")
      .select("notifications_last_opened_at")
      .eq("id", user.id)
      .maybeSingle();

    const lastOpenedAt =
      ((profileData as any)?.notifications_last_opened_at as string | null) ?? null;

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error loading notifications", error);
      return NextResponse.json(
        { error: "Failed to load notifications" },
        { status: 500 },
      );
    }

    // Unread = created after the last time the panel was opened.
    // If it has never been opened, every notification counts as unread.
    let unreadCount = 0;
    if (lastOpenedAt) {
      const { count, error: countError } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gt("created_at", lastOpenedAt);

      if (countError) {
        console.error("Error counting unread notifications", countError);
      } else {
        unreadCount = count ?? 0;
      }
    } else {
      const { count, error: countError } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) {
        console.error("Error counting all notifications as unread", countError);
      } else {
        unreadCount = count ?? 0;
      }
    }

    return NextResponse.json({
      notifications: notifications ?? [],
      unreadCount,
      lastOpenedAt,
    });
  } catch (err) {
    console.error("Unexpected error in notifications GET", err);
    return NextResponse.json(
      { error: "Failed to load notifications" },
      { status: 500 },
    );
  }
}
