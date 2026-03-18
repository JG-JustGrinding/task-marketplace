import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";
import { isPremiumActive } from "@/lib/premium";

type ProfileRow = {
  id: string;
  username: string | null;
  created_at?: string | null;
};

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

  const userName = profile.username || "Marketplace User";
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

  let memberSince: string | null = null;
  if (profile.created_at) {
    memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  const userName = profile.username || "Marketplace User";

  return (
    <ProfileClient
      userId={profile.id}
      userName={userName}
      memberSince={memberSince}
      isCurrentUser={isCurrentUser}
      createdTasks={createdTasks}
      totalCreatedCount={totalCreatedTasksCount ?? createdTasks.length}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
      creatorProActive={creatorProActive}
      earnerProActive={earnerProActive}
    />
  );
}

