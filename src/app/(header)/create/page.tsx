import type { Metadata } from "next";
import CreateTaskClient from "./CreateTaskClient";

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
	const { payment } = await searchParams;
	const rawPayment = payment;
	const paymentStatus: "success" | "cancel" | null =
		rawPayment === "success" || rawPayment === "cancel" ? rawPayment : null;

	return <CreateTaskClient paymentStatus={paymentStatus} />;
}

