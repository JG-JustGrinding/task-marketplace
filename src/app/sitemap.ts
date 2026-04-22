import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAbsoluteSiteUrl } from "@/lib/siteUrl";

export const revalidate = 3600;

const PAGE_SIZE = 1000;

type TaskSitemapRow = {
  id: number;
};

type ProfileSitemapRow = {
  id: string;
};

async function fetchActiveTaskIds() {
  const supabase = createAdminClient();
  const rows: TaskSitemapRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("tasks")
      .select("id")
      .eq("status", "active")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data?.length) {
      break;
    }

    rows.push(...(data as TaskSitemapRow[]));

    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function fetchPublicProfileIds() {
  const supabase = createAdminClient();
  const rows: ProfileSitemapRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .not("username", "is", null)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error || !data?.length) {
      break;
    }

    rows.push(...(data as ProfileSitemapRow[]));

    if (data.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tasks, profiles] = await Promise.all([
    fetchActiveTaskIds(),
    fetchPublicProfileIds(),
  ]);

  return [
    {
      url: getAbsoluteSiteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: getAbsoluteSiteUrl("/premium"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getAbsoluteSiteUrl("/privacy"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: getAbsoluteSiteUrl("/terms"),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...tasks.map((task) => ({
      url: getAbsoluteSiteUrl(`/listing/${task.id}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...profiles.map((profile) => ({
      url: getAbsoluteSiteUrl(`/profile/${profile.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}