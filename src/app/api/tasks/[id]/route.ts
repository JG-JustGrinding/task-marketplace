import { NextResponse } from "next/server";
import stripe from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// When a funded task is deleted before completion, we issue a partial
// refund and keep a small cancellation fee as platform earnings.
const PLATFORM_CANCELLATION_FEE_RATE = 0.15; // 15%
const LOGO_BUCKET = "task-logos";
const BANNER_BUCKET = "task-banners";
const IMAGE_REFERENCE_BUCKET = "task-image-references";

type ReferenceType = "link" | "image" | "image-file";

type ReferenceItem = {
  type: ReferenceType;
  url: string;
};

type BeginDeleteFundedTaskResult = {
  ok?: boolean;
  error?: string;
  payment_intent_id?: string | null;
  refund_cents?: number;
  platform_fee_cents?: number;
};

type SimpleRpcResult = {
  ok?: boolean;
  error?: string;
};

async function deleteTaskBrandingAssets(
  logoPath: string | null | undefined,
  bannerPath: string | null | undefined,
) {
  const admin = createAdminClient();

  if (logoPath) {
    const { error: logoDeleteError } = await admin.storage
      .from(LOGO_BUCKET)
      .remove([logoPath]);

    if (logoDeleteError) {
      throw new Error(`Failed to remove task logo: ${logoDeleteError.message}`);
    }
  }

  if (bannerPath) {
    const { error: bannerDeleteError } = await admin.storage
      .from(BANNER_BUCKET)
      .remove([bannerPath]);

    if (bannerDeleteError) {
      throw new Error(`Failed to remove task banner: ${bannerDeleteError.message}`);
    }
  }
}

async function deleteTaskImageReferenceAssets(
  references: ReferenceItem[] | null | undefined,
) {
  const admin = createAdminClient();
  const refs = (references ?? []) as ReferenceItem[];
  const pathsToRemove: string[] = [];

  for (const ref of refs) {
    if (!ref || ref.type !== "image-file" || !ref.url) continue;

    const marker = `${IMAGE_REFERENCE_BUCKET}/`;
    const idx = ref.url.indexOf(marker);
    if (idx === -1) continue;

    const path = ref.url.slice(idx + marker.length);
    if (path) {
      pathsToRemove.push(path);
    }
  }

  if (pathsToRemove.length === 0) return;

  const { error } = await admin.storage
    .from(IMAGE_REFERENCE_BUCKET)
    .remove(pathsToRemove);

  if (error) {
    throw new Error(`Failed to remove task image references: ${error.message}`);
  }
}

