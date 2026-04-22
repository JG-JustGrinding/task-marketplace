import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ProfileClient from "@/components/ProfileClient";
import { isPremiumActive } from "@/lib/premium";

type ProfileRow = {
  id: string;
  username: string | null;
  created_at?: string | null;
};

const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";

type Task = {
  id: number;
  title: string;
  short_description: string | null;
  price: number;
  categories: string[] | null;
  status?: string | null;
  created_at: string;
  is_taken?: boolean;
  has_started_for_viewer?: boolean;
};

interface ProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

const TASKS_PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", id)
    .single<ProfileRow>();

  if (error || !profile) {
    return {
      title: "Profile not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const userName = profile.username || "Bountask User";
  const description = `View ${userName}'s profile on Bountask, including their posted tasks and activity.`;

  return {
    title: `${userName}'s Profile`,
    description,
    openGraph: {
      title: `${userName}'s Profile`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${userName}'s Profile`,
      description,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const [{ data: authData }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from("profiles")
        .select("id, username, creator_pro_active, creator_pro_expires_at, earner_pro_active, earner_pro_expires_at, created_at")
        .eq("id", id)
        .single(),
    ]);

  if (profileError) {
    // If the profile doesn't exist, show a 404
    if ((profileError as any).code === "PGRST116") {
      notFound();
    }

    // For other errors, also fail with 404 for now
    notFound();
  }

  if (!profile) {
    notFound();
  }

  const currentUserId = authData?.user?.id ?? null;
  const isCurrentUser = !!currentUserId && currentUserId === profile.id;

  const creatorProActive = isPremiumActive(
    (profile as any).creator_pro_active,
    (profile as any).creator_pro_expires_at,
  );

  const earnerProActive = isPremiumActive(
    (profile as any).earner_pro_active,
    (profile as any).earner_pro_expires_at,
  );

  const [{ data: createdTasksData }, { count: totalCreatedTasksCount }] =
    await Promise.all([
      supabase.rpc("profile_tasks", {
        _profile_user_id: profile.id,
        _viewer_user_id: currentUserId,
        _limit: TASKS_PAGE_SIZE + 1,
        _offset: 0,
      }),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
    ] as const);

  const rows = (createdTasksData as Task[] | null) ?? [];
  const hasMore = rows.length > TASKS_PAGE_SIZE;
  const createdTasks: Task[] = hasMore
    ? rows.slice(0, TASKS_PAGE_SIZE)
    : rows;
  const nextCursor = hasMore ? "1" : null;

  const admin = createAdminClient();
  const taskIds = createdTasks
    .map((task) => Number(task.id))
    .filter((taskId) => Number.isFinite(taskId));

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

  const enrichedCreatedTasks = createdTasks.map((task) => {
    const branding = brandingMap.get(task.id);
    if (!branding) return task;

    return {
      ...task,
      logoUrl: branding.logoUrl,
      bannerUrl: branding.bannerUrl,
    };
  });

  let memberSince: string | null = null;
  if (profile.created_at) {
    memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  const userName = profile.username || "Bountask User";

  return (
    <ProfileClient
      userId={profile.id}
      userName={userName}
      memberSince={memberSince}
      isCurrentUser={isCurrentUser}
      createdTasks={enrichedCreatedTasks}
      totalCreatedCount={totalCreatedTasksCount ?? createdTasks.length}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
      creatorProActive={creatorProActive}
      earnerProActive={earnerProActive}
    />
  );
}

