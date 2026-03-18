"use client";

import { useState } from "react";
import Link from "next/link";
import { shortenNumber } from "@/lib/shortenNumber";
import type { Listing } from "@/data/listings";

type ListingClientProps = {
    listing: Listing;
    creator?: {
        id: string;
        username: string | null;
        avatar_url?: string | null;
        creatorProActive?: boolean;
        earnerProActive?: boolean;
    } | null;
    isPoster?: boolean;
    hasUserStarted?: boolean;
    submissionPending?: boolean;
    wasCancelled?: boolean;
    submissionRejected?: boolean;
    taskTaken?: boolean;
    isResubmission?: boolean;
    taskAccepted?: boolean;
    taskUnavailable?: boolean;
    paymentStatus?: "success" | "cancel" | null;
    hasSubmissions?: boolean;
    isLoggedIn?: boolean;
    hasReportedTask?: boolean;
    hasReachedTaskLimit?: boolean;
    viewerEarnerProActive?: boolean;
    hasActiveActivations?: boolean;
    canDeleteTask?: boolean;
    needsCheckIn?: boolean;
    checkInActivationId?: number | null;
};

export default function ListingClient({
    listing,
    creator,
    isPoster = false,
    hasUserStarted: initialHasUserStarted = false,
    submissionPending = false,
    wasCancelled = false,
    submissionRejected = false,
    taskTaken = false,
    isResubmission = false,
    taskAccepted = false,
    taskUnavailable = false,
    paymentStatus = null,
    hasSubmissions = false,
    isLoggedIn = false,
    hasReportedTask = false,
    hasReachedTaskLimit = false,
    viewerEarnerProActive = false,
    hasActiveActivations = false,
    canDeleteTask = false,
    needsCheckIn = false,
    checkInActivationId = null,
}: ListingClientProps) {
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [hasUserStarted, setHasUserStarted] = useState(initialHasUserStarted);
    const [isStartingTask, setIsStartingTask] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);
    const [isFundingTask, setIsFundingTask] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState<string>("inappropiate_content");
    const [reportDescription, setReportDescription] = useState("");
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);
    const [reportSuccess, setReportSuccess] = useState(false);
    const [hasJustReported, setHasJustReported] = useState(false); // to remove the report button immediately after reporting without needing to refresh the page
    const [isCheckingIn, setIsCheckingIn] = useState(false);
    const [checkInError, setCheckInError] = useState<string | null>(null);
    const [hasCheckedIn, setHasCheckedIn] = useState(false);

    const {
        title,
        categories,
        description,
        longDescription,
        requirements,
        price,
        currency = "USD",
        images,
        links,
        projectTitle,
        projectSummary,
        startedCount = 0,
    } = listing;

    const posterName = creator?.username ?? "Unknown User";
    const posterInitial = posterName.charAt(0).toUpperCase();
    const profileHref = creator?.id ? `/profile/${creator.id}` : null;
    const removeActions = false; // for when the user has cancelled the task

    const isFundedDeletionFlow = canDeleteTask && !taskUnavailable;

    const handleCheckIn = async () => {
        if (!checkInActivationId || isCheckingIn) return;
        setCheckInError(null);
        setIsCheckingIn(true);
        try {
            const res = await fetch("/api/tasks/check-in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ activationId: checkInActivationId }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setCheckInError(
                    (data && (data as any).error) ||
                        "Failed to check in. Please try again.",
                );
                return;
            }

            setHasCheckedIn(true);
        } catch {
            setCheckInError(
                "Something went wrong while checking in. Please try again.",
            );
        } finally {
            setIsCheckingIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <main className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6 md:flex-row md:items-start">
                <section className="flex-1 min-w-0 space-y-6">
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => (window.location.href = "/")}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                        >
                            Back to tasks
                        </button>

                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                                {title}
                            </h1>

                            {profileHref ? (
                                <Link
                                    href={profileHref}
                                    className="none mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] cursor-pointer"
                                >
                                    <div className="h-7 w-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[0.7rem] font-semibold text-[var(--text-primary)]">
                                        {posterInitial}
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="flex items-center gap-1.5">
                                            {posterName}
                                            {creator?.creatorProActive && (
                                                <span className="inline-flex items-center justify-center rounded-full border border-[var(--accent-primary)]/60 bg-[var(--bg-secondary)] px-1 text-[0.7rem] leading-none text-[var(--accent-primary)]">
                                                    ★
                                                </span>
                                            )}
                                            {creator?.earnerProActive && (
                                                <span className="inline-flex items-center justify-center rounded-full border border-[var(--accent-secondary)]/60 bg-[var(--bg-secondary)] px-1 text-[0.7rem] leading-none text-[var(--accent-secondary)]">
                                                    ★
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </Link>
                            ) : (
                                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <div className="h-7 w-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[0.7rem] font-semibold text-[var(--text-primary)]">
                                        {posterInitial}
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="flex items-center gap-1.5">
                                            {posterName}
                                            {creator?.creatorProActive && (
                                                <span className="inline-flex items-center justify-center rounded-full border border-[var(--accent-primary)]/60 bg-[var(--bg-secondary)] px-1 text-[0.6rem] leading-none text-[var(--accent-primary)]">
                                                    ★
                                                </span>
                                            )}
                                            {creator?.earnerProActive && (
                                                <span className="inline-flex items-center justify-center rounded-full border border-[var(--accent-secondary)]/60 bg-[var(--bg-secondary)] px-1 text-[0.6rem] leading-none text-[var(--accent-secondary)]">
                                                    ★
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                                {categories.map((cat) => (
                                    <span
                                        key={cat}
                                        className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2.5 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]"
                                    >
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {(longDescription || description) && (
                            <section className="space-y-2">
                                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                    What the Poster is Looking For
                                </h2>
                                <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                                    {longDescription || description}
                                </p>
                            </section>
                        )}

                        {requirements && (
                            <section className="space-y-2">
                                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                    Requirements/Specifications
                                </h2>
                                <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                                {requirements}
                                </div>
                                {false && <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
                                    {requirements?.split("\n").map((req, index) => (
                                        <li key={index}>{req}</li>
                                    ))}
                                </ul>}
                            </section>
                        )}
                    </div>

                    {((images && images.length > 0) || (links && links.length > 0)) && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                               References
                            </h2>
                            {images && images.length > 0 && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {images.map((src, i) => (
                                    <div
                                        key={i}
                                        className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-primary)] hover:border-transparent transition"
                                        onClick={() => setActiveImage(src)}
                                    >
                                        <img src={src} alt={title} className="h-48 w-full object-cover" />
                                    </div>
                                ))}
                            </div>)}
                            {links && links.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    {links.map((link, i) => (
                                        <a
                                            key={i}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-[var(--accent-primary)] hover:underline"
                                        >
                                            {link}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {(projectTitle || projectSummary) && (
                        <section className="space-y-2">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                About the project
                            </h2>
                            {projectTitle && (
                                <p className="text-sm font-medium text-[var(--text-primary)]">
                                    {projectTitle}
                                </p>
                            )}
                            {projectSummary && (
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                    {projectSummary}
                                </p>
                            )}
                        </section>
                    )}

                    {canDeleteTask && (
                        <div className="pt-2">
                            <button
                                type="button"
                                className="text-xs font-medium text-[var(--danger)] hover:opacity-80"
                                onClick={() => {
                                    setDeleteError(null);
                                    setShowDeleteConfirm(true);
                                }}
                            >
                                Delete task
                            </button>
                        </div>
                    )}

                    {!isPoster && !hasReportedTask && !hasJustReported && (
                        <div className="pt-2">
                            <button
                                type="button"
                                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!isLoggedIn || hasReportedTask || hasJustReported}
                                onClick={() => {
                                    if (!isLoggedIn || hasReportedTask || hasJustReported) return;
                                    setReportError(null);
                                    setReportSuccess(false);
                                    setShowReportModal(true);
                                    setHasJustReported(true);
                                }}
                            >
                                {(hasReportedTask || hasJustReported) ? "Task reported" : "Report this task"}
                            </button>
                        </div>
                    )}
                </section>

                <aside className="mt-6 md:mt-0 md:ml-8 w-full md:w-80">
                    <div className="card space-y-4 sticky top-6">
                        {isPoster && taskUnavailable && paymentStatus && (
                            <div
                                className={`rounded-lg px-3 py-2 text-xs font-medium border ${
                                    paymentStatus === "success"
                                        ? "border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]"
                                        : "border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]"
                                }`}
                            >
                                {paymentStatus === "success"
                                    ? "Payment completed. Your task will update shortly once the payment is confirmed."
                                    : "Payment was cancelled. You can try funding the task again when you're ready."}
                            </div>
                        )}

                        <div>
                            <span className="block text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] mb-1">
                                <b>{process.env.NEXT_PUBLIC_REWARD_TITLE}</b>
                            </span>
                            <p className="text-2xl font-semibold text-[var(--text-primary)]">
                                {currency === "USD" ? "$" : ""}
                                {price.toLocaleString()}
                            </p>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)]">
                            {isPoster
                                ? "This is the reward you have set for an accepted submission."
                                : `This is the reward the poster is offering for the accepted task. You will only receive this reward if your submission is accepted by the poster after submitting.`}
                        </p>

                        {isPoster && !taskUnavailable && (
                            (hasSubmissions || hasActiveActivations) ? (
                                <Link
                                    href={`/listing/${listing.id}/submissions`}
                                    className="bold inline-block text-xs font-medium text-[var(--accent-primary)] hover:underline"
                                >
                                    View submissions
                                </Link>
                            ) : (
                                !taskAccepted && (
                                    <span className="inline-flex items-center rounded-full bg-[var(--bg-muted)] px-2.5 py-0.5 text-[0.7rem] font-medium text-[var(--text-secondary)]">
                                        Waiting for submissions
                                    </span>
                                )
                            )
                        )}

                        {false && startedCount > 0 && !taskTaken && (
                            <p className="text-xs text-[var(--text-secondary)]">
                                {startedCount === 1 && "1 person has started this task."}
                                {startedCount > 1 &&
                                    `${shortenNumber(startedCount)} people have started this task.`}
                            </p>
                        )}

                        {taskUnavailable && (
                            <div className="space-y-2">
                                {!isPoster && (
                                    <div className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                        Task unavailable
                                    </div>
                                )}
                                {(isPoster && paymentStatus !== "success") && (
                                    <>
                                    {!paymentStatus && (<p className="bold text-xs text-[var(--text-secondary)] text-center">
                                        This task is currently unavailable because it hasn&apos;t been funded yet.
                                    </p>)}
                                    <button
                                        type="button"
                                        className="bold block w-full py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white text-center hover:bg-[var(--accent-hover)] disabled:opacity-70"
                                        disabled={isFundingTask}
                                        onClick={async () => {
                                            if (isFundingTask) return;
                                            setIsFundingTask(true);
                                            try {
                                                const res = await fetch("/api/tasks/create-checkout", {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        amount: price,
                                                        taskId: listing.id,
                                                        source: "listing" as const,
                                                    }),
                                                });

                                                const data = await res.json().catch(() => ({}));

                                                if (!res.ok || !data.url) {
                                                    alert(
                                                        (data && (data as any).error) ||
                                                            "We couldn't start checkout. Please try again in a moment.",
                                                    );
                                                    return;
                                                }

                                                window.location.href = data.url as string;
                                            } catch (err) {
                                                alert(
                                                    "We couldn't start checkout. Please check your connection and try again.",
                                                );
                                            } finally {
                                                setIsFundingTask(false);
                                            }
                                        }}
                                    >
                                        {isFundingTask ? "Starting checkout..." : "Fund task"}
                                    </button>
                                    </>
                                )}
                            </div>
                        )}

                        {taskAccepted && (
                            <div className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                Task finished
                            </div>
                        )}

                        {!isPoster && !removeActions && !taskAccepted && !taskUnavailable && (
                            <>
                                {!hasUserStarted ? (
                                    taskTaken ? (
                                        <div className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                            Task taken
                                        </div>
                                    ) : hasReachedTaskLimit ? (
                                        <div className="space-y-2">
                                            <div className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                                Task limit reached
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] text-center">
                                                You&apos;ve reached your current active task limit. Complete or cancel one before starting another. {!viewerEarnerProActive && <><Link href="/premium" className="text-[var(--accent-primary)] font-bold hover:underline">Upgraded earners</Link> get a significantly increased task limit.</>}
                                            </p>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="w-full py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                                            onClick={() => {
                                                if (!isLoggedIn) {
                                                    const redirectTo = `${window.location.pathname}${window.location.search || ""}`;
                                                    window.location.href = `/login?redirect=${encodeURIComponent(redirectTo)}`;
                                                    return;
                                                }
                                                setShowStartConfirm(true);
                                            }}
                                        >
                                            Start task
                                        </button>
                                    )
                                ) : (
                                    <div className="flex gap-2">
                                        {submissionPending || wasCancelled || submissionRejected || taskTaken || isResubmission ? (
                                            <div className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                                {taskTaken
                                                    ? "Task taken"
                                                    : submissionPending
                                                    ? "Submission pending"
                                                    : isResubmission
                                                    ? "Pending (resubmission)"
                                                    : wasCancelled
                                                    ? "Task cancelled"
                                                    : submissionRejected
                                                    ? "Submission rejected"
                                                    : ""}
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-[var(--danger)] text-white hover:opacity-90"
                                                    onClick={() => setShowCancelConfirm(true)}
                                                >
                                                    Cancel task
                                                </button>
                                                {needsCheckIn && !hasCheckedIn ? (
                                                    <button
                                                        type="button"
                                                        className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
                                                        disabled={isCheckingIn || !checkInActivationId}
                                                        onClick={handleCheckIn}
                                                    >
                                                        {isCheckingIn
                                                            ? "Checking in..."
                                                            : "Check in"}
                                                    </button>
                                                ) : (
                                                    <Link
                                                        href={`/listing/${listing.id}/submit`}
                                                        className="none flex-1 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-secondary)] text-white hover:bg-[var(--accent-secondary-hover)] text-center"
                                                    >
                                                        Submit task
                                                    </Link>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </aside>
            </main>

            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                    onClick={() => !isDeleting && setShowDeleteConfirm(false)}
                >
                    <div
                        className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-task-title"
                    >
                        <h2
                            id="delete-task-title"
                            className="text-base font-semibold text-[var(--text-primary)]"
                        >
                            {isFundedDeletionFlow
                                ? "Delete this task and issue a refund?"
                                : "Delete this task?"}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {isFundedDeletionFlow
                                ? "This will permanently remove the task. You will receive a refund to your original payment method with a cancellation fee of 15% of the task reward. This action cannot be undone."
                                : "This will permanently remove the task. This action cannot be undone."}
                        </p>
                        {deleteError && (
                            <p className="mt-2 text-xs text-[var(--danger)]">{deleteError}</p>
                        )}
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setShowDeleteConfirm(false)}
                                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50"
                            >
                                Go back
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
                                onClick={async () => {
                                    if (isDeleting) return;
                                    setIsDeleting(true);
                                    setDeleteError(null);
                                    try {
                                        const res = await fetch(`/api/tasks/${listing.id}`, {
                                            method: "DELETE",
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            setDeleteError(
                                                (data as any).error ||
                                                    "Failed to delete task. Please try again.",
                                            );
                                            return;
                                        }
                                        window.location.href = "/";
                                    } catch {
                                        setDeleteError(
                                            "Something went wrong. Please check your connection and try again.",
                                        );
                                        setIsDeleting(false);
                                    }
                                }}
                            >
                                {isDeleting
                                    ? "Deleting..."
                                    : isFundedDeletionFlow
                                    ? "Yes, delete and refund"
                                    : "Yes, delete task"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCancelConfirm && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                    onClick={() => setShowCancelConfirm(false)}
                >
                    <div
                        className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-task-title"
                    >
                        <h2
                            id="cancel-task-title"
                            className="text-base font-semibold text-[var(--text-primary)]"
                        >
                            Cancel this task?
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            If you cancel, you won&apos;t be able to start this task again
                        </p>
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowCancelConfirm(false)}
                                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                            >
                                Go back
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
                                onClick={async () => {
                                    try {
                                        await fetch("/api/tasks/cancel-activation", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({ taskId: listing.id }),
                                        });
                                    } finally {
                                        // Reload so server-side status flows into props and disables re-starting.
                                        window.location.reload();
                                    }
                                }}
                            >
                                Yes, cancel task
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showStartConfirm && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                    onClick={() => setShowStartConfirm(false)}
                >
                    <div
                        className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="start-task-title"
                    >
                        <h2
                            id="start-task-title"
                            className="text-base font-semibold text-[var(--text-primary)]"
                        >
                            Start this task?
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Once you start, the creator will be notified and the task will
                            move into your active queue.
                        </p>
                        {startError && (
                            <p className="mt-2 text-xs text-[var(--danger)]">{startError}</p>
                        )}
                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowStartConfirm(false)}
                                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
                                disabled={isStartingTask}
                                onClick={async () => {
                                    if (isStartingTask) return;
                                    setIsStartingTask(true);
                                    setStartError(null);
                                    try {
                                        const res = await fetch("/api/tasks/activate", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({ taskId: listing.id }),
                                        });

                                        const data = await res.json().catch(() => ({}));

                                        if (!res.ok) {
                                            setStartError(
                                                (data && (data as any).error) ||
                                                    "There was a problem starting this task. Please try again.",
                                            );
                                        } else {
                                            setHasUserStarted(true);
                                            setShowStartConfirm(false);
                                        }
                                    } catch (err) {
                                        setStartError(
                                            "There was a problem starting this task. Please try again.",
                                        );
                                    } finally {
                                        setIsStartingTask(false);
                                    }
                                }}
                            >
                                {isStartingTask ? "Starting..." : "Confirm & Start"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeImage && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                    onClick={() => setActiveImage(null)}
                >
                    <div
                        className="relative max-w-3xl w-full px-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setActiveImage(null)}
                            className="absolute -top-3 right-3 h-8 w-8 rounded-full bg-[var(--bg-secondary)] text-[var(--text-primary)] text-lg flex items-center justify-center shadow-md hover:bg-[var(--bg-muted)]"
                            aria-label="Close image preview"
                        >
                            ×
                        </button>
                        <img
                            src={activeImage}
                            alt={title}
                            className="max-h-[80vh] w-full object-contain rounded-xl shadow-xl"
                        />
                    </div>
                </div>
            )}

            {showReportModal && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                    onClick={() => {
                        if (!isSubmittingReport) {
                            setShowReportModal(false);
                        }
                    }}
                >
                    <div
                        className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="report-task-title"
                    >
                        <h2
                            id="report-task-title"
                            className="text-base font-semibold text-[var(--text-primary)]"
                        >
                            Report this task
                        </h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Use this form to let us know if this task is spam, fraudulent, abusive, or otherwise inappropriate.
                        </p>

                        <div className="mt-4 space-y-3">
                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                                    Reason
                                </label>
                                <select
                                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                    disabled={isSubmittingReport}
                                >
                                    <option value="inappropiate_content">Inappropriate content</option>
                                    <option value="spam">Spam</option>
                                    <option value="fraud">Fraud</option>
                                    <option value="abuse">Abuse or harassment</option>
                                    <option value="scam">Scam or misleading</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-xs font-medium text-[var(--text-secondary)]">
                                    Additional details <span className="text-[var(--text-muted)]">(optional)</span>
                                </label>
                                <textarea
                                    className="w-full min-h-[80px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-y"
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    disabled={isSubmittingReport}
                                    maxLength={2000}
                                />
                            </div>
                        </div>

                        {reportError && (
                            <p className="mt-3 text-xs text-[var(--danger)]">{reportError}</p>
                        )}
                        {reportSuccess && !reportError && (
                            <p className="mt-3 text-xs text-[var(--success)]">
                                Thank you for your report. We&apos;ve received it.
                            </p>
                        )}

                        <div className="mt-4 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-50"
                                onClick={() => {
                                    if (!isSubmittingReport) {
                                        setShowReportModal(false);
                                    }
                                }}
                                disabled={isSubmittingReport}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
                                disabled={isSubmittingReport}
                                onClick={async () => {
                                    if (isSubmittingReport) return;
                                    setIsSubmittingReport(true);
                                    setReportError(null);
                                    setReportSuccess(false);
                                    try {
                                        const res = await fetch("/api/tasks/report", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                            },
                                            body: JSON.stringify({
                                                taskId: listing.id,
                                                reason: reportReason,
                                                description: reportDescription,
                                            }),
                                        });

                                        const data = await res.json().catch(() => ({}));

                                        if (!res.ok) {
                                            setReportError(
                                                (data && (data as any).error) ||
                                                    "We couldn&apos;t submit your report. Please try again.",
                                            );
                                            return;
                                        }

                                        setReportSuccess(true);
                                        setReportDescription("");
                                        // Optionally close the modal after a short delay; for now, close immediately.
                                        setShowReportModal(false);
                                    } catch (err) {
                                        setReportError(
                                            "We couldn&apos;t submit your report. Please check your connection and try again.",
                                        );
                                    } finally {
                                        setIsSubmittingReport(false);
                                    }
                                }}
                            >
                                {isSubmittingReport ? "Submitting..." : "Submit report"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
