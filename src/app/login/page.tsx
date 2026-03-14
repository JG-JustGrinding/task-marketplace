
import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    redirect("/");
  }
  return <LoginClient />;
}

export const metadata: Metadata = {
	title: "Log In",
	description:
		"Log in to your Bountask account to post tasks, complete tasks, and track your earnings.",
	robots: {
		index: false,
		follow: false,
	},
};