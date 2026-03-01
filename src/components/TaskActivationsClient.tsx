"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type ActivationStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "resubmission_requested"
    | "resubmission"
    | "waiting_submission"
    | "cancelled"
    | string
    | null;

type Activation = {
    id: number;
    userId: string;
    username: string | null;
    createdAt: string;
    status: ActivationStatus;
    hasSubmission: boolean;
};

type TaskActivationsClientProps = {
    taskId: number;
    taskTitle: string;
    currentUserId: string;
    isPoster: boolean;
    activations: Activation[];
};

function formatDate(dateString: string) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

function statusBadge(status: ActivationStatus) {
    const base =
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";

    if (status === "waiting_submission") {
        return {
            label: "Waiting submission",
            className:
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase bg-[var(--bg-muted)] text-[var(--text-secondary)]",
        };
    }

    if (status === "accepted") {
        return { label: "Accepted", className: `${base} badge-success` };
    }

    if (status === "rejected") {
        return { label: "Rejected", className: `${base} badge-danger` };
    }

    if (status === "cancelled") {
        return { label: "Cancelled", className: `${base} badge-danger` };
    }

    if (status === "resubmission") {
        return {
            label: "Pending (resubmission)",
            className: `${base} badge-warning`,
        };
    }

    if (status === "resubmission_requested") {
        return {
            label: "Resubmission requested",
            className: `${base} badge-warning`,
        };
    }

    if (status === "pending") {
        return { label: "Pending review", className: `${base} badge-warning` };
    }

    return { label: "Unknown", className: `${base} bg-[var(--bg-muted)]` };
}

function canActOnActivation(
    activation: Activation,
    nowMs: number,
): { canCancel: boolean; canReject: boolean; reason?: string } {
    const createdAt = new Date(activation.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
        return {
            canCancel: false,
            canReject: false,
            reason: "Invalid activation date",
        };
    }

    const ageMs = nowMs - createdAt.getTime();

    if (activation.hasSubmission) {
        return {
            canCancel: false,
            canReject: false,
            reason: "",
        };
    }
    
    if (ageMs < THREE_DAYS_MS) {
        return {
            canCancel: false,
            canReject: false,
            reason: "Activation must be active for at least 3 days before it can be rejected.",
        };
    }

    const status = activation.status ?? "";
    const activeStatuses = [
        "waiting_submission",
        "pending",
        "resubmission",
        "resubmission_requested",
    ];

    if (!activeStatuses.includes(status)) {
        return {
            canCancel: false,
            canReject: false,
            reason: "Activation is no longer active.",
        };
    }

    return { canCancel: true, canReject: true };
}

