import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "@/components/ProfileClient";

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

  const userName = profile.username || "Marketplace user";
  const description = `View ${userName}'s profile on Bountask, including their posted tasks and activity.`;

  return {
    title: `${userName}'s profile`,
    description,
    openGraph: {
      title: `${userName}'s profile`,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `${userName}'s profile`,
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
        .select("id, username, created_at")
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

  const { data: createdTasksData } = await supabase
    .from("tasks")
    .select("id, title, short_description, price, categories, status, created_at")
    .eq("user_id", profile.id)
    .order("id", { ascending: false })
    .limit(TASKS_PAGE_SIZE + 1);

  const rawTasks: Task[] = createdTasksData ?? [];
  const hasMore = rawTasks.length > TASKS_PAGE_SIZE;
  const createdTasks: Task[] = hasMore
    ? rawTasks.slice(0, TASKS_PAGE_SIZE)
    : rawTasks;
  const nextCursor =
    hasMore && createdTasks.length > 0
      ? String(createdTasks[createdTasks.length - 1].id)
      : null;

  let memberSince: string | null = null;
  if (profile.created_at) {
    memberSince = new Date(profile.created_at).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }

  const userName = profile.username || "Marketplace user";

  return (
    <ProfileClient
      userId={profile.id}
      userName={userName}
      memberSince={memberSince}
      isCurrentUser={isCurrentUser}
      createdTasks={createdTasks}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
    />
  );
}

