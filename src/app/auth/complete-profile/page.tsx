import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UsernameOnboardingClient from "@/components/UsernameOnboardingClient";

export const metadata: Metadata = {
  title: "Complete your profile",
  description: "Choose your Bountask username to finish setting up your account.",
  robots: {
    index: false,
    follow: false,
  },
};

interface CompleteProfilePageProps {
  searchParams: Promise<{ redirect?: string; suggested?: string }>;
}

export default async function CompleteProfilePage({ searchParams }: CompleteProfilePageProps) {
  const resolved = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  const redirectParam = resolved.redirect ?? "/";
  const redirectPath =
    redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : "/";

  if (!user || error) {
    return redirect(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }

  const safeSuggested =
    typeof resolved.suggested === "string" && resolved.suggested.length <= 50
      ? resolved.suggested
      : undefined;

  let initialUsername = safeSuggested ?? "";

  if (!initialUsername) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const emailPrefix = user.email ? user.email.split("@")[0] : "";
    initialUsername = (profile?.username as string | null) || emailPrefix || "user";
  }

  return (
    <UsernameOnboardingClient
      initialUsername={initialUsername}
      redirectPath={redirectPath}
      email={user.email ?? ""}
    />
  );
}
