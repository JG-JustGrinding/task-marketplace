"use client";

import { useState } from "react";
import Link from "next/link";

type SubmissionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "resubmission_requested"
  | "resubmission"
  | "waiting_submission"
  | "cancelled"
  | string
  | null;

type Task = {
  id: number;
  title: string;
  short_description: string | null;
  price: number;
  categories: string[] | null;
  created_at: string;
};

type TaskSubmission = {
  id: number;
  task_id: number;
  status: SubmissionStatus;
  created_at: string;
  is_hidden?: boolean | null;
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

function statusBadge(status: SubmissionStatus) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";

  if (status === "waiting_submission") {
    return {
      label: "Waiting submission",
      className: "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase bg-[var(--bg-muted)] text-[var(--text-secondary)]",
    };
  }

  if (status === "accepted") {
    return {
      label: "Accepted",
      className: `${base} badge-success`,
    };
  }

  if (status === "rejected") {
    return {
      label: "Rejected",
      className: `${base} badge-danger`,
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: `${base} badge-danger`,
    };
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

  return {
    label: "Pending",
    className: `${base} badge-warning`,
  };
}

interface SubmittedTasksListProps {
  submissions: TaskSubmission[];
  tasks: Task[];
}

export default function SubmittedTasksList({
  submissions,
  tasks,
}: SubmittedTasksListProps) {
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [expandedDetailsId, setExpandedDetailsId] = useState<number | null>(
    null,
  );
  const [showHidden, setShowHidden] = useState(false);

  const tasksById = new Map<number, Task>();
  for (const t of tasks) {
    tasksById.set(t.id, t);
  }

  const isLocallyHidden = (s: TaskSubmission) =>
    !!s.is_hidden || hiddenIds.includes(s.id);

  const visibleSubmissions = submissions.filter((s) => !isLocallyHidden(s));
  const hiddenSubmissions = submissions.filter((s) => isLocallyHidden(s));

  const handleHide = async (id: number) => {
    setHiddenIds((prev) =>
      prev.includes(id) ? prev : [...prev, id].slice(-100),
    );

    try {
      await fetch("/api/tasks/hide-activation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ activationId: id }),
      });
    } catch {
      // Swallow errors; local hide state still applies for this session.
    }
  };

  if (visibleSubmissions.length === 0 && hiddenSubmissions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
      {visibleSubmissions.map((submission) => {
        const task = tasksById.get(submission.task_id);
        const baseStatus = statusBadge(submission.status);
        const isRejected = submission.status === "rejected";
        const isCancelled = submission.status === "cancelled";
        const isResubmissionRequested =
          submission.status === "resubmission_requested";
        const isResubmission = submission.status === "resubmission";
        const isAccepted = submission.status === "accepted";
        const isPending = submission.status === "pending";
        const showDetails = expandedDetailsId === submission.id;
		const hasDispute =
		  (submission as any).has_dispute === true ||
		  (submission as any).hasDispute === true;
		const isOverturned =
		  (submission as any).is_overturned === true ||
		  (submission as any).isOverturned === true;

    const baseBadgeClass =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";
    const label = isOverturned && isAccepted ? "Overturned" : baseStatus.label;
    const className =
      isOverturned && isAccepted
      ? `${baseBadgeClass} badge-danger`
      : baseStatus.className;

        return (
          <article
            key={submission.id}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {task?.title ?? `Task #${submission.task_id}`}
                </h3>
                {task?.short_description && (
                  <p className="mt-1 text-[0.7rem] text-[var(--text-secondary)] line-clamp-2">
                    {task.short_description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task?.categories?.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2 py-0.5 text-[0.6rem] font-medium text-[var(--text-secondary)]"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1 sm:text-right text-left mt-2 sm:mt-0">
                {task && (
                  <span className="text-sm font-semibold">
                    ${task.price.toLocaleString()}
                  </span>
                )}
                <span className={className}>{label}</span>
                {hasDispute && (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase bg-[var(--danger-less-saturated)]/10 text-[var(--danger-less-saturated)] border border-[var(--danger-less-saturated)]">
                    Dispute open
                  </span>
                )}
                {(isRejected || isCancelled || (isOverturned && isAccepted)) && (
                  <button
                    type="button"
                    onClick={() => handleHide(submission.id)}
                    className="h-5 w-5 flex items-center justify-center rounded-full border border-[var(--border-color)] text-[0.6rem] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    aria-label="Hide submission"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem] text-[var(--text-secondary)]">
              <div className="flex flex-col">
		        <span>Started {formatDate(submission.created_at)}</span>
                {hasDispute && (
                  <span className="mt-1 max-w-xs text-[0.6rem] text-[var(--text-secondary)]">
                    There is an open dispute on this task. Your payout may be removed if the dispute is resolved in favor of the task poster.
                  </span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                {isResubmissionRequested && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedDetailsId((current) =>
                        current === submission.id ? null : submission.id,
                      )
                    }
                    className="text-[0.7rem] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] underline-offset-2 hover:underline"
                  >
                    {showDetails ? "Hide request details" : "View request details"}
                  </button>
                )}
                {isResubmissionRequested && task && (
                  <Link
                    href={`/listing/${task.id}/submit`}
                    className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                  >
                    Resubmit
                  </Link>
                )}
                {task &&
                  !isAccepted &&
                  !isRejected &&
                  !isCancelled &&
                  !isResubmissionRequested && (
                  <>
                    {!isPending && !isResubmission && (
                      <Link
                        href={`/listing/${task.id}/submit`}
                        className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                      >
                        Submit task
                      </Link>
                    )}
                    <Link
                      href={`/listing/${task.id}`}
                      className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                    >
                      View task
                    </Link>
                  </>
                )}
              </div>
            </div>

            {showDetails && (
              <div className="mt-2 rounded-lg bg-[var(--bg-muted)]/80 px-3 py-2 text-[0.7rem] text-[var(--text-secondary)]">
                <p className="font-semibold mb-1">Requested changes</p>
                <p>
                  {"resubmission_message" in submission &&
                  (submission as any).resubmission_message
                    ? (submission as any).resubmission_message
                    : "The task creator has requested an updated version. When you resubmit, add a short note explaining what you changed."}
                </p>
              </div>
            )}
          </article>
        );
      })}
      {hiddenSubmissions.length > 0 && (
        <div className="mt-2 border-t border-[var(--border-color)] pt-2 space-y-2">
          <button
            type="button"
            onClick={() => setShowHidden((prev) => !prev)}
            className="text-[0.7rem] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] underline-offset-2 hover:underline"
          >
            {showHidden
              ? "Hide hidden tasks"
              : `Show hidden tasks (${hiddenSubmissions.length})`}
          </button>
          {showHidden && (
            <ul className="space-y-1 text-[0.7rem] text-[var(--text-secondary)]">
              {hiddenSubmissions.map((submission) => {
                const task = tasksById.get(submission.task_id);

                return (
                  <li
                    key={`hidden-${submission.id}`}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">
                      {task?.title ?? `Task #${submission.task_id}`}
                    </span>
                    {task && (
                      <Link
                        href={`/listing/${task.id}`}
                        className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                      >
                        View
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
