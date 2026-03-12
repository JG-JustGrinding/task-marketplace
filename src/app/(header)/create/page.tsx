import type { Metadata } from "next";
import CreateTaskClient from "./CreateTaskClient";

export const metadata: Metadata = {
	title: "Create a task",
	description:
		"Create a new task on Bountask with details, requirements, references, and pricing for workers.",
	robots: {
		index: false,
		follow: false,
	},
};

type CreatePageProps = {
	searchParams?: { payment?: string };
};

export default function CreateTaskPage({ searchParams }: CreatePageProps) {
	const rawPayment = searchParams?.payment;
	const paymentStatus: "success" | "cancel" | null =
		rawPayment === "success" || rawPayment === "cancel" ? rawPayment : null;

	return <CreateTaskClient paymentStatus={paymentStatus} />;
}

