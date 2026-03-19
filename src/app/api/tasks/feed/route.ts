import { NextResponse } from "next/server";
import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 12;
const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const rawQuery = url.searchParams.get("q") ?? "";
    const searchQuery = rawQuery.trim();
    const seedParam = url.searchParams.get("seed");
    const categoryParam = url.searchParams.get("category");

    const categoryFilter =
      categoryParam && categoryParam !== "All" ? categoryParam : null;

    const seed = seedParam ? Number(seedParam) : NaN;
    if (!Number.isFinite(seed)) {
      return NextResponse.json(
        { error: "Missing or invalid seed" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let cursorRnd: number | null = null;
    let cursorId: number | null = null;

    if (cursor) {
      const [rndStr, idStr] = cursor.split(":");
      const rnd = Number(rndStr);
      const id = Number(idStr);
      if (Number.isFinite(rnd) && Number.isFinite(id)) {
        cursorRnd = rnd;
        cursorId = id;
      }
    }

    const { data, error } = await supabase.rpc("tasks_feed", {
      p_user_id: user?.id ?? null,
      p_cursor_rnd: cursorRnd,
      p_cursor_id: cursorId,
      p_page_size: PAGE_SIZE,
      p_search: searchQuery || null,
      p_seed: seed,
      p_category: categoryFilter,
    });

    if (error) {
      console.error("Error fetching tasks for feed API via RPC", error);
    }

    const rows = (data ?? []) as Array<{
      id: number;
      user_id: string;
      title: string;
      categories: string[] | null;
      short_description: string | null;
      price: number;
      rnd: number;
    }>;

    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);
    const nextCursor =
      hasMore && pageRows.length > 0
        ? `${pageRows[pageRows.length - 1]!.rnd}:${pageRows[pageRows.length - 1]!.id}`
        : null;

    const admin = createAdminClient();
    const taskIds = pageRows.map((task) => task.id);
    const brandingMap = new Map<number, { logoUrl?: string; bannerUrl?: string }>();

    if (taskIds.length > 0) {
      const { data: brandingRows } = await admin
        .from("tasks")
        .select("id, logo_path, banner_path")
        .in("id", taskIds);

      await Promise.all(
        (brandingRows ?? []).map(async (row: any) => {
          const id = row.id as number;
          const logoPath = row.logo_path as string | null;
          const bannerPath = row.banner_path as string | null;

          let logoUrl: string | undefined;
          let bannerUrl: string | undefined;

          if (logoPath) {
            const { data: signedLogo } = await admin.storage
              .from(LOGO_BUCKET)
              .createSignedUrl(logoPath, 60 * 60);
            logoUrl = signedLogo?.signedUrl;
          }

          if (bannerPath) {
            const { data: signedBanner } = await admin.storage
              .from(BANNER_BUCKET)
              .createSignedUrl(bannerPath, 60 * 60);
            bannerUrl = signedBanner?.signedUrl;
          }

          if (logoUrl || bannerUrl) {
            brandingMap.set(id, { logoUrl, bannerUrl });
          }
        }),
      );
    }

    const listings: Listing[] = pageRows.map((task) => ({
      id: task.id,
      title: task.title,
      categories: task.categories ?? [],
      description: task.short_description ?? undefined,
      price: task.price,
      currency: "USD",
      logoUrl: brandingMap.get(task.id)?.logoUrl,
      bannerUrl: brandingMap.get(task.id)?.bannerUrl,
    }));

    return NextResponse.json({ listings, hasMore, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/tasks/feed", error);
    return NextResponse.json(
      { error: "Failed to fetch task feed" },
      { status: 500 },
    );
  }
}
