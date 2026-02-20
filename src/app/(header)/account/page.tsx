import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "@/components/AccountClient";

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