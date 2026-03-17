import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Use the admin client so we don't rely on update policies
    // on the profiles table for this system-level field.
    const admin = createAdminClient();

    const { error } = await admin
      .from("profiles")
      .update({ notifications_last_opened_at: now })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating notifications_last_opened_at", error);
      return NextResponse.json(
        { error: "Failed to update notification last opened timestamp" },
        { status: 500 },
      );
    }

    return NextResponse.json({ lastOpenedAt: now });
  } catch (err) {
    console.error("Unexpected error in notifications mark-opened POST", err);
    return NextResponse.json(
      { error: "Failed to update notification last opened timestamp" },
      { status: 500 },
    );
  }
}
