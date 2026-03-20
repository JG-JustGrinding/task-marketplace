import { createAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail, NotificationEmailType } from "@/lib/email";

export type NotificationType =
  | "subscription_updated"
  | "task_started"
  | "task_submitted"
  | "task_submission_accepted"
  | "task_submission_rejected"
  | "submission_changes_requested"
  | "dispute_started"
  | "checkin_requested"
  | "task_activation_cancelled"
  | "time_limit_warning";

export type NotificationChannels = {
  inApp?: boolean;
  email?: boolean;
  push?: boolean;
};

export type QueueNotificationParams = {
  userId: string;
  type: NotificationType;
  data?: Record<string, any>;
  channels?: NotificationChannels;
};

export const queueNotification = async (
  params: QueueNotificationParams,
): Promise<{ ok: boolean }> => {
  const { userId, type, data, channels } = params;

  const useInApp = channels?.inApp !== false; // default on
  const useEmail = channels?.email === true;
  const usePush = channels?.push === true;

  try {
    const supabase = createAdminClient();

    // Respect the user's activity email preference on their profile.
    let canSendEmail = false;

    if (useEmail) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("allow_activity_emails")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          console.error(
            "Error loading profile for notification email preference",
            profileError,
          );
        } else {
          const allow = (profile as any)?.allow_activity_emails;
          // Treat explicit false as opt-out; anything else allows email.
          canSendEmail = allow !== false;
        }
      } catch (prefErr) {
        console.error(
          "Unexpected error checking allow_activity_emails preference",
          prefErr,
        );
      }
    }

    let notificationId: string | null = null;

    if (useInApp) {
      const insertPayload: Record<string, any> = {
        user_id: userId,
        type,
        data: data ?? {},
        send_email: useEmail && canSendEmail,
        send_push: usePush,
      };

      const { data: inserted, error } = await supabase
        .from("notifications")
        .insert(insertPayload)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Error inserting notification row", error);
      } else {
        const anyInserted = inserted as any;
        notificationId = anyInserted?.id ?? null;
      }
    }

    if (useEmail && canSendEmail) {
      const emailResult = await sendNotificationEmail({
        userId,
        type: type as NotificationEmailType,
        data: {
          ...(data ?? {}),
          // Pass notificationId so the email subject can include
          // a short reference and avoid Gmail threading them together.
          notificationId,
        },
      });

      if (emailResult.ok && notificationId) {
        const { error: updateError } = await supabase
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", notificationId);

        if (updateError) {
          console.error(
            "Error updating notification email_sent_at after sending email",
            updateError,
          );
        }
      }
    }

    // Push notifications can be added later, using notificationId + userId + data.

    return { ok: true };
  } catch (err) {
    console.error("Unexpected error queuing notification", err);
    return { ok: false };
  }
};
