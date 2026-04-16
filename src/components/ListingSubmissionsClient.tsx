"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SubmissionStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "resubmission_requested"
  | "resubmission"
  | "changes_requested"
  | "cancelled"
  | string
  | null;

type ListingSubmission = {
  id: number;
  submitterName: string;
  submittedAt: string;
  demoUrl?: string | null;
  finalUrl?: string | null;
  note?: string | null;
  status: SubmissionStatus;
  canOpenDispute?: boolean; // Indicates if the dispute can be opened
  hasDispute?: boolean; // Indicates if there is an ongoing dispute
  disputeStatus?: string | null;
};

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

const BASE_AUTO_ACCEPT_MS = 3 * 24 * 60 * 60 * 1000; // default 3-day window
const CREATOR_PRO_AUTO_ACCEPT_MS = 7 * 24 * 60 * 60 * 1000; // extended 7-day window for Creator Pro

function formatCountdown(msRemaining: number) {
  if (!Number.isFinite(msRemaining) || msRemaining <= 0) {
    return "soon";
  }

  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);

  return parts.join(" ");
}

function statusLabel(status: SubmissionStatus) {
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  if (status === "resubmission") return "Pending (resubmission)";
  if (status === "changes_requested" || status === "resubmission_requested") {
    return "Awaiting resubmission";
  }
  return "Pending";
}

type ListingSubmissionsClientProps = {
  listingId: number;
  listingTitle: string | null;
  isTaskAccepted?: boolean;
  initialSubmissions?: ListingSubmission[];
  isCreatorProActive?: boolean;
};

