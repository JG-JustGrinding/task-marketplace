import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "@/components/AccountClient";

export const metadata: Metadata = {
  title: "Account Settings",
  description:
    "Manage your Bountask account details, subscription, and email settings.",
  robots: {
    index: false,
    follow: false,
  },
};

interface AccountPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const resolved = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "username, allow_important_emails, allow_promotional_emails, allow_activity_emails, creator_pro_active, creator_pro_expires_at, creator_pro_subscription_id, earner_pro_active, earner_pro_expires_at, earner_pro_subscription_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const username = profile?.username || "";

  const allowImportantEmails =
    (profile as any)?.allow_important_emails ?? true;
  const allowPromotionalEmails =
    (profile as any)?.allow_promotional_emails ?? false;
  const allowActivityEmails =
    (profile as any)?.allow_activity_emails ?? true;

  const creatorProActive = (profile as any)?.creator_pro_active === true;
  const creatorProExpiresAt = (profile as any)?.creator_pro_expires_at as string | null | undefined;
  const creatorProSubscriptionId = (profile as any)?.creator_pro_subscription_id as string | null | undefined;
  const earnerProActive = (profile as any)?.earner_pro_active === true;
  const earnerProExpiresAt = (profile as any)?.earner_pro_expires_at as string | null | undefined;
  const earnerProSubscriptionId = (profile as any)?.earner_pro_subscription_id as string | null | undefined;

  const rawTab = resolved.tab;
  const normalizedTab = typeof rawTab === "string" ? rawTab.toLowerCase() : "";

  let initialTab: "My Profile" | "Settings" | "Subscription" | "Sign Out" | undefined;

  if (normalizedTab === "settings") {
    initialTab = "Settings";
  } else if (normalizedTab === "subscription") {
    initialTab = "Subscription";
  } else if (normalizedTab === "sign out" || normalizedTab === "signout") {
    initialTab = "Sign Out";
  } else if (normalizedTab === "my profile" || normalizedTab === "profile") {
    initialTab = "My Profile";
  }

  return (
    <AccountClient
      username={username}
      email={email}
      userId={user.id}
      allowImportantEmails={allowImportantEmails}
      allowPromotionalEmails={allowPromotionalEmails}
      allowActivityEmails={allowActivityEmails}
      creatorProActive={creatorProActive}
      creatorProExpiresAt={creatorProExpiresAt ?? null}
      earnerProActive={earnerProActive}
      earnerProExpiresAt={earnerProExpiresAt ?? null}
      creatorProSubscriptionId={creatorProSubscriptionId ?? null}
      earnerProSubscriptionId={earnerProSubscriptionId ?? null}
      initialTab={initialTab}
    />
  );
}