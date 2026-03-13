import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingSubmissionsClient from "@/components/ListingSubmissionsClient";
import TaskActivationsClient from "@/components/TaskActivationsClient";

type TaskRow = {
    id: number;
    user_id: string;
    title: string | null;
    status: string | null;
};

type ActivationRow = {
    id: number;
    user_id: string;
    status: string | null;
    created_at: string;
    last_check_in_at?: string | null;
    check_in_requested_at?: string | null;
};

type ProfileRow = {
    id: string;
    username: string | null;
};

type PageParams = {
    params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
    title: "Task submissions",
    description:
        "Review submissions and activations for your Bountask listing",
    robots: {
        index: false,
        follow: false,
    },
};

export default async function ListingSubmissionsPage({ params }: PageParams) {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return notFound();
    }

    const supabase = await createClient();

    const [
        {
            data: { user },
        },
        { data: task, error: taskError },
        { data: activationsData },
    ] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from("tasks")
            .select("id, user_id, title, status")
            .eq("id", numericId)
            .single<TaskRow>(),
        supabase
            .from("task_activations")
            .select(
                "id, user_id, status, created_at, last_check_in_at, check_in_requested_at",
            )
            .eq("task_id", numericId)
            .order("created_at", { ascending: false }),
    ]);

    if (!user || taskError || !task) {
        return notFound();
    }

    const isPoster = task.user_id === user.id;

    if (!isPoster) {
        return notFound();
    }

    const activations = (activationsData ?? []) as ActivationRow[];

    const userIds = Array.from(new Set(activations.map((a) => a.user_id))).filter(
        Boolean,
    );

    let profilesById = new Map<string, ProfileRow>();
    let hasSubmissionByUser = new Map<string, boolean>();
    if (userIds.length > 0) {
        const [{ data: profilesData }, { data: submissionsData }] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, username")
                .in("id", userIds as string[]),
            supabase
                .from("task_submissions")
                .select("user_id")
                .eq("task_id", task.id)
                .in("user_id", userIds as string[]),
        ]);

        (profilesData ?? []).forEach((p) => {
            profilesById.set(p.id, p as ProfileRow);
        });

        (submissionsData ?? []).forEach((row) => {
            const uid = (row as { user_id: string }).user_id;
            hasSubmissionByUser.set(uid, true);
        });
    }

    const filteredActivations = activations.filter(
        (a) => !hasSubmissionByUser.get(a.user_id),
    );

    const serializedActivations = filteredActivations.map((a) => ({
        id: a.id,
        userId: a.user_id,
        username: profilesById.get(a.user_id)?.username ?? null,
        createdAt: a.created_at,
        lastCheckInAt: a.last_check_in_at ?? null,
        checkInRequestedAt: a.check_in_requested_at ?? null,
        status: a.status,
        hasSubmission: hasSubmissionByUser.get(a.user_id) ?? false,
    }));
    
    let initialSubmissions: unknown[] = [];
    try {
		const headersList = await headers();
        const host = headersList.get("host");
        if (host) {
            const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
            const baseUrl = `${protocol}://${host}`;
            const res = await fetch(
                `${baseUrl}/api/tasks/${numericId}/submissions`,
                {
                    headers: {
                        cookie: headersList.get("cookie") ?? "",
                    },
                    cache: "no-store",
                },
            );
            if (res.ok) {
                const body = await res.json().catch(() => null);
                if (body && Array.isArray((body as any).submissions)) {
                    initialSubmissions = (body as any).submissions;
                }
            }
        }
    } catch (error) {
        console.error("Error preloading submissions for listing page", error);
    }

    return (
        <>
            <ListingSubmissionsClient
                listingId={task.id}
                listingTitle={task.title}
                isTaskAccepted={task.status === "task_accepted"}
				initialSubmissions={initialSubmissions as any}
            />
            <TaskActivationsClient
                taskId={task.id}
                taskTitle={task.title ?? `Listing #${task.id}`}
                currentUserId={user.id}
                isPoster={isPoster}
                activations={serializedActivations}
                variant="embedded"
            />
        </>
    );
}
