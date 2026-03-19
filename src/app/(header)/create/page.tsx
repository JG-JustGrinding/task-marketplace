import type { Metadata } from "next";
import CreateTaskClient from "./CreateTaskClient";
import { createClient } from "@/lib/supabase/server";
import { isPremiumActive } from "@/lib/premium";

export const metadata: Metadata = {
	title: "Create a Task",
	description:
		"Create a new task on Bountask with details, requirements, references, and the payout amount for completion.",
	robots: {
		index: false,
		follow: false,
	},
};

type CreatePageProps = {
	searchParams: Promise<{ payment?: string }>;
};

export default async function CreateTaskPage({ searchParams }: CreatePageProps) {
	const resolved = await searchParams;
	const rawPayment = resolved.payment;
	const paymentStatus: "success" | "cancel" | null =
		rawPayment === "success" || rawPayment === "cancel" ? rawPayment : null;

	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	let creatorProActive = false;

	if (user) {
		const { data: profile } = await supabase
			.from("profiles")
			.select("creator_pro_active, creator_pro_expires_at")
			.eq("id", user.id)
			.maybeSingle();

		const activeFlag = (profile as any)?.creator_pro_active as
			| boolean
			| null
			| undefined;
		const expiresAt = (profile as any)?.creator_pro_expires_at as
			| string
			| Date
			| null
			| undefined;

		creatorProActive = isPremiumActive(activeFlag, expiresAt ?? null);
	}

	return (
		<CreateTaskClient
			paymentStatus={paymentStatus}
			creatorProActive={creatorProActive}
		/>
	);
}