export default function ListingSubmissionsClient({
  listingId,
  listingTitle,
  isTaskAccepted = false,
  initialSubmissions,
  isCreatorProActive = false,
}: ListingSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<ListingSubmission[]>(
    initialSubmissions ?? [],
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    typeof initialSubmissions === "undefined",
  );
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [requestNote, setRequestNote] = useState<string>("");
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>("");
  const [disputeDescription, setDisputeDescription] = useState<string>("");
  const [disputeOverturnAction, setDisputeOverturnAction] = useState<string>("keep_task");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState<boolean>(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const autoAcceptMs = isCreatorProActive
    ? CREATOR_PRO_AUTO_ACCEPT_MS
    : BASE_AUTO_ACCEPT_MS;

  useEffect(() => {
    if (typeof initialSubmissions !== "undefined") {
      // Data was already loaded on the server (even if empty);
      // no client fetch needed.
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadSubmissions() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/tasks/${listingId}/submissions`, {
          signal: controller.signal,
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error((body as any).error || "Failed to load submissions");
        }

        const data = body as { submissions?: ListingSubmission[] };
        setSubmissions(data.submissions ?? []);
      } catch (err: unknown) {
        if ((err as any)?.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Failed to load submissions";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadSubmissions();

    return () => {
      controller.abort();
    };
  }, [listingId, initialSubmissions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000); // update every 30s; fine-grained enough for a countdown label

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleUpdateStatus = (id: number, status: SubmissionStatus) => {
    setSubmissions((current) =>
      current.map((submission) =>
        submission.id === id ? { ...submission, status } : submission,
      ),
    );
  };

  const handleOpenRejectConfirm = (submissionId: number) => {
    setRejectError(null);
    setRejectingId(submissionId);
  };

  const handleOpenRequestChanges = (submissionId: number) => {
    setRequestError(null);
    setRequestNote("");
    setRequestingId(submissionId);
  };

  const handleOpenAcceptConfirm = (submissionId: number) => {
    setAcceptError(null);
    setAcceptingId(submissionId);
  };

  const handleOpenDispute = (submissionId: number) => {
    setDisputeError(null);
    setDisputeReason("");
    setDisputeDescription("");
    setDisputeOverturnAction("keep_task");
    setDisputeId(submissionId);
  };

  const handleConfirmAccept = async () => {
    if (acceptingId == null) return;

    setIsAccepting(true);
    setAcceptError(null);

    try {
      const res = await fetch("/api/tasks/accept-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: Number(listingId),
          submissionId: acceptingId,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as any).error || "Failed to accept submission");
      }

      // Reload the page so the accepted state and disabled actions
      // are fully reflected from the server.
      window.location.reload();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to accept submission";
      setAcceptError(message);
      setIsAccepting(false);
    }
  };

  const handleConfirmRequestChanges = async () => {
    if (requestingId == null) return;

    setIsRequesting(true);
    setRequestError(null);

    try {
      const res = await fetch("/api/tasks/request-changes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: Number(listingId),
          submissionId: requestingId,
          note: requestNote.trim() || null,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as any).error || "Failed to request changes");
      }

      handleUpdateStatus(requestingId, "resubmission_requested");
      setRequestingId(null);
      setRequestNote("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to request changes";
      setRequestError(message);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (rejectingId == null) return;

    setIsRejecting(true);
    setRejectError(null);

    try {
      const res = await fetch("/api/tasks/reject-submission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: Number(listingId),
          submissionId: rejectingId,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as any).error || "Failed to reject submission");
      }

      handleUpdateStatus(rejectingId, "rejected");
      setRejectingId(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject submission";
      setRejectError(message);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleConfirmDispute = async () => {
    if (disputeId == null) return;

    setIsSubmittingDispute(true);
    setDisputeError(null);

    try {
      const res = await fetch("/api/tasks/open-dispute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: Number(listingId),
          submissionId: disputeId,
          reason: disputeReason.trim() || null,
          description: disputeDescription.trim() || null,
          requestedAction: disputeOverturnAction,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as any).error || "Failed to open dispute");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === disputeId
            ? {
                ...submission,
                hasDispute: true,
                canOpenDispute: false,
                disputeStatus: "open",
              }
            : submission,
        ),
      );

      setDisputeId(null);
      setDisputeReason("");
      setDisputeDescription("");
      setDisputeOverturnAction("keep_task");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to open dispute";
      setDisputeError(message);
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Submissions</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review submissions for <strong>{listingTitle ?? `listing #${listingId}`}</strong>.
          </p>
          {isTaskAccepted && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              This task has been accepted. No further changes can be made.
            </p>
          )}
        </div>
        <Link
          href={`/listing/${listingId}`}
          className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)] self-start md:self-auto"
        >
          View Task
        </Link>
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

      <section className="space-y-3">
        {isLoading && submissions.length === 0 && !error && (
          <p className="text-sm text-[var(--text-secondary)]">
            Loading submissions...
          </p>
        )}

        {!isLoading && submissions.length === 0 && !error && (
          <p className="text-sm text-[var(--text-secondary)]">
            No submissions yet for this listing.
          </p>
        )}

        {submissions.map((submission) => {
          const hasFinal = !!submission.finalUrl;
          const isAccepted = submission.status === "accepted";
          const disputeStatus = (submission as any).disputeStatus ?? null;
          const isDisputeOpen = disputeStatus === "open";
          const isDisputeUpheld = disputeStatus === "resolved_upheld";

          const primaryUrl = isAccepted && hasFinal
            ? submission.finalUrl
            : submission.demoUrl || submission.finalUrl;

          const primaryLabel = isAccepted && hasFinal
            ? "Final submission"
            : submission.demoUrl
            ? "Demo submission"
            : "Final submission";

          const actionsDisabled =
            isTaskAccepted ||
            submission.status === "rejected" ||
            submission.status === "resubmission_requested" ||
            submission.status === "changes_requested";

          // Auto-accept only applies when there is a single submission
          // awaiting review (initial or resubmission) for the task. This
          // mirrors the backend auto-accept rule.
          let autoAcceptMessage: string | null = null;
          const isOnlySubmission = submissions.length === 1;
          const isAwaitingReview =
            submission.status === "pending" ||
            submission.status === "resubmission" ||
            !submission.status;

          if (isOnlySubmission && isAwaitingReview && !isTaskAccepted) {
            const submittedTime = new Date(submission.submittedAt).getTime();
            if (Number.isFinite(submittedTime)) {
              const autoAcceptTime = submittedTime + autoAcceptMs;
              const remainingMs = autoAcceptTime - nowMs;

              if (remainingMs > 0) {
                autoAcceptMessage = `Auto-accepts in ${formatCountdown(remainingMs)} if you take no action.`;
              } else {
                autoAcceptMessage =
                  "This submission is eligible for auto-accept and may be accepted at any time if no action is taken.";
              }
            }
          }

          return (
            <article
              key={submission.id}
              className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
            >
              <header className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {false && (
                    <h2 className="text-sm font-semibold">
                      Submission {submission.id}
                    </h2>
                  )}
                  <p className="text-xs text-[var(--text-secondary)]">
                    From {submission.submitterName} · Submitted {" "}
                    {formatDate(submission.submittedAt)}
                  </p>
                  <p className="bold text-[0.7rem] text-[var(--text-secondary)]">
                    Status: {statusLabel(submission.status)}
                    {isDisputeOpen && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-amber-400">
                        Dispute open
                      </span>
                    )}
                    {isDisputeUpheld && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-[var(--danger-less-saturated)]/40 bg-[var(--danger-less-saturated)]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--danger-less-saturated)]">
                        Dispute resolved (upheld)
                      </span>
                    )}
                    {autoAcceptMessage && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        {autoAcceptMessage}
                      </span>
                    )}
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
                  {isAccepted && submission.demoUrl && submission.finalUrl && (
                    <p className="mt-1 text-[0.65rem] text-[var(--text-muted)]">
                      <a
                        href={submission.demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline-offset-2 hover:underline"
                      >
                        View demo version
                      </a>
                    </p>
                  )}
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
                {!actionsDisabled && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRejectConfirm(submission.id)}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--danger)] bg-[var(--danger)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenRequestChanges(submission.id)}
                      className="inline-flex items-center justify-center rounded-full border border-[var(--warning)] bg-[var(--warning)] px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAcceptConfirm(submission.id)}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                    >
                      Accept Submission
                    </button>
                  </>
                )}
                {submission.status === "accepted" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (disputeId === submission.id) {
                        setDisputeId(null);
                        setDisputeReason("");
                        setDisputeDescription("");
                        setDisputeOverturnAction("keep_task");
                      } else {
                        handleOpenDispute(submission.id);
                      }
                    }}
                    disabled={
                      submission.hasDispute === true ||
                      submission.canOpenDispute === false ||
                      isSubmittingDispute
                    }
                    className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 text-xs font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-muted)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDisputeOpen
                      ? "Dispute opened"
                      : isDisputeUpheld
                        ? "Dispute resolved (upheld)"
                        : submission.canOpenDispute === false
                          ? "Dispute window ended"
                          : "Open Dispute"}
                  </button>
                )}
              </footer>

              {disputeId === submission.id && (
                <div className="mt-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)]/80 p-3 space-y-2">
                  <p className="text-[0.75rem] font-semibold text-[var(--text-primary)]">
                    Open Dispute
                  </p>
                  <div className="space-y-1">
                    <label className="block text-[0.7rem] font-medium text-[var(--text-secondary)]">
                      Reason
                    </label>
                    <select
                      className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-[0.75rem] text-[var(--text-primary)]"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                    >
                      <option value="">Select a reason</option>
                      <option value="low_quality">Low quality work</option>
                      <option value="not_as_described">Not as described</option>
                      <option value="spam_or_fraud">Spam or fraudulent</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[0.7rem] font-medium text-[var(--text-secondary)]">
                      Description
                    </label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-[0.75rem] text-[var(--text-primary)]"
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      placeholder="Explain what went wrong with this submission."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[0.7rem] font-medium text-[var(--text-secondary)]">
                      Requested action if dispute is successful
                    </label>
                    <select
                      className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-[0.75rem] text-[var(--text-primary)]"
                      value={disputeOverturnAction}
                      onChange={(e) => setDisputeOverturnAction(e.target.value)}
                    >
                      <option value="keep_task">Keep task listed</option>
                      <option value="delete_task">Remove task listing</option>
                    </select>
                    <p className="mt-1 text-[0.65rem] text-[var(--text-secondary)]">
                      If your dispute is successful, we&apos;ll refund this task and apply the selected action to the listing (either keep it live or remove it). Your refund will be given via your stripe account, so please ensure you have a valid stripe account connected and have completed onboarding to receive dispute refunds (Go to the Hub earnings section for more details).
                    </p>
                  </div>
                  {disputeError && (
                    <p className="text-[0.7rem] text-[var(--danger)]">{disputeError}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeId(null);
                        setDisputeReason("");
                        setDisputeDescription("");
                      }}
                      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-[0.7rem] font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDispute}
                      disabled={isSubmittingDispute}
                      className="rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-[0.7rem] font-semibold text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingDispute ? "Opening..." : "Submit Dispute"}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>
      {rejectingId !== null && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
          onClick={() => {
            if (!isRejecting) setRejectingId(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-submission-title"
          >
            <h2
              id="reject-submission-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Reject this submission?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This action cannot be undone. The submitter will not be able to
              start this task again.
            </p>
            {rejectError && (
              <p className="mt-2 text-xs text-[var(--danger)]">{rejectError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                disabled={isRejecting}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-70"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {isRejecting ? "Rejecting..." : "Yes, Reject Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
      {acceptingId !== null && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
          onClick={() => {
            if (!isAccepting) setAcceptingId(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="accept-submission-title"
          >
            <h2
              id="accept-submission-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Accept this submission?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This action cannot be undone. You will get the submission's final file/link (if applicable) and the submitter will receive the reward for this task. All other pending submissions for this task will be automatically rejected.
            </p>
            {acceptError && (
              <p className="mt-2 text-xs text-[var(--danger)]">{acceptError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAcceptingId(null)}
                disabled={isAccepting}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-70"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={isAccepting}
                className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
              >
                {isAccepting ? "Accepting..." : "Yes, Accept Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
      {requestingId !== null && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center"
          onClick={() => {
            if (!isRequesting) setRequestingId(null);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-xl bg-[var(--bg-secondary)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-changes-title"
          >
            <h2
              id="request-changes-title"
              className="text-base font-semibold text-[var(--text-primary)]"
            >
              Request changes for this submission?
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This action is final. The submitter will be asked to resubmit
              an updated version based on your notes.
            </p>
            <label className="mt-4 block text-xs font-semibold text-[var(--text-secondary)]">
              Feedback for the submitter
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                placeholder="Let them know what to improve or change."
              />
            </label>
            {requestError && (
              <p className="mt-2 text-xs text-[var(--danger)]">{requestError}</p>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRequestingId(null)}
                disabled={isRequesting}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] disabled:opacity-70"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestChanges}
                disabled={isRequesting}
                className="rounded-lg bg-[var(--warning)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {isRequesting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
