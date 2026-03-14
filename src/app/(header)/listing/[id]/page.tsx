import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type Listing } from "@/data/listings";
import ListingClient from "@/components/ListingClient";

type ReferenceType = "link" | "image";

type ReferenceItem = {
    type: ReferenceType;
    url: string;
};

type TaskRow = {
    id: number;
    user_id: string;
    title: string;
    categories: string[] | null;
    short_description: string | null;
    need_details: string | null;
    technical_requirements: string | null;
    references: ReferenceItem[] | null;
    price: number;
    status: string | null;
};

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const { id } = await params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
        return {
            title: "Task not found",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("tasks")
        .select("title, short_description, references")
        .eq("id", numericId)
        .single<TaskRow>();

    if (error || !data) {
        return {
            title: "Task not found",
            robots: {
                index: false,
                follow: false,
            },
        };
    }

    const refs = (data.references ?? []) as ReferenceItem[];
    const imageUrls = refs
        .filter((ref) => ref.type === "image" && ref.url)
        .map((ref) => ref.url);

    const title = data.title || `Task #${numericId}`;
    const description =
        data.short_description ||
        "View full task details, requirements, and payout information on Bountask.";

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "article",
            images: imageUrls.length
                ? imageUrls.map((url) => ({ url }))
                : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
    };
}

export default async function ListingPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { id } = await params;
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) {
        return notFound();
    }

    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("tasks")
        .select(
            "id, user_id, title, categories, short_description, need_details, technical_requirements, references, price, status",
        )
        .eq("id", numericId)
        .single<TaskRow>();

    let listing: Listing | null = null;

    const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("id", data?.user_id)
        .single();

    if (!error && data) {
        const refs = (data.references ?? []) as ReferenceItem[];
        const imageUrls = refs
            .filter((ref) => ref.type === "image" && ref.url)
            .map((ref) => ref.url);
        const linkUrls = refs
            .filter((ref) => ref.type === "link" && ref.url)
            .map((ref) => ref.url);

        listing = {
            id: data.id,
            title: data.title,
            categories: data.categories ?? [],
            description: data.short_description ?? undefined,
            longDescription: data.need_details ?? undefined,
            requirements: data.technical_requirements ?? undefined,
            images: imageUrls.length ? imageUrls : undefined,
            links: linkUrls.length ? linkUrls : undefined,
            price: data.price,
            currency: "USD",
        };
    }

    if (!listing) {
        return notFound();
    }

    const isPoster = !!user && !!data && user.id === data.user_id;

    // Determine whether this task currently has any (non-rejected) submissions
    let hasSubmissions = false;
    if (data) {
        const { count } = await supabase
            .from("task_submissions")
            .select("id", { count: "exact", head: true })
            .eq("task_id", data.id)
            .not("status", "eq", "rejected");

        hasSubmissions = (count ?? 0) > 0;
    }

    let hasUserStarted = false;
    let submissionPending = false;
    let wasCancelled = false;
    let submissionRejected = false;
    let taskTaken = false;
    let isResubmission = false;
    let needsCheckIn = false;
    let checkInActivationId: number | null = null;
    let hasReachedTaskLimit = false;
    let hasActiveActivations = false;
    let hasReportedTask = false;
    const taskAccepted = !!data && data.status === "task_accepted";
    const taskUnavailable = !!data && data.status === "pending_payment";

    // Read payment status from query string (e.g. ?payment=success|cancel)
    const resolvedSearchParams = await searchParams;
    let paymentStatus: "success" | "cancel" | null = null;
    if (typeof resolvedSearchParams.payment !== "undefined") {
        const raw = Array.isArray(resolvedSearchParams.payment)
            ? resolvedSearchParams.payment[0]
            : resolvedSearchParams.payment;
        if (raw === "success" || raw === "cancel") {
            paymentStatus = raw;
        }
    }

    if (user && data) {
        // Check if the current user has already reported this task
        const { count: reportCount } = await supabase
            .from("reports")
            .select("id", { count: "exact", head: true })
            .eq("task_id", data.id)
            .eq("reporter_id", user.id);

        hasReportedTask = (reportCount ?? 0) > 0;

                
        // Count how many active tasks this user currently has.
        const { count: activeCount } = await supabase
            .from("task_activations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .in("status", [
                "waiting_submission",
                "pending",
                "resubmission",
                "resubmission_requested",
            ]);

        hasReachedTaskLimit = (activeCount ?? 0) >= 3;

        const { data: activation } = await supabase
            .from("task_activations")
            .select("id, status, check_in_requested_at")
            .eq("user_id", user.id)
            .eq("task_id", data.id)
            .maybeSingle();

        if (activation) {
            hasUserStarted = true;
            const status = (activation as any).status as string | null;
            submissionPending = status === "pending";
            wasCancelled = status === "cancelled";
            submissionRejected = status === "rejected";
            isResubmission = status === "resubmission";

            const checkInRequestedAt = (activation as any)
                .check_in_requested_at as string | null;
            if (checkInRequestedAt) {
                const requestedAtDate = new Date(checkInRequestedAt);
                if (!Number.isNaN(requestedAtDate.getTime())) {
                    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                    const ageMs = Date.now() - requestedAtDate.getTime();
                    if (ageMs < ONE_DAY_MS) {
                        needsCheckIn = true;
                        checkInActivationId = (activation as any).id as number;
                    }
                }
            }
        }

        // Check if any other user has an active (non-cancelled) activation for this task.
        const { data: otherActivation } = await supabase
            .from("task_activations")
            .select("id")
            .eq("task_id", data.id)
            .neq("user_id", user.id)
            .not("status", "eq", "cancelled")
            .not("status", "eq", "rejected")
            .maybeSingle();

        taskTaken = !!otherActivation;

        if (isPoster) {
            const { count: activationsCount } = await supabase
                .from("task_activations")
                .select("id", { count: "exact", head: true })
                .eq("task_id", data.id)
                .in("status", [
                    "waiting_submission",
                    "pending",
                    "resubmission",
                    "resubmission_requested",
                ]);

            hasActiveActivations = (activationsCount ?? 0) > 0;
        }
    }

    const isActiveFundedTask = !!data && data.status === "active";

    const canDeleteTask =
        isPoster &&
        !hasSubmissions &&
        !taskTaken &&
        (taskUnavailable || (isActiveFundedTask && !taskAccepted && !hasActiveActivations));

    return (
        <ListingClient
            listing={listing}
            creator={creatorData}
            isPoster={isPoster}
            hasUserStarted={hasUserStarted}
            submissionPending={submissionPending}
            wasCancelled={wasCancelled}
            submissionRejected={submissionRejected}
            taskTaken={taskTaken}
            isResubmission={isResubmission}
            taskAccepted={taskAccepted}
            taskUnavailable={taskUnavailable}
            paymentStatus={paymentStatus}
            hasSubmissions={hasSubmissions}
            isLoggedIn={!!user}
            hasReportedTask={hasReportedTask}
            hasReachedTaskLimit={hasReachedTaskLimit}
            hasActiveActivations={hasActiveActivations}
            canDeleteTask={canDeleteTask}
            needsCheckIn={needsCheckIn}
            checkInActivationId={checkInActivationId}
        />
    );
}

