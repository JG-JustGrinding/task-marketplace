import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      url: null as string | null,
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
      url: null as string | null,
    };
  }

  const { data: publicUrlData } = supabase
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(uploadData.path);

  const publicUrl = publicUrlData?.publicUrl ?? null;

  if (!publicUrl) {
    return {
      error: "Failed to generate public URL for uploaded file",
      url: null as string | null,
    };
  }

  return { error: null as string | null, url: publicUrl };
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

    let demoSubmissionUrl: string | null = null;
    let finalSubmissionUrl: string | null = null;

    const basePrefix = `${user.id}/${taskId}`;

    if (demoFile) {
      const { error, url } = await uploadToStorage(
        supabase,
        demoFile,
        `${basePrefix}/demo`,
      );
      if (error || !url) {
        return NextResponse.json({ error }, { status: 400 });
      }
      demoSubmissionUrl = url;
    } else if (demoLink) {
      demoSubmissionUrl = demoLink;
    }

    if (finalFile) {
      const { error, url } = await uploadToStorage(
        supabase,
        finalFile,
        `${basePrefix}/final`,
      );
      if (error || !url) {
        return NextResponse.json({ error }, { status: 400 });
      }
      finalSubmissionUrl = url;
    } else if (finalLink) {
      finalSubmissionUrl = finalLink;
    }

    if (!finalSubmissionUrl) {
      return NextResponse.json(
        { error: "A final submission URL could not be determined." },
        { status: 400 },
      );
    }

    const { data: submission, error: insertError } = await supabase
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

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error("Error handling task submission", error);
    return NextResponse.json(
      { error: "Failed to submit task" },
      { status: 500 },
    );
  }
}
