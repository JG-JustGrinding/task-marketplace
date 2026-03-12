import type { Metadata } from "next";
import SignupClient from "./SignupClient";

export const metadata: Metadata = {
	title: "Sign up",
	description:
		"Create your Bountask account to post tasks, complete work, and get paid.",
	robots: {
		index: false,
		follow: false,
	},
};

export default function SignupPage() {
	return <SignupClient />;
}

