"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SubmittedTasksList from "./SubmittedTasksList";

type Task = {
  id: number;
  title: string;
  short_description: string | null;
  price: number;
  categories: string[] | null;
  status?: string | null;
  created_at: string;
};

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

type TaskSubmission = {
  id: number;
  task_id: number;
  status: SubmissionStatus;
  created_at: string;
  is_hidden?: boolean | null;
};

type HubDashboardProps = {
  createdTasks: Task[];
  createdSubmissions: TaskSubmission[];
  mySubmissions: TaskSubmission[];
  submittedTasks: Task[];
  createdError: boolean;
  hasRealCreated: boolean;
  hasRealSubmitted: boolean;
  availableBalanceCents: number;
  hasStripeAccount: boolean;
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

function useSubmissionsByTask(submissions: TaskSubmission[]) {
  return useMemo(() => {
    const map = new Map<number, TaskSubmission[]>();
    for (const s of submissions) {
      const existing = map.get(s.task_id) ?? [];
      existing.push(s);
      map.set(s.task_id, existing);
    }
    return map;
  }, [submissions]);
}

function useEarningsSummary(
  createdTasks: Task[],
  createdSubmissionsByTask: Map<number, TaskSubmission[]>
) {
  return useMemo(() => {
    let available = 0;
    let pending = 0;

    for (const task of createdTasks) {
      const subs = createdSubmissionsByTask.get(task.id) ?? [];
      const hasAccepted = subs.some((s) => s.status === "accepted");
      const hasPending = subs.some((s) => s.status === "pending");

      if (hasAccepted) {
        available += task.price;
      } else if (hasPending) {
        pending += task.price;
      }
    }

    return { available, pending };
  }, [createdTasks, createdSubmissionsByTask]);
}

export default function HubDashboard({
  createdTasks,
  createdSubmissions,
  mySubmissions,
  submittedTasks,
  createdError,
  hasRealCreated,
  hasRealSubmitted,
  availableBalanceCents,
  hasStripeAccount,
}: HubDashboardProps) {
  const [view, setView] = useState<"activity" | "earnings">("activity");

  const createdSubmissionsByTask = useSubmissionsByTask(createdSubmissions);
  const { pending } = useEarningsSummary(createdTasks, createdSubmissionsByTask);

  const available = (availableBalanceCents ?? 0) / 100;

  const someoneHasCreatedTasks = createdTasks.length > 0;

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl md:text-2xl font-semibold">Your hub</h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)]">
          Track your tasks and earnings in one place.
        </p>
      </header>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 p-0.5 text-[0.7rem]">
          <button
            type="button"
            onClick={() => setView("activity")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
              view === "activity"
                ? "bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
            }`}
          >
            Activity
          </button>
          <button
            type="button"
            onClick={() => setView("earnings")}
            className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
              view === "earnings"
                ? "bg-[var(--bg-primary)] text-[var(--accent-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
            }`}
          >
            Earnings
          </button>
        </div>
      </div>

      {view === "activity" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Created tasks */}
          <section className="card space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">Tasks you posted</h2>
                <p className="text-[0.7rem] text-[var(--text-secondary)]">
                  See who&apos;s working on your tasks and review submissions.
                </p>
              </div>
              <Link
                href="/create"
                className="button none px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white text-[0.7rem] font-semibold hover:bg-[var(--accent-hover)]"
              >
                Post new
              </Link>
            </div>

            {createdError && (
              <p className="text-xs text-[var(--danger)]">
                There was a problem loading your tasks.
              </p>
            )}

            {!createdError && !hasRealCreated && !someoneHasCreatedTasks && (
              <p className="text-xs text-[var(--text-secondary)]">
                You haven&apos;t posted any tasks yet. When you do, they&apos;ll show up
                here with who&apos;s started and any submissions.
              </p>
            )}

            <div className="space-y-3 max-h-[480px] overflow-y-auto scrollbar-thin pr-1">
              {createdTasks.map((task) => {
                const submissions = createdSubmissionsByTask.get(task.id) ?? [];
                const totalSubs = submissions.length;
                const acceptedSub = submissions.find(
                  (s) => s.status === "accepted"
                );
                const pendingSub = submissions.find(
                  (s) => s.status === "pending"
                );
                const isFinished = !!acceptedSub;

                let statusLabel = "Open";
                let statusClass =
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase bg-[var(--bg-muted)] text-[var(--text-secondary)]";

                // If the task is awaiting funding, surface that explicitly.
                if (task.status === "pending_payment") {
                  statusLabel = "Pending payment";
                  statusClass =
                    "badge-warning inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";
                } else if (totalSubs > 0) {
                  if (isFinished) {
                    statusLabel = "Finished";
                    statusClass =
                      "badge-success inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";
                  } else if (pendingSub) {
                    statusLabel = "In progress";
                    statusClass =
                      "badge-warning inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";
                  } else {
                    statusLabel =
                      "Has submission" + (totalSubs > 1 ? "s" : "");
                    statusClass =
                      "badge-success inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-wide uppercase";
                  }
                }

                const someoneStarted = totalSubs > 0;

                return (
                  <article
                    key={task.id}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {task.title}
                        </h3>
                        {task.short_description && (
                          <p className="mt-1 text-[0.7rem] text-[var(--text-secondary)] line-clamp-2">
                            {task.short_description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {task.categories?.slice(0, 3).map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-2 py-0.5 text-[0.6rem] font-medium text-[var(--text-secondary)]"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold">
                          ${task.price.toLocaleString()}
                        </span>
                        <span className={statusClass}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-2 text-[0.65rem] text-[var(--text-secondary)]">
                      <div className="flex flex-col">
                        {totalSubs !== 1 && (
                          <span>
                            {someoneStarted
                              ? `${totalSubs} submission${
                                  totalSubs === 1 ? "" : "s"
                                }`
                              : "No submissions yet"}
                          </span>
                        )}
                        <span>Posted {formatDate(task.created_at)}</span>
                      </div>
                      <div className="flex gap-2">
                        {someoneStarted && (
                          <Link
                            href={`/listing/${task.id}/submissions`}
                            className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                          >
                            View submissions
                          </Link>
                        )}
                        {!isFinished && (
                          <Link
                            href={`/listing/${task.id}`}
                            className="text-[0.7rem] font-semibold text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
                          >
                            View task
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Submitted tasks */}
          <section className="card space-y-4">
            <div>
              <h2 className="text-sm font-semibold">Tasks you have started</h2>
              <p className="text-[0.7rem] text-[var(--text-secondary)]">
		        Track the status of tasks you&apos;re working on.
              </p>
            </div>

            {!hasRealSubmitted && mySubmissions.length === 0 && (
              <p className="text-xs text-[var(--text-secondary)]">
		        You haven&apos;t started any tasks yet. When you do, each task
		        and its status will appear here.
              </p>
            )}

            <SubmittedTasksList
              submissions={mySubmissions}
              tasks={submittedTasks}
            />
          </section>
        </div>
      ) : (
        <section className="mt-6 space-y-4">
          {!hasStripeAccount ? (
            <div className="card flex flex-col gap-3">
              <h2 className="text-sm font-semibold">Set up payouts</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                To access your earnings dashboard and withdraw funds, you&apos;ll
                need to create a Stripe connected account. This keeps payouts
                secure and compliant.
              </p>
              <ul className="list-disc pl-5 text-[0.7rem] text-[var(--text-secondary)] space-y-1">
                <li>Securely verify your identity with Stripe.</li>
                <li>Receive payouts directly to your bank account.</li>
                <li>Manage tax and compliance information in one place.</li>
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/account/create-stripe-account", {
                        method: "POST",
                      });

                      const data = await res.json().catch(() => ({}));

                      if (!res.ok || !data?.url) {
                        window.alert(
                          data?.error ||
                            "There was a problem starting Stripe onboarding. Please try again."
                        );
                        return;
                      }

                      window.location.href = data.url as string;
                    } catch (err) {
                      console.error("Error creating Stripe account link", err);
                      window.alert(
                        "Unexpected error starting Stripe onboarding. Please try again."
                      );
                    }
                  }}
                  className="inline-flex items-center rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-[0.75rem] font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Create Stripe account
                </button>
                <p className="text-[0.65rem] text-[var(--text-muted)]">
                  Once your Stripe account is connected, you&apos;ll see your
                  payout balance and pending earnings here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <article className="card flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Payout balance
                </h2>
                <p className="text-2xl font-semibold">
                  ${available.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[0.7rem] text-[var(--text-secondary)]">
                  Available to withdraw to your bank account.
                </p>
              </article>

              <article className="card flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Pending earnings
                </h2>
                <p className="text-2xl font-semibold">
                  ${pending.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-[0.7rem] text-[var(--text-secondary)]">
                  Earnings that have not arrived yet. These earnings typically appear in your balance in a few days after a submission is accepted.
                </p>
              </article>

              <article className="card flex flex-col gap-3">
                <h2 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Withdraw funds
                </h2>
                <p className="text-[0.7rem] text-[var(--text-secondary)]">
                  Payouts are processed via Stripe and typically arrive within
                  a few business days.
                </p>
                <button
                  type="button"
                  disabled={available <= 0 || !hasStripeAccount}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/account/withdraw", {
                        method: "POST",
                      });

                      const data = await res.json().catch(() => ({}));

                      if (!res.ok) {
                        window.alert(
                          data?.error ||
                            "We couldn't start your withdrawal. Please check your payouts setup and try again."
                        );
                        return;
                      }

                      window.alert(
                        "Withdrawal requested. Funds will be sent to your connected Stripe account."
                      );

                      // Simple approach: refresh to show updated balance.
                      window.location.reload();
                    } catch (err) {
                      console.error("Error starting withdrawal", err);
                      window.alert(
                        "Unexpected error starting withdrawal. Please try again later."
                      );
                    }
                  }}
                  className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    available > 0 && hasStripeAccount
                      ? "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                      : "bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                  }`}
                >
                  Withdraw to bank
                </button>
              </article>
            </div>
          )}
        </section>
      )}
    </>
  );
}
