import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { queueNotification } from "@/lib/notifications";

const MAX_FILE_BYTES = 30 * 1024 * 1024; // 30 MB
const STORAGE_BUCKET = "task-submissions";

async function uploadToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
  pathPrefix: string,
) {
  if (file.size > MAX_FILE_BYTES) {
    return {
      error: `File size must be <= 30MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
      path: null as string | null,
    };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const filePath = `${pathPrefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${safeName || "file"}`;

  const { error: uploadError, data: uploadData } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });

  if (uploadError || !uploadData?.path) {
    return {
      error: uploadError?.message || "Failed to upload file",
      path: null as string | null,
    };
  }

  // For a private bucket we only store the object path. Later,
  // API routes create short-lived signed URLs when returning data
  // to the client.
  return { error: null as string | null, path: uploadData.path as string };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const taskIdRaw = formData.get("taskId");
    const note = (formData.get("note") as string | null)?.trim() || null;

    const demoFileRaw = formData.get("demoFile");
    const finalFileRaw = formData.get("finalFile");
    const demoLinkRaw = formData.get("demoLink");
    const finalLinkRaw = formData.get("finalLink");

    const taskId = typeof taskIdRaw === "string" ? Number(taskIdRaw) : NaN;

    if (!Number.isFinite(taskId)) {
      return NextResponse.json(
        { error: "A valid taskId is required." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Determine whether this submission is a resubmission based on the
    // current activation status for this user & task.
    const { data: activation, error: activationFetchError } = await supabase
      .from("task_activations")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("task_id", taskId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activationFetchError) {
      console.error("Error fetching task activation for submission", activationFetchError);
    }

    if (!activation) {
      return NextResponse.json(
        { error: "You must activate this task before submitting." },
        { status: 400 },
      );
    }

    const activationStatus = (activation as any).status as string | null;

    // Load the task so we can notify the owner when submissions arrive.
    let taskOwnerId: string | null = null;
    let taskTitle: string | null = null;

    const { data: taskRow, error: taskError } = await supabase
      .from("tasks")
      .select("id, user_id, title")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) {
      console.error("Error loading task for task_submitted notification", taskError);
    } else if (taskRow && (taskRow as any).user_id) {
      taskOwnerId = (taskRow as any).user_id as string;
      taskTitle = (taskRow as any).title as string | null;
    }

    if (
      activationStatus === "cancelled" ||
      activationStatus === "rejected" ||
      activationStatus === "accepted"
    ) {
      return NextResponse.json(
        { error: "You cannot submit work for this task in its current state." },
        { status: 400 },
      );
    }

    if (activationStatus === "pending" || activationStatus === "resubmission") {
      return NextResponse.json(
        { error: "You already have a submission pending review for this task." },
        { status: 400 },
      );
    }

    const isResubmission = activationStatus === "resubmission_requested";

    const demoFile = demoFileRaw instanceof File ? demoFileRaw : null;
    const finalFile = finalFileRaw instanceof File ? finalFileRaw : null;
    const demoLink =
      typeof demoLinkRaw === "string" && demoLinkRaw.trim()
        ? demoLinkRaw.trim()
        : null;
    const finalLink =
      typeof finalLinkRaw === "string" && finalLinkRaw.trim()
        ? finalLinkRaw.trim()
        : null;

    // Final submission is required (either a file or a link).
    if (!finalFile && !finalLink) {
      return NextResponse.json(
        { error: "A final file or final link is required." },
        { status: 400 },
      );
    }

    // These values may be either a Supabase Storage object path
    // (for uploaded files) or an external URL (for link-based
    // submissions). Downstream readers decide whether to sign or
    // use the value directly based on its shape.
    let demoSubmissionUrl: string | null = null;
    let finalSubmissionUrl: string | null = null;

    const basePrefix = `${user.id}/${taskId}`;

    if (demoFile) {
      const { error, path } = await uploadToStorage(
        supabase,
        demoFile,
        `${basePrefix}/demo`,
      );
      if (error || !path) {
        return NextResponse.json({ error }, { status: 400 });
      }
      demoSubmissionUrl = path;
    } else if (demoLink) {
      demoSubmissionUrl = demoLink;
    }

    if (finalFile) {
      const { error, path } = await uploadToStorage(
        supabase,
        finalFile,
        `${basePrefix}/final`,
      );
      if (error || !path) {
        return NextResponse.json({ error }, { status: 400 });
      }
      finalSubmissionUrl = path;
    } else if (finalLink) {
      finalSubmissionUrl = finalLink;
    }

    if (!finalSubmissionUrl) {
      return NextResponse.json(
        { error: "A final submission URL could not be determined." },
        { status: 400 },
      );
    }

    let submission;

    if (isResubmission) {
      // For resubmissions, update the most recent submission row for this
      // user/task instead of inserting a brand new row. This keeps the
      // creator and submitter views in sync and avoids duplicate entries.
      const { data: existingSubmission, error: existingError } = await supabase
        .from("task_submissions")
        .select("id")
        .eq("task_id", taskId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error("Error fetching existing submission for resubmission", existingError);
      }

      if (existingSubmission) {
        const { data: updated, error: updateError } = await supabase
          .from("task_submissions")
          .update({
            demo_submission: demoSubmissionUrl,
            final_submission: finalSubmissionUrl,
            note,
            // Treat a resubmission as a fresh submission for timing logic
            // like auto-accept windows by bumping the created_at timestamp.
            status: "resubmission",
            created_at: new Date().toISOString(),
          })
          .eq("id", existingSubmission.id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating existing task_submissions row for resubmission", updateError);
          return NextResponse.json(
            { error: "Failed to save resubmission" },
            { status: 500 },
          );
        }

        submission = updated;
      } else {
        // Fallback: if we couldn't find an existing row, create one but
        // mark it explicitly as a resubmission.
        const { data: inserted, error: insertError } = await supabase
          .from("task_submissions")
          .insert({
            task_id: taskId,
            user_id: user.id,
            demo_submission: demoSubmissionUrl,
            final_submission: finalSubmissionUrl,
            note,
            status: "resubmission",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error inserting task_submissions row for resubmission", insertError);
          return NextResponse.json(
            { error: "Failed to save resubmission" },
            { status: 500 },
          );
        }

        submission = inserted;
      }

      const { error: activationError } = await supabase
        .from("task_activations")
        .update({ status: "resubmission", resubmission_message: null })
        .eq("user_id", user.id)
        .eq("task_id", taskId);

      if (activationError) {
        console.error(
          "Error updating task_activations status to resubmission",
          activationError,
        );
        return NextResponse.json(
          { error: "Resubmission saved but failed to update activation status" },
          { status: 500 },
        );
      }
    } else {
      // First-time submissions: insert a new row and mark the activation
      // as pending review.
      const { data: inserted, error: insertError } = await supabase
        .from("task_submissions")
        .insert({
          task_id: taskId,
          user_id: user.id,
          demo_submission: demoSubmissionUrl,
          final_submission: finalSubmissionUrl,
          note,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error inserting task_submissions row", insertError);
        return NextResponse.json(
          { error: "Failed to save submission" },
          { status: 500 },
        );
      }

      submission = inserted;

      const { error: activationError } = await supabase
        .from("task_activations")
        .update({ status: "pending" })
        .eq("user_id", user.id)
        .eq("task_id", taskId);

      if (activationError) {
        console.error("Error updating task_activations status to pending", activationError);
        return NextResponse.json(
          { error: "Submission saved but failed to update activation status" },
          { status: 500 },
        );
      }
    }
    // Notify the task owner that a submission (or resubmission) was made.
    if (taskOwnerId) {
      try {
        await queueNotification({
          userId: taskOwnerId,
          type: "task_submitted",
          data: {
            taskId,
            taskTitle: taskTitle ?? undefined,
            submissionId: (submission as any)?.id,
          },
          channels: { inApp: true, email: true },
        });
      } catch (notifyError) {
        console.error("Error queueing task_submitted notification", notifyError);
      }
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error handling task submission", error);
    return NextResponse.json(
      { error: "Failed to submit task" },
      { status: 500 },
    );
  }
}
