"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { LISTINGS } from "@/data/listings";

interface ListingPageProps {
    params: {
        id: string;
    };
}

export default function ListingPage({ params }: ListingPageProps) {
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [showStartConfirm, setShowStartConfirm] = useState(false);
    const listing = LISTINGS[0];

    if (!listing) {
        return notFound();
    }

    const {
        title,
        categories,
        description,
        longDescription,
        requirements,
        price,
        currency = "USD",
        images,
        projectTitle,
        projectSummary,
    } = listing;

    const posterName = "Alex Rivera";

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <main className="mx-auto max-w-5xl px-4 py-8 flex flex-col gap-6 md:flex-row md:items-start">
                <section className="flex-1 min-w-0 space-y-6">
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => window.location.href = "/"}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                        >
                            Back to listings
                        </button>

                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                                {title}
                            </h1>

                            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                <div className="h-7 w-7 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-[0.7rem] font-semibold text-[var(--text-primary)]">
                                    {posterName.charAt(0)}
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span>{posterName}</span>
                                </div>
                            </div>

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
                            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                                {longDescription || description}
                            </p>
                        )}

                        {requirements && (
                            <section className="space-y-2">
                                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                    Requirements/Specifications
                                </h2>
                                <ul className="list-disc pl-5 text-sm text-[var(--text-secondary)] space-y-1">
                                    {requirements.split("\n").map((req) => (
                                        <li key={req}>{req}</li>
                                    ))}
                                </ul>
                            </section>
                        )}

                    </div>

                    {images && images.length > 0 && (
                        <section className="space-y-3">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                Visual references
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {images.map((src) => (
                                    <div
                                        key={src}
                                        className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-primary)] hover:border-transparent transition"
                                        onClick={() => setActiveImage(src)}
                                    >
                                        <img
                                            src={src}
                                            alt={title}
                                            className="h-48 w-full object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
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
                            This is the estimated payout for completing this task. Exact payment details can be finalized once you start.
                        </p>

                        <button
                            type="button"
                            className="w-full py-2.5 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                            onClick={() => setShowStartConfirm(true)}
                        >
                            Start task
                        </button>
                    </div>
                </aside>
            </main>

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
                                className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                                onClick={() => setShowStartConfirm(false)}
                            >
                                Confirm & Start
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