export async function GET(
  request: Request,
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
    const { data, error } = await supabase
      .from("tasks")
      .select("id, title, short_description")
      .eq("id", numericId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ task: data }, { status: 200 });
  } catch (error) {
    console.error("Error fetching task", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch the task and verify ownership + status/payment details
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select(
			"id, user_id, status, price, stripe_payment_intent_id, logo_path, banner_path, references",
		)
      .eq("id", numericId)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.user_id !== user.id) {
      return NextResponse.json(
        { error: "You are not allowed to delete this task." },
        { status: 403 },
      );
    }

    const status = (task as any).status as string | null;

    if (status === "task_accepted") {
      return NextResponse.json(
        { error: "You cannot delete a task that already has an accepted submission." },
        { status: 400 },
      );
    }

    // Ensure nobody is actively working on the task. Any activation in a
    // working/accepted state blocks deletion.
    const activeActivationStatuses = [
      "waiting_submission",
      "pending",
      "resubmission",
      "resubmission_requested",
      "accepted",
    ];

    const { count: activationCount, error: activationError } = await supabase
      .from("task_activations")
      .select("id", { count: "exact", head: true })
      .eq("task_id", numericId)
      .in("status", activeActivationStatuses as any[]);

    if (activationError) {
      return NextResponse.json(
        { error: "Failed to verify task state. Please try again." },
        { status: 500 },
      );
    }

    const activeCount = activationCount ?? 0;
    if (activeCount > 0) {
      return NextResponse.json(
        { error: "This task cannot be deleted because it has active activations." },
        { status: 400 },
      );
    }

    // Branch 1: unfunded tasks still awaiting payment can be hard deleted
    if (status === "pending_payment") {
      if ((task as any).stripe_payment_intent_id) {
        return NextResponse.json(
          {
            error:
              "This funded task is already being deleted. Please refresh and try again.",
          },
          { status: 409 },
        );
      }

      try {
        await deleteTaskBrandingAssets(
          (task as any).logo_path as string | null | undefined,
          (task as any).banner_path as string | null | undefined,
        );
        await deleteTaskImageReferenceAssets(
          (task as any).references as ReferenceItem[] | null | undefined,
        );
      } catch (assetError) {
        console.error("Error deleting task branding assets", assetError);
        return NextResponse.json(
          {
            error:
              "Failed to remove task branding and reference files. Please try again.",
          },
          { status: 500 },
        );
      }

      const { error: deleteError } = await supabase
        .from("tasks")
        .delete()
        .eq("id", numericId);

      if (deleteError) {
        return NextResponse.json(
          { error: "Failed to delete task. Please try again." },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Branch 2: funded, active tasks with no active activations → partial refund
    if (status === "active") {
      const priceRaw = (task as any).price as number | null;
      const priceDollars =
        typeof priceRaw === "number" && Number.isFinite(priceRaw)
          ? priceRaw
          : Number(priceRaw ?? 0);

      const grossCents = Math.max(0, Math.round(priceDollars * 100));

      if (!Number.isFinite(grossCents) || grossCents <= 0) {
        return NextResponse.json(
          { error: "This task does not appear to have a valid funded amount." },
          { status: 400 },
        );
      }

      const paymentIntentId = (task as any).stripe_payment_intent_id as
        | string
        | null
        | undefined;

      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "This task cannot be deleted because its payment record is incomplete." },
          { status: 400 },
        );
      }

      const platformFeeCents = Math.max(
        0,
        Math.round(grossCents * PLATFORM_CANCELLATION_FEE_RATE),
      );
      const refundCents = Math.max(0, grossCents - platformFeeCents);

      const { data: beginDeleteData, error: beginDeleteError } = await supabase.rpc(
        "begin_delete_funded_task",
        {
          p_task_id: numericId,
          p_platform_cancellation_fee_rate: PLATFORM_CANCELLATION_FEE_RATE,
        },
      );

      if (beginDeleteError) {
        console.error("Error beginning funded task deletion", beginDeleteError);
        return NextResponse.json(
          { error: "Failed to lock this task for deletion. Please try again." },
          { status: 500 },
        );
      }

      const beginDeleteResult =
        (beginDeleteData ?? {}) as BeginDeleteFundedTaskResult;

      if (!beginDeleteResult.ok) {
        const beginDeleteMessage =
          beginDeleteResult.error ??
          "This task is already being deleted or was just changed. Please refresh and try again.";

        const beginDeleteStatus =
          beginDeleteMessage === "Task not found"
            ? 404
            : beginDeleteMessage === "This task is already being deleted or was just changed. Please refresh and try again."
              ? 409
              : beginDeleteMessage === "This task cannot be deleted because it has active activations." ||
                  beginDeleteMessage === "This task does not appear to have a valid funded amount." ||
                  beginDeleteMessage === "This task cannot be deleted because its payment record is incomplete." ||
                  beginDeleteMessage === "This task cannot be deleted in its current state."
                ? 400
                : 500;

        return NextResponse.json(
          { error: beginDeleteMessage },
          { status: beginDeleteStatus },
        );
      }

      const rpcPaymentIntentId = beginDeleteResult.payment_intent_id ?? null;
      const rpcRefundCents = Number(beginDeleteResult.refund_cents ?? refundCents);
      const rpcPlatformFeeCents = Number(
        beginDeleteResult.platform_fee_cents ?? platformFeeCents,
      );

      if (!rpcPaymentIntentId) {
        return NextResponse.json(
          { error: "This task cannot be deleted because its payment record is incomplete." },
          { status: 400 },
        );
      }

      try {
        if (rpcRefundCents > 0) {
          await stripe.refunds.create({
            payment_intent: rpcPaymentIntentId,
            amount: rpcRefundCents,
          }, {
            idempotencyKey: `task-delete-refund-${numericId}`,
          });
        } else {
          // If the computed refund is 0 (e.g. very small tasks), keep it simple
          // and do not attempt a Stripe refund.
          console.warn(
            `Computed zero refund for task ${numericId}; skipping Stripe refund call.`,
          );
        }
      } catch (stripeError) {
        console.error("Error issuing Stripe refund for deleted task", stripeError);

        // Best-effort rollback of the temporary lock so the creator is not left
        // with a task stuck in pending_payment when no refund was issued.
        const { error: rollbackError } = await supabase.rpc(
          "rollback_delete_funded_task",
          { p_task_id: numericId },
        );

        if (rollbackError) {
          console.error(
            "Error rolling back funded task deletion lock after refund failure",
            rollbackError,
          );
        }

        return NextResponse.json(
          { error: "Failed to issue refund for this task. Please try again." },
          { status: 500 },
        );
      }

      // Record the platform's cancellation fee and mark the task as cancelled.
      try {
        const { data: finalizeDeleteData, error: finalizeDeleteError } = await supabase.rpc(
          "finalize_delete_funded_task",
          {
            p_task_id: numericId,
            p_platform_fee_cents: rpcPlatformFeeCents,
          },
        );

        if (finalizeDeleteError) {
          console.error("Error finalizing funded task deletion", finalizeDeleteError);
          return NextResponse.json(
            { error: "Refund issued but failed to finalize task deletion." },
            { status: 500 },
          );
        }

        const finalizeDeleteResult =
          (finalizeDeleteData ?? {}) as SimpleRpcResult;

        if (!finalizeDeleteResult.ok) {
          console.error(
            "Finalize funded task deletion returned non-ok result",
            finalizeDeleteResult,
          );
          return NextResponse.json(
            {
              error:
                finalizeDeleteResult.error ??
                "Refund issued but failed to finalize task deletion.",
            },
            { status: 500 },
          );
        }
      } catch (dbError) {
        console.error("Error recording deletion earnings or updating task", dbError);
        return NextResponse.json(
          { error: "Refund issued but failed to record deletion in database." },
          { status: 500 },
        );
      }

      try {
        await deleteTaskBrandingAssets(
          (task as any).logo_path as string | null | undefined,
          (task as any).banner_path as string | null | undefined,
        );
        await deleteTaskImageReferenceAssets(
          (task as any).references as ReferenceItem[] | null | undefined,
        );
      } catch (assetError) {
        console.error(
          "Task deleted after refund, but failed to remove branding or reference assets",
          assetError,
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Any other status is not deletable with this flow.
    return NextResponse.json(
      { error: "This task cannot be deleted in its current state." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error deleting task", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}
