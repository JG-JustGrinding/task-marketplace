import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
	title: "Log in",
	description:
		"Log in to your Bountask account to post tasks, complete work, and track your earnings.",
	robots: {
		index: false,
		follow: false,
	},
};

export default function LoginPage() {
	return <LoginClient />;
}

