import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const headerSecret = req.headers.get("x-admin-secret");

    if (!headerSecret || headerSecret !== process.env.ADMIN_PAGE_SECRET) {
      // Pretend this route does not exist instead of exposing an auth error.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json().catch(() => null)) as
      | {
          ids?: unknown;
        }
      | null;

    const ids = Array.isArray(body?.ids) ? body?.ids : [];

    const numericIds = ids
      .map((id) => {
        const n = typeof id === "string" ? Number(id) : (id as number);
        return Number.isFinite(n) ? Number(n) : null;
      })
      .filter((n) => n != null) as number[];

    if (!numericIds.length) {
      return NextResponse.json({ error: "No valid ids provided" }, { status: 400 });
    }

    const admin = createAdminClient();
    const claimedAt = new Date().toISOString();

    const { error } = await admin
      .from("platform_earnings")
      .update({ claimed_at: claimedAt })
      .in("id", numericIds);

    if (error) {
      console.error("Error marking platform_earnings as claimed", error);
      return NextResponse.json(
        { error: "Failed to mark earnings as claimed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, claimedAt });
  } catch (err) {
    console.error("Unexpected error in admin earnings claim route", err);
    return NextResponse.json(
      { error: "Unexpected error while marking claimed" },
      { status: 500 },
    );
  }
}
