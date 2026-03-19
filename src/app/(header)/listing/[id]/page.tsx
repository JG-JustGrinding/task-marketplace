import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type Listing } from "@/data/listings";
import ListingClient from "@/components/ListingClient";
import { isPremiumActive } from "@/lib/premium";

const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";

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
    collection_id: number | null;
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
    const admin = createAdminClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
        .from("tasks")
        .select(
            "id, user_id, title, categories, short_description, need_details, technical_requirements, references, price, status, collection_id",
        )
        .eq("id", numericId)
        .single<TaskRow>();

    let listing: Listing | null = null;

    const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select(
            "id, username, creator_pro_active, creator_pro_expires_at, earner_pro_active, earner_pro_expires_at",
        )
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

    let collection: { id: number; name: string } | null = null;
    let alsoInCollection: Listing[] = [];

    if (data && data.collection_id) {
        const { data: collectionRow } = await supabase
            .from("task_collections")
            .select("id, name")
            .eq("id", data.collection_id)
            .maybeSingle();

        if (collectionRow) {
            collection = {
                id: (collectionRow as any).id as number,
                name: (collectionRow as any).name as string,
            };

            const { data: siblingTasks } = await supabase
                .from("tasks")
                .select(
                    "id, title, categories, short_description, price, logo_path, banner_path",
                )
                .eq("collection_id", data.collection_id)
                .neq("id", data.id)
                .limit(5);

            if (siblingTasks && siblingTasks.length > 0) {
                const mapped = await Promise.all(
                    siblingTasks.map(async (task: any) => {
                        const logoPath = (task.logo_path as string | null) ?? null;
                        const bannerPath = (task.banner_path as string | null) ?? null;

                        let logoUrl: string | undefined;
                        let bannerUrl: string | undefined;

                        if (logoPath) {
                            const { data: signedLogo } = await admin.storage
                                .from(LOGO_BUCKET)
                                .createSignedUrl(logoPath, 60 * 60);
                            logoUrl = signedLogo?.signedUrl;
                        }

                        if (bannerPath) {
                            const { data: signedBanner } = await admin.storage
                                .from(BANNER_BUCKET)
                                .createSignedUrl(bannerPath, 60 * 60);
                            bannerUrl = signedBanner?.signedUrl;
                        }

                        return {
                            id: task.id as number,
                            title: (task.title as string) ?? "",
                            categories: (task.categories as string[] | null) ?? [],
                            description: (task.short_description as string | null) ?? undefined,
                            price: (task.price as number) ?? 0,
                            currency: "USD",
                            logoUrl,
                            bannerUrl,
                        } satisfies Listing;
                    }),
                );

                alsoInCollection = mapped;
            }
        }
    }

    const isPoster = !!user && !!data && user.id === data.user_id;

    const creatorCreatorProActive = creatorData
        ? isPremiumActive(
              (creatorData as any).creator_pro_active,
              (creatorData as any).creator_pro_expires_at,
          )
        : false;

    const creatorEarnerProActive = creatorData
        ? isPremiumActive(
              (creatorData as any).earner_pro_active,
              (creatorData as any).earner_pro_expires_at,
          )
        : false;

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
    let viewerEarnerProActive = false;
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
        let maxActiveTasks = 3;

        const { data: viewerProfile } = await supabase
            .from("profiles")
            .select("earner_pro_active, earner_pro_expires_at")
            .eq("id", user.id)
            .maybeSingle();

        if (viewerProfile) {
            viewerEarnerProActive = isPremiumActive(
                (viewerProfile as any).earner_pro_active,
                (viewerProfile as any).earner_pro_expires_at,
            );

            if (viewerEarnerProActive) {
                maxActiveTasks = 10;
            }
        }
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

        hasReachedTaskLimit = (activeCount ?? 0) >= maxActiveTasks;

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
            taskId={listing.id}
            creator={
                creatorData
                    ? {
                          id: creatorData.id,
                          username: creatorData.username,
                          creatorProActive: creatorCreatorProActive,
                          earnerProActive: creatorEarnerProActive,
                      }
                    : null
            }
            isPoster={isPoster}
            creatorHasCollectionsFeature={creatorCreatorProActive}
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
            viewerEarnerProActive={viewerEarnerProActive}
            hasActiveActivations={hasActiveActivations}
            canDeleteTask={canDeleteTask}
            needsCheckIn={needsCheckIn}
            checkInActivationId={checkInActivationId}
            collection={collection}
            alsoInCollection={alsoInCollection}
        />
    );
}