export default function TaskActivationsClient({
    taskId,
    taskTitle,
    currentUserId,
    isPoster,
    activations,
}: TaskActivationsClientProps) {
    const [pendingIds, setPendingIds] = useState<number[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [localActivations, setLocalActivations] = useState<Activation[]>(
        activations,
    );
    const [confirmState, setConfirmState] = useState<
        { type: "cancel" | "reject"; activation: Activation } | null
    >(null);

    const nowMs = useMemo(() => Date.now(), []);

    const hasAny = localActivations.length > 0;

    const handleCancel = async (activation: Activation) => {
        if (pendingIds.includes(activation.id)) return;

        const { canCancel, reason } = canActOnActivation(activation, nowMs);
        if (!canCancel) {
            setError(reason ?? "This activation cannot be cancelled.");
            return;
        }

        setPendingIds((prev) => [...prev, activation.id]);
        setError(null);

        try {
            const res = await fetch("/api/tasks/cancel-activation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ taskId }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(
                    (data && (data as any).error) ||
                        "Failed to cancel activation. Please try again.",
                );
                return;
            }

            setLocalActivations((prev) =>
                prev.map((a) =>
                    a.id === activation.id ? { ...a, status: "cancelled" } : a,
                ),
            );
        } catch {
            setError(
                "Something went wrong while cancelling. Please try again.",
            );
        } finally {
            setPendingIds((prev) => prev.filter((id) => id !== activation.id));
        }
    };

    const handleReject = async (activation: Activation) => {
        if (pendingIds.includes(activation.id)) return;

        const { canReject, reason } = canActOnActivation(activation, nowMs);
        if (!canReject) {
            setError(reason ?? "This activation cannot be rejected.");
            return;
        }

        setPendingIds((prev) => [...prev, activation.id]);
        setError(null);

        try {
            const res = await fetch("/api/tasks/reject-activation", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ activationId: activation.id }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(
                    (data && (data as any).error) ||
                        "Failed to reject activation. Please try again.",
                );
                return;
            }

            setLocalActivations((prev) =>
                prev.map((a) =>
                    a.id === activation.id ? { ...a, status: "rejected" } : a,
                ),
            );
        } catch {
            setError(
                "Something went wrong while rejecting. Please try again.",
            );
        } finally {
            setPendingIds((prev) => prev.filter((id) => id !== activation.id));
        }
    };

    const confirmActivation = confirmState?.activation ?? null;
    const isConfirmCancel = confirmState?.type === "cancel";

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
                <header className="space-y-2">
                    <button
                        type="button"
                        onClick={() => (window.location.href = `/listing/${taskId}`)}
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
                    >
                        Back to task
                    </button>
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-2xl font-semibold">
                            Task activations
                        </h1>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs md:text-sm text-[var(--text-secondary)]">
                                {`Who has started "${taskTitle}" and when they started it.`}
                            </p>
                            <Link
                                href={`/listing/${taskId}/submissions`}
                                className="text-[0.7rem] md:text-xs font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                            >
                                View submissions
                            </Link>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="rounded-lg border border-[var(--danger-less-saturated)] bg-[var(--danger-less-saturated)]/10 px-3 py-2 text-xs text-[var(--danger)]">
                        {error}
                    </div>
                )}

                {!hasAny && (
                    <p className="text-xs text-[var(--text-secondary)]">
                        No one has started this task yet.
                    </p>
                )}

                {hasAny && (
                    <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
                        {localActivations.map((activation) => {
                            const isCurrentUser = activation.userId === currentUserId;
                            const { label, className } = statusBadge(
                                activation.status,
                            );
                            const { canCancel, canReject, reason } =
                                canActOnActivation(activation, nowMs);
                            const isPending = pendingIds.includes(activation.id);

                            const canShowCancel = isCurrentUser && canCancel;
                            const canShowReject = isPoster && !isCurrentUser && canReject;

                            return (
                                <article
                                    key={activation.id}
                                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold truncate">
                                                {activation.username || "Unknown user"}
                                            </h3>
                                            <p className="mt-1 text-[0.7rem] text-[var(--text-secondary)]">
                                                Started {formatDate(activation.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={className}>{label}</span>
                                        </div>
                                    </div>

                                    <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem] text-[var(--text-secondary)]">
                                        <div className="flex flex-col">
                                            {reason &&
                                                !(canCancel || canReject) && (
                                                    <span>{reason}</span>
                                                )}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {canShowCancel && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() =>
                                                        setConfirmState({
                                                            type: "cancel",
                                                            activation,
                                                        })
                                                    }
                                                    className="px-2 py-1 rounded-lg bg-[var(--danger)] text-white text-[0.7rem] font-semibold hover:opacity-90 disabled:opacity-60"
                                                >
                                                    {isPending
                                                        ? "Cancelling..."
                                                        : "Cancel activation"}
                                                </button>
                                            )}
                                            {canShowReject && (
                                                <button
                                                    type="button"
                                                    disabled={isPending}
                                                    onClick={() =>
                                                        setConfirmState({
                                                            type: "reject",
                                                            activation,
                                                        })
                                                    }
                                                    className="px-2 py-1 rounded-lg bg-[var(--danger)] text-[var(--text-primary)] text-[0.7rem] font-semibold hover:opacity-90 disabled:opacity-60"
                                                >
                                                    {isPending
                                                        ? "Rejecting..."
                                                        : "Reject activation"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {confirmActivation && (
                    <div
                        className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
                        onClick={() => setConfirmState(null)}
                    >
                        <div
                            className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="confirm-activation-title"
                        >
                            <h2
                                id="confirm-activation-title"
                                className="text-base font-semibold text-[var(--text-primary)]"
                            >
                                {isConfirmCancel
                                    ? "Cancel this activation?"
                                    : "Reject this activation?"}
                            </h2>
                            <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                {isConfirmCancel
                                    ? "If you cancel, you might not be able to start this task again."
                                    : "If you reject this activation, the submitter will no longer be working on this task so someone else can take it."}
                            </p>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setConfirmState(null)}
                                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                                >
                                    Go back
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                                    onClick={async () => {
                                        if (!confirmActivation) return;
                                        if (isConfirmCancel) {
                                            await handleCancel(confirmActivation);
                                        } else {
                                            await handleReject(confirmActivation);
                                        }
                                        setConfirmState(null);
                                    }}
                                >
                                    {isConfirmCancel ? "Yes, cancel" : "Yes, reject"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
