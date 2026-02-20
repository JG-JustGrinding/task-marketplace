import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type HideActivationBody = {
  activationId?: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HideActivationBody;
    const activationId = body.activationId;

    if (!activationId || !Number.isFinite(activationId)) {
      return NextResponse.json(
        { error: "A valid activationId is required." },
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
      .from("task_activations")
      .update({ is_hidden: true })
      .eq("id", activationId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to hide task activation. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error hiding task activation", error);
    return NextResponse.json(
      { error: "Failed to hide task activation" },
      { status: 500 },
    );
  }
}
