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
    } | null;
    isPoster?: boolean;
    hasUserStarted?: boolean;
    submissionPending?: boolean;
    wasCancelled?: boolean;
    submissionRejected?: boolean;
    taskTaken?: boolean;
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
}: ListingClientProps) {
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [hasUserStarted, setHasUserStarted] = useState(initialHasUserStarted);
    const [isStartingTask, setIsStartingTask] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);

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
                            Back to listings
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
                                        <span>{posterName}</span>
                                    </div>
                                </Link>
                            ) : (
                                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <div className="h-7 w-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[0.7rem] font-semibold text-[var(--text-primary)]">
                                        {posterInitial}
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span>{posterName}</span>
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
                </section>

                <aside className="mt-6 md:mt-0 md:ml-8 w-full md:w-80">
                    <div className="card space-y-4 sticky top-6">
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
                                : `This is the reward the poster is offering for completing the task.`}
                        </p>

                        {false && startedCount > 0 && !taskTaken && (
                            <p className="text-xs text-[var(--text-secondary)]">
                                {startedCount === 1 && "1 person has started this task."}
                                {startedCount > 1 &&
                                    `${shortenNumber(startedCount)} people have started this task.`}
                            </p>
                        )}

                        {!isPoster && !removeActions && (
                            <>
                                {!hasUserStarted && !taskTaken && (
                                    <button
                                        type="button"
                                        className="w-full py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                                        onClick={() => setShowStartConfirm(true)}
                                    >
                                        Start task
                                    </button>
                                )}

                                {hasUserStarted && (
                                    <div className="flex gap-2">
                                        {submissionPending || wasCancelled || submissionRejected || taskTaken ? (
                                            <div className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-[var(--bg-muted)] text-[var(--text-secondary)] text-center border border-[var(--border-color)]">
                                                {taskTaken
                                                    ? "Task taken"
                                                    : submissionPending
                                                    ? "Submission pending"
                                                    : wasCancelled
                                                    ? "Task cancelled"
                                                    : submissionRejected
                                                    ? "Submission denied"
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
                                                <Link
                                                    href={`/listing/${listing.id}/submit`}
                                                    className="none flex-1 py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-secondary)] text-white hover:bg-[var(--accent-secondary-hover)] text-center"
                                                >
                                                    Submit task
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </aside>
            </main>

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
        </div>
    );
}
