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
};

export default function ListingSubmissionsClient({
  listingId,
  listingTitle,
  isTaskAccepted = false,
}: ListingSubmissionsClientProps) {
  const [submissions, setSubmissions] = useState<ListingSubmission[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  useEffect(() => {
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
  }, [listingId]);

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
    } finally {
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
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
          className="text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
        >
          View task
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
              {!actionsDisabled && (
                <footer className="mt-1 flex flex-wrap items-center gap-2">
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
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAcceptConfirm(submission.id)}
                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Accept submission
                  </button>
                </footer>
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
                Go back
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isRejecting}
                className="rounded-lg bg-[var(--danger)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {isRejecting ? "Rejecting..." : "Yes, reject submission"}
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
                Go back
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={isAccepting}
                className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
              >
                {isAccepting ? "Accepting..." : "Yes, accept submission"}
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
                Go back
              </button>
              <button
                type="button"
                onClick={handleConfirmRequestChanges}
                disabled={isRequesting}
                className="rounded-lg bg-[var(--warning)] px-3 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-70"
              >
                {isRequesting ? "Sending..." : "Send request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
