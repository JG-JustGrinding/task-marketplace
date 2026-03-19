import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAGE_SIZE = 12;
const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const cursor = url.searchParams.get("cursor");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id ?? null;

    const pageIndexRaw = cursor ? Number(cursor) : 0;
    const pageIndex = Number.isFinite(pageIndexRaw) && pageIndexRaw >= 0 ? pageIndexRaw : 0;
    const limit = PAGE_SIZE + 1;
    const offset = pageIndex * PAGE_SIZE;

    const { data, error } = await supabase.rpc("profile_tasks", {
      _profile_user_id: userId,
      _viewer_user_id: currentUserId,
      _limit: limit,
      _offset: offset,
    });

    if (error) {
      console.error("Error fetching tasks by user via profile_tasks RPC", error);
      return NextResponse.json(
        { error: "Failed to fetch user tasks" },
        { status: 500 },
      );
    }

    const rows = (data as any[] | null) ?? [];
    const hasMore = rows.length > PAGE_SIZE;
    const page = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
    const nextCursor = hasMore ? String(pageIndex + 1) : null;

    const admin = createAdminClient();
    const taskIds = page
      .map((row) => Number((row as any).id))
      .filter((id) => Number.isFinite(id));

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

    const enrichedPage = page.map((row) => {
      const id = Number((row as any).id);
      const branding = brandingMap.get(id);
      if (!branding) return row;

      return {
        ...row,
        logoUrl: branding.logoUrl,
        bannerUrl: branding.bannerUrl,
      };
    });

    return NextResponse.json({ tasks: enrichedPage, hasMore, nextCursor });
  } catch (error) {
    console.error("Error in GET /api/tasks/by-user", error);
    return NextResponse.json(
      { error: "Failed to fetch user tasks" },
      { status: 500 },
    );
  }
}
