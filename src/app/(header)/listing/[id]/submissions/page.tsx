import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingSubmissionsClient from "@/components/ListingSubmissionsClient";

type TaskRow = {
    id: number;
    title: string | null;
};

export default async function ListingSubmissionsPage({
    params,
}: {
        params: Promise<{ id: string }>;
    }) {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return notFound();
    }

    const supabase = await createClient();
    const { data: task, error } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("id", numericId)
        .single<TaskRow>();

    if (error || !task) {
        return notFound();
    }

    return (
        <ListingSubmissionsClient
            listingId={task.id}
            listingTitle={task.title}
        />
    );
}
