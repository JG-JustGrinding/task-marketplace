import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "@/components/AccountClient";

export const metadata: Metadata = {
  title: "Account settings",
  description:
    "Manage your Bountask account details, email, and security settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountPage() {
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
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const fallbackUsername = email ? email.split("@")[0] : "";
  const username = profile?.username || fallbackUsername || "User";

  return <AccountClient username={username} email={email} userId={user.id} />;
}