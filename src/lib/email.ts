import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set; notification emails will be disabled.");
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const getBaseUrl = (): string => {
  const envBase = process.env.NEXT_PUBLIC_SITE_URL;

  if (envBase && /^https?:\/\//i.test(envBase)) {
    return envBase.replace(/\/$/, "");
  }

  return "";
};

const getUserEmailById = async (userId: string): Promise<string | null> => {
  try {
    const supabase = createAdminClient();

    // Use the auth admin API (requires service role) to load the user
    // and read their primary email directly from auth.users.
    const { data, error } = await (supabase as any).auth.admin.getUserById(userId);

    if (error) {
      console.error("Error loading auth user for notification email", error);
      return null;
    }

    const email = data?.user?.email as string | undefined;
    return email ?? null;
  } catch (err) {
    console.error("Unexpected error loading auth user for notification email", err);
    return null;
  }
};

export type NotificationEmailType =
  | "subscription_updated"
  | "task_started"
  | "task_submitted"
  | "task_submission_accepted"
  | "task_submission_rejected"
  | "submission_changes_requested"
  | "dispute_started"
  | "checkin_requested"
  | "task_activation_cancelled";

export type NotificationEmailPayload = {
  userId: string;
  type: NotificationEmailType;
  data?: Record<string, any>;
};

const buildEmailContent = (
  type: NotificationEmailType,
  data: Record<string, any> | undefined,
): {
  subject: string;
  text: string;
  html?: string;
  previewText: string;
  buttonLink?: string | null;
  buttonText?: string | null;
} => {
  const baseUrl = getBaseUrl();
  const notificationId = data?.notificationId as string | undefined;
  /*const refSuffix = notificationId
    ? ` (ref ${notificationId.slice(0, 6).toUpperCase()})`
    : "";*/
    const refSuffix = "";

  switch (type) {
    case "subscription_updated": {
      const plan = data?.plan as string | undefined;
      const status = data?.status as string | undefined;
      const subject = `Your Pro subscription was updated${refSuffix}`;
      const text = `Your ${plan ?? "Pro"} subscription status is now: ${
        status ?? "updated"
      }.`;
      const previewText = text;
      const buttonLink = baseUrl ? `${baseUrl}/account?tab=Subscription` : null;
      const buttonText = "Manage subscription";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "task_started": {
      const title = data?.taskTitle as string | undefined;
      const subject = `Someone started your task${refSuffix}`;
      const text = `A worker has started your task "${
        title ?? "a task"
      }".`;
      const previewText = text;
      const taskId = data?.taskId as number | undefined;
      const buttonLink = baseUrl && typeof taskId === "number"
        ? `${baseUrl}/listing/${taskId}`
        : null;
      const buttonText = "View task";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "task_submitted": {
      const title = data?.taskTitle as string | undefined;
      const subject = `New submission on your task${refSuffix}`;
      const text = `A worker submitted work for your task "${
        title ?? "a task"
      }". You can review it on the task's submissions page.`;
      const previewText = "You have a new task submission to review.";
      const taskId = data?.taskId as number | undefined;
      const buttonLink = baseUrl && typeof taskId === "number"
        ? `${baseUrl}/listing/${taskId}/submissions`
        : null;
      const buttonText = "Review submission";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "task_submission_accepted": {
      const title = data?.taskTitle as string | undefined;
      const subject = `Your task submission was accepted${refSuffix}`;
      const text = `Good news! Your submission for the task "${
        title ?? "a task"
      }" was accepted. You can view the details in your Hub.`;
      const previewText = "Your task submission was accepted. View it in your Hub.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "Open Hub";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "task_submission_rejected": {
      const title = data?.taskTitle as string | undefined;
      const reason = data?.reason as string | undefined;
      const subject = `Your task submission was denied${refSuffix}`;
      const text = `Your submission for the task "${
        title ?? "a task"
      }" was denied.${reason ? ` Reason: ${reason}` : ""} You can review this in your Hub.`;
      const previewText = "Your task submission was denied.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "Open Hub";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "submission_changes_requested": {
      const title = data?.taskTitle as string | undefined;
      const note = data?.note as string | undefined;
      const subject = `Changes requested on your submission${refSuffix}`;
      const text = `The creator requested changes on your submission for the task "${
        title ?? "a task"
      }".${note ? ` Note: ${note}` : ""} Please go to your Hub to review the feedback and resubmit.`;
      const previewText = "Changes were requested on your task submission.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "Review in Hub";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "dispute_started": {
      const title = data?.taskTitle as string | undefined;
      const subject = `A dispute was opened on your submission${refSuffix}`;
      const text = `The task creator opened a dispute on your submission for "${
        title ?? "a task"
      }".`;
      const previewText = "A dispute was opened on your task submission.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "View dispute";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "checkin_requested": {
      const title = data?.taskTitle as string | undefined;
      const subject = `Check-in requested on your activation${refSuffix}`;
      const text = `The task creator requested a check-in on your activation for "${
        title ?? "a task"
      }". Please go to your Hub to check in and continue working on the task.`;
      const previewText = "A check-in was requested on your activation.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "Open Hub";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    case "task_activation_cancelled": {
      const title = data?.taskTitle as string | undefined;
      const subject = `Your task activation was cancelled${refSuffix}`;
      const text = `The task creator cancelled your activation for "${
        title ?? "a task"
      }". You can view the details in your Hub and explore other tasks.`;
      const previewText = "Your task activation was cancelled by the creator.";
      const buttonLink = baseUrl ? `${baseUrl}/hub` : null;
      const buttonText = "Open Hub";
      return { subject, text, previewText, buttonLink, buttonText };
    }

    default: {
      const subject = `You have a new notification${refSuffix}`;
      const text = "You have a new notification in your account.";
      const previewText = text;
      return { subject, text, previewText };
    }
  }
};

export const sendNotificationEmail = async (
  payload: NotificationEmailPayload,
): Promise<{ ok: boolean }> => {
  try {
    if (!resend || !process.env.RESEND_FROM_EMAIL) {
      console.warn(
        "Resend client or RESEND_FROM_EMAIL not configured; skipping notification email.",
      );
      return { ok: false };
    }

    const to = await getUserEmailById(payload.userId);

    if (!to) {
      console.warn("No email address found for user; skipping notification email.", {
        userId: payload.userId,
      });
      return { ok: false };
    }

    const content = buildEmailContent(payload.type, payload.data);

    const templateId = process.env.RESEND_ACTIVITY_TEMPLATE_ID;

    let error: unknown = null;

    if (templateId) {
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        template: {
            id: templateId,
            variables: {
                preview_text: content.previewText,
                subject: content.subject,
                notification_body: content.text,
                button_link: content.buttonLink ?? undefined,
                button_text: content.buttonText ?? undefined,
            },
        }
      } as any);

      error = (result as any)?.error ?? null;
    } else {
      // Fallback: send a simple text email if no template ID is configured.
      console.warn(
        "RESEND_ACTIVITY_TEMPLATE_ID not set; sending notification email without template.",
      );

      const result = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL,
        to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      } as any);

      error = (result as any)?.error ?? null;
    }

    if (error) {
      console.error("Error sending notification email via Resend", error);
      return { ok: false };
    }

    return { ok: true };
  } catch (err) {
    console.error("Unexpected error sending notification email", err);
    return { ok: false };
  }
};
