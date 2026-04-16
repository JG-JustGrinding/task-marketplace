"use client";

import { useMemo, useState } from "react";

type AdminEarning = {
  id: number;
  task_id: number | null;
  submitter_id: string | null;
  amount_cents: number;
  created_at: string | null;
  claimed_at: string | null;
};

type Props = {
  earnings: AdminEarning[];
  adminSecret: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function AdminEarningsClient({ earnings, adminSecret }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localEarnings, setLocalEarnings] = useState<AdminEarning[]>(earnings);

  const { totalAll, totalUnclaimed, totalClaimed, unclaimedCount } = useMemo(() => {
    let totalAllCents = 0;
    let totalUnclaimedCents = 0;
    let totalClaimedCents = 0;
    let unclaimed = 0;

    for (const e of localEarnings) {
      const amount = Number(e.amount_cents ?? 0);
      totalAllCents += amount;
      if (e.claimed_at) {
        totalClaimedCents += amount;
      } else {
        totalUnclaimedCents += amount;
        unclaimed += 1;
      }
    }

    return {
      totalAll: totalAllCents / 100,
      totalUnclaimed: totalUnclaimedCents / 100,
      totalClaimed: totalClaimedCents / 100,
      unclaimedCount: unclaimed,
    };
  }, [localEarnings]);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllUnclaimed = () => {
    const next = new Set<number>();
    for (const e of localEarnings) {
      if (!e.claimed_at) {
        next.add(e.id);
      }
    }
    setSelectedIds(next);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleMarkClaimed = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const ids = Array.from(selectedIds);

      const res = await fetch("/api/admin/earnings/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message =
          (body && (body.error as string)) || "Failed to mark earnings as claimed.";
        throw new Error(message);
      }

      const body = (await res.json().catch(() => ({}))) as {
        claimedAt?: string;
      };

      const claimedAt = body?.claimedAt || new Date().toISOString();

      setLocalEarnings((prev) =>
        prev.map((e) =>
          selectedIds.has(e.id)
            ? {
                ...e,
                claimed_at: claimedAt,
              }
            : e,
        ),
      );

      setSuccessMessage(
        `Marked ${selectedIds.size} entr${
          selectedIds.size === 1 ? "y" : "ies"
        } as claimed.`,
      );
      setSelectedIds(new Set());
    } catch (err: any) {
      setError(err?.message || "Unexpected error while marking claimed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Platform Earnings Overview</h2>
          <p className="text-[0.7rem] text-[var(--text-secondary)]">
            This is an internal-only view of all rows in the platform_earnings table.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 text-[0.7rem] text-[var(--text-secondary)] md:items-end">
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Total Unclaimed:
            </span>{" "}
            ${totalUnclaimed.toFixed(2)} ({unclaimedCount} entries)
          </div>
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Total Claimed:
            </span>{" "}
            ${totalClaimed.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold text-[var(--text-primary)]">
              Total All Time:
            </span>{" "}
            ${totalAll.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
        <button
          type="button"
          onClick={selectAllUnclaimed}
          className="button none px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting || localEarnings.length === 0}
        >
          Select All Unclaimed
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="button none px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-semibold hover:text-[var(--accent-primary)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting || selectedIds.size === 0}
        >
          Clear Selection
        </button>
        <button
          type="button"
          onClick={handleMarkClaimed}
          className="button none px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white font-semibold hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isSubmitting || selectedIds.size === 0}
        >
          {isSubmitting ? "Marking as Claimed..." : "Mark Selected as Claimed"}
        </button>
        {selectedIds.size > 0 && (
          <span className="text-[0.7rem] text-[var(--text-secondary)]">
            {selectedIds.size} entr{selectedIds.size === 1 ? "y" : "ies"} selected
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-[var(--danger)]">{error}</p>
      )}
      {successMessage && (
        <p className="text-xs text-[var(--success)]">{successMessage}</p>
      )}

      <div className="mt-2 max-h-[480px] overflow-auto border border-[var(--border-color)] rounded-xl bg-[var(--bg-secondary)]">
        <table className="min-w-full text-[0.7rem]">
          <thead className="sticky top-0 bg-[var(--bg-secondary)] z-10">
            <tr className="border-b border-[var(--border-color)]">
              <th className="px-2 py-2 text-left">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-2 py-2 text-left">ID</th>
              <th className="px-2 py-2 text-left">Task</th>
              <th className="px-2 py-2 text-left">Submitter</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-2 py-2 text-left">Created</th>
              <th className="px-2 py-2 text-left">Claimed at</th>
            </tr>
          </thead>
          <tbody>
            {localEarnings.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-4 text-center text-[var(--text-secondary)]"
                >
                  No task_earnings rows found.
                </td>
              </tr>
            ) : (
              localEarnings.map((e) => {
                const isUnclaimed = !e.claimed_at;
                const isSelected = selectedIds.has(e.id);
                const amountDollars = (Number(e.amount_cents ?? 0) / 100).toFixed(2);

                return (
                  <tr
                    key={e.id}
                    className={`border-t border-[var(--border-color)] ${
                      isUnclaimed ? "bg-[var(--bg-primary)]/40" : ""
                    }`}
                  >
                    <td className="px-2 py-2 align-top">
                      <input
                        type="checkbox"
                        className="h-3 w-3 rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                        checked={isSelected}
                        onChange={() => toggleSelection(e.id)}
                        disabled={!isUnclaimed || isSubmitting}
                      />
                    </td>
                    <td className="px-2 py-2 align-top font-mono text-[0.7rem] text-[var(--text-secondary)]">
                      {e.id}
                    </td>
                    <td className="px-2 py-2 align-top font-mono text-[0.7rem] text-[var(--text-secondary)]">
                      {e.task_id ?? "-"}
                    </td>
                    <td className="px-2 py-2 align-top font-mono text-[0.7rem] text-[var(--text-secondary)]">
                      {e.submitter_id ?? "-"}
                    </td>
                    <td className="px-2 py-2 align-top text-right font-mono text-[0.7rem]">
                      ${amountDollars}
                    </td>
                    <td className="px-2 py-2 align-top text-[0.7rem]">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-2 py-2 align-top text-[0.7rem] text-[var(--text-secondary)]">
                      {formatDateTime(e.claimed_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
