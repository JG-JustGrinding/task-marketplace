import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "task-submissions";

// Keep this in sync with other submission status usages in the app
// (e.g. hub dashboard, task activations).
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "A valid numeric id is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Ensure the current user is the owner of this task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id")
      .eq("id", numericId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to view submissions for this task." },
        { status: 403 },
      );
    }

    const { data: submissionsData, error: submissionsError } = await supabase
      .from("task_submissions")
      .select(
        "id, task_id, user_id, demo_submission, final_submission, note, created_at, status",
      )
      .eq("task_id", numericId)
      .not("status", "eq", "rejected")
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.error("Error fetching task_submissions", submissionsError);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 },
      );
    }

    const submissions = submissionsData ?? [];

    if (submissions.length === 0) {
      return NextResponse.json({ submissions: [] }, { status: 200 });
    }

    const submissionIds = Array.from(
      new Set<number>((submissions as any[]).map((s) => s.id as number)),
    );

    // Fetch submitter profile names in a second query to avoid
    // relying on specific foreign key relationship names.
    const submitterIds = Array.from(
      new Set<string>(submissions.map((s: any) => s.user_id).filter(Boolean)),
    );

    let profilesById = new Map<string, { id: string; username: string | null }>();

    if (submitterIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", submitterIds);

      if (profilesError) {
        console.error("Error fetching profiles for submissions", profilesError);
      } else if (profilesData) {
        profilesById = new Map(
          profilesData.map((p) => [p.id as string, { id: p.id as string, username: p.username as string | null }]),
        );
      }
    }

    // Use the admin client to load any related task_earnings rows so we can
    // determine whether the dispute window has expired, and any disputes that
    // already exist for these submissions.
    const admin = createAdminClient();

    const earningsBySubmissionId = new Map<number, { createdAt: string }>();

    if (submissionIds.length > 0) {
      const { data: earningsData, error: earningsError } = await admin
        .from("task_earnings")
        .select("id, submission_id, created_at")
        .in("submission_id", submissionIds);

      if (earningsError) {
        console.error("Error fetching task_earnings for submissions", earningsError);
      } else if (earningsData) {
        for (const row of earningsData as any[]) {
          const sid = row.submission_id as number | null;
          const createdAt = row.created_at as string | null;
          if (!sid || !createdAt) continue;

          // If there are multiple earnings rows for some reason, keep the
          // earliest created_at value.
          const existing = earningsBySubmissionId.get(sid);
          if (!existing || new Date(createdAt).getTime() < new Date(existing.createdAt).getTime()) {
            earningsBySubmissionId.set(sid, { createdAt });
          }
        }
      }
    }

    const disputesBySubmissionId = new Map<number, string | null>();

    if (submissionIds.length > 0) {
      const { data: disputesData, error: disputesError } = await admin
        .from("task_submission_disputes")
        .select("id, submission_id, status")
        .in("submission_id", submissionIds);

      if (disputesError) {
        console.error("Error fetching task_submission_disputes", disputesError);
      } else if (disputesData) {
        for (const row of disputesData as any[]) {
          const sid = row.submission_id as number | null;
          const status = (row.status as string | null) ?? null;
          if (!sid) continue;
          // There should only be one dispute per submission because the
          // open-dispute route enforces this, but if there are multiple,
          // we simply keep the last seen status.
          disputesBySubmissionId.set(sid, status);
        }
      }
    }

    const result: Array<{
      id: number;
      submitterName: string;
      submittedAt: string;
      demoUrl: string | null;
      finalUrl: string | null;
      note: string | null;
      status: SubmissionStatus;
      canOpenDispute: boolean;
      hasDispute: boolean;
      disputeStatus: string | null;
    }> = [];

    for (const s of submissions as any[]) {
      const profile = profilesById.get(s.user_id as string);

      const rawDemo = (s.demo_submission as string | null) ?? null;
      const rawFinal = (s.final_submission as string | null) ?? null;

      const resolveUrl = async (value: string | null) => {
        if (!value) return null;

        // If the value looks like an absolute URL (e.g. external link),
        // return it as-is. Otherwise, treat it as a Storage object path
        // and create a short-lived signed URL from the private bucket.
        if (/^https?:\/\//i.test(value)) {
          return value;
        }

        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(value, 60 * 60); // 1 hour

        if (error) {
          console.error(
            "Error creating signed URL for submission object",
            { value, error },
          );
          return null;
        }

        return data?.signedUrl ?? null;
      };

      const demoUrl = await resolveUrl(rawDemo);
      const finalUrl = await resolveUrl(rawFinal);

      const earningsInfo = earningsBySubmissionId.get(s.id as number);
      const disputeStatus = disputesBySubmissionId.get(s.id as number) ?? null;
      const hasDispute = disputeStatus !== null && disputeStatus !== undefined;

       let disputeWindowExpired = true;
       if (earningsInfo?.createdAt) {
         const createdTime = new Date(earningsInfo.createdAt).getTime();
         const nowTime = Date.now();
         if (Number.isFinite(createdTime)) {
           const diffMs = nowTime - createdTime;
           const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
           disputeWindowExpired = diffMs > twoDaysMs;
         }
       }

       const canOpenDispute = !!earningsInfo && !disputeWindowExpired && !hasDispute;

      result.push({
        id: s.id as number,
        submitterName: profile?.username || "Marketplace user",
        submittedAt: s.created_at as string,
        demoUrl,
        finalUrl,
        note: (s.note as string | null) ?? null,
        status: (s.status as SubmissionStatus) ?? "pending",
        canOpenDispute,
        hasDispute,
        disputeStatus,
      });
    }

    return NextResponse.json({ submissions: result }, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/tasks/[id]/submissions", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
