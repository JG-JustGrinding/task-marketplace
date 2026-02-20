"use client";

import { useState } from "react";
import Link from "next/link";

type SubmissionStatus = "pending" | "accepted" | "rejected" | "changes_requested";

type ListingSubmission = {
    id: number;
    submitterName: string;
    submittedAt: string;
    demoUrl?: string | null;
    finalUrl?: string | null;
    note?: string | null;
    status: SubmissionStatus;
};

const mockSubmissions: ListingSubmission[] = [
    {
        id: 1,
        submitterName: "Alex Rivera",
        submittedAt: "2025-02-10T14:35:00Z",
        demoUrl: "https://example.com/demo-1",
        finalUrl: "https://example.com/final-1",
        note: "Here is a demo version of the landing page. I focused on clarity and a strong hero section.",
        status: "pending",
    },
    {
        id: 2,
        submitterName: "Jordan Lee",
        submittedAt: "2025-02-12T09:12:00Z",
        demoUrl: null,
        finalUrl: "https://example.com/final-2",
        note: null,
        status: "pending",
    },
    {
        id: 3,
        submitterName: "Taylor Kim",
        submittedAt: "2025-02-13T18:05:00Z",
        demoUrl: "https://example.com/demo-3",
        finalUrl: null,
        note: "Quick demo walk-through. If you like the direction I can polish animations and transitions.",
        status: "pending",
    },
];

function formatDate(dateString: string) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function statusLabel(status: SubmissionStatus) {
    if (status === "accepted") return "Accepted";
    if (status === "rejected") return "Rejected";
    if (status === "changes_requested") return "Changes requested";
    return "Pending";
}

export default function ListingSubmissionsPage({
    params,
}: {
    params: { id: string };
}) {
    const [submissions, setSubmissions] = useState<ListingSubmission[]>(
        mockSubmissions,
    );

    const handleUpdateStatus = (id: number, status: SubmissionStatus) => {
        setSubmissions((current) =>
            current.map((submission) =>
                submission.id === id ? { ...submission, status } : submission,
            ),
        );
    };

    const listingId = 8;

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold">Submissions</h1>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        Review submissions for listing #{listingId}. This page is using
                        mock data for now.
                    </p>
                </div>
                <Link
                    href={`/listing/${listingId}`}
                    className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                >
                    View listing
                </Link>
            </div>

            <section className="space-y-3">
                {submissions.map((submission) => {
                    const primaryUrl = submission.demoUrl || submission.finalUrl;
                    const primaryLabel = submission.demoUrl
                        ? "Demo final (if available)"
                        : "Final submission";

                    return (
                        <article
                            key={submission.id}
                            className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                        >
                            <header className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <h2 className="text-sm font-semibold">
                                        Submission #{submission.id}
                                    </h2>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        From {submission.submitterName} · Submitted {" "}
                                        {formatDate(submission.submittedAt)}
                                    </p>
                                    <p className="text-[0.7rem] text-[var(--text-secondary)]">
                                        Status: {statusLabel(submission.status)}
                                    </p>
                                </div>
                            </header>

                            {primaryUrl && (
                                <div className="rounded-lg bg-[var(--bg-muted)]/70 px-3 py-2 text-sm">
                                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                        {primaryLabel}
                                    </p>
                                    <a
                                        href={primaryUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-1 inline-flex text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                                    >
                                        Open submission
                                    </a>
                                </div>
                            )}

                            {submission.note && (
                                <div className="rounded-lg bg-[var(--bg-muted)]/70 px-3 py-2 text-sm">
                                    <p className="text-xs font-semibold text-[var(--text-secondary)]">
                                        Submission note
                                    </p>
                                    <p className="mt-1 text-sm text-[var(--text-primary)]">
                                        {submission.note}
                                    </p>
                                </div>
                            )}

                            <footer className="mt-1 flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(submission.id, "rejected")}
                                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/80"
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handleUpdateStatus(
                                            submission.id,
                                            "changes_requested",
                                        )
                                    }
                                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]/80"
                                >
                                    Request changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(submission.id, "accepted")}
                                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                                >
                                    Accept submission
                                </button>
                            </footer>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
