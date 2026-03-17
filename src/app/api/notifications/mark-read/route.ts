import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MarkReadBody = {
  id?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as MarkReadBody;
    const id = body.id;

    if (!id) {
      return NextResponse.json(
        { error: "A notification id is required" },
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

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error marking notification as read", error);
      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unexpected error in notifications mark-read POST", err);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 },
    );
  }
}
