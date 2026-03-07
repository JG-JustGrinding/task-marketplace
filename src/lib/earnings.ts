import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Move any pending task_earnings that have passed their available_at time
 * into the user's available_balance_cents, and decrease pending_balance_cents
 * accordingly.
 */
export async function maturePendingEarningsForUser(userId: string) {
  try {
    const admin = createAdminClient();

    const nowIso = new Date().toISOString();

    const { data: earnings, error: earningsError } = await admin
      .from("task_earnings")
      .select("id, amount_cents, submission_id")
      .eq("submitter_id", userId)
      .eq("status", "pending")
      .lte("available_at", nowIso);

    if (earningsError) {
      console.error("Error loading pending task_earnings for maturation", earningsError);
      return;
    }

    if (!earnings || earnings.length === 0) {
      return;
    }

    // If any of these earnings are currently under dispute, they should not
    // be matured into the available balance yet.
    const submissionIds = (earnings as any[])
      .map((row) => (row as any).submission_id as string | number | null)
      .filter((id) => id != null);

    let disputedSubmissionIds = new Set<string | number>();
    if (submissionIds.length > 0) {
      const { data: disputedRows, error: disputedError } = await admin
        .from("task_submission_disputes")
        .select("submission_id")
        .eq("worker_id", userId)
        .eq("status", "open")
        .in("submission_id", submissionIds as any[]);

      if (disputedError) {
        console.error("Error checking disputes before maturation", disputedError);
      } else {
        for (const row of disputedRows ?? []) {
          const sid = (row as any).submission_id as string | number | null;
          if (sid != null) {
            disputedSubmissionIds.add(sid);
          }
        }
      }
    }

    const eligibleEarnings = (earnings as any[]).filter((row) => {
      const sid = (row as any).submission_id as string | number | null;
      if (sid == null) return true;
      return !disputedSubmissionIds.has(sid);
    });

    if (eligibleEarnings.length === 0) {
      return;
    }

    const totalMatured = eligibleEarnings.reduce((sum, row: any) => {
      const amtRaw = (row as any).amount_cents;
      const amt = Number.isFinite(amtRaw) ? (amtRaw as number) : Number(amtRaw ?? 0);
      return sum + (Number.isFinite(amt) ? amt : 0);
    }, 0);

    if (!Number.isFinite(totalMatured) || totalMatured <= 0) {
      return;
    }

    const ids = eligibleEarnings.map((row: any) => row.id).filter((id) => id != null);

    if (ids.length === 0) {
      return;
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("available_balance_cents, pending_balance_cents")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error loading profile for earnings maturation", profileError);
      return;
    }

    const availableRaw = (profile as any).available_balance_cents;
    const pendingRaw = (profile as any).pending_balance_cents;

    const currentAvailable = Number.isFinite(availableRaw)
      ? (availableRaw as number)
      : Number(availableRaw ?? 0);
    const currentPending = Number.isFinite(pendingRaw)
      ? (pendingRaw as number)
      : Number(pendingRaw ?? 0);

    const newAvailable = currentAvailable + totalMatured;
    const newPending = Math.max(0, currentPending - totalMatured);

    const { error: updateProfileError } = await admin
      .from("profiles")
      .update({
        available_balance_cents: newAvailable,
        pending_balance_cents: newPending,
      })
      .eq("id", userId);

    if (updateProfileError) {
      console.error("Error updating profile balances during earnings maturation", updateProfileError);
    }

    const { error: updateEarningsError } = await admin
      .from("task_earnings")
      .update({ status: "available" })
      .in("id", ids);

    if (updateEarningsError) {
      console.error("Error updating task_earnings status to available", updateEarningsError);
    }
  } catch (err) {
    console.error("Unexpected error maturing pending earnings", err);
  }
}
