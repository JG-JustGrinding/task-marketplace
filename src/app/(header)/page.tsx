export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import type { Listing } from "@/data/listings";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import HomeFeedClient from "@/components/HomeFeedClient";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  description:
    "Browse Bountask and help others with simple creative tasks that can be completed for cash payouts.",
};

const PAGE_SIZE = 12;
const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const seed = Math.floor(Math.random() * 1_000_000_000);

  const { data, error } = await supabase.rpc("tasks_feed", {
    p_user_id: user?.id ?? null,
    p_cursor_rnd: null,
    p_cursor_id: null,
    p_page_size: PAGE_SIZE,
    p_search: null,
    p_seed: seed,
  });

  if (error) {
    console.error("Error fetching tasks for home feed via RPC", error);
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

  return (
    <HomeFeedClient
      listings={listings}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
      initialSeed={seed}
    />
  );
}
