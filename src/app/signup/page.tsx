
import type { Metadata } from "next";
import SignupClient from "./SignupClient";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    redirect("/");
  }
  return <SignupClient />;
}

export const metadata: Metadata = {
	title: "Sign Up",
	description:
		"Create your Bountask account to post tasks, complete tasks, and get paid.",
	robots: {
		index: false,
		follow: false,
	},
};