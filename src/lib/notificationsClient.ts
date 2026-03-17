import { useRouter } from "next/navigation";

export type NotificationRecord = {
  id: string;
  type: string;
  data?: Record<string, any> | null;
  created_at?: string | null;
  read_at?: string | null;
};

export const formatNotificationText = (notification: NotificationRecord): string => {
  const type = notification?.type as string | undefined;
  const data = (notification?.data ?? {}) as Record<string, any>;

  switch (type) {
    case "task_started": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Someone started your task "${title}"`;
    }
    case "subscription_updated": {
      const plan = (data.plan as string | undefined) ?? "Pro";
      const status = (data.status as string | undefined) ?? "updated";
      return `Your ${plan} subscription is now ${status}`;
    }
    case "task_submission_accepted": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Your submission for "${title}" was accepted`;
    }
    case "task_submission_rejected": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Your submission for "${title}" was denied`;
    }
    case "task_submitted": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Someone submitted work for your task "${title}"`;
    }
    case "submission_changes_requested": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Changes were requested on your submission for "${title}"`;
    }
    case "dispute_started": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `A dispute was opened on your submission for "${title}"`;
    }
    case "checkin_requested": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `A check-in was requested on your activation for "${title}"`;
    }
    case "task_activation_cancelled": {
      const title = (data.taskTitle as string | undefined) ?? "a task";
      return `Your activation for "${title}" was cancelled by the creator`;
    }
    default:
      return "You have a new notification";
  }
};

export const getNotificationDestination = (
  notification: NotificationRecord,
): string | null => {
  const type = notification?.type as string | undefined;
  const data = (notification?.data ?? {}) as Record<string, any>;

  if (type === "task_started" && typeof data.taskId === "number") {
    return `/listing/${data.taskId}`;
  }

  if (type === "subscription_updated") {
    return "/account?tab=Subscription";
  }

   // Submission and workflow-related notifications send users to the Hub.
  if (
    type === "task_submitted" ||
    type === "task_submission_accepted" ||
    type === "task_submission_rejected" ||
    type === "submission_changes_requested" ||
    type === "dispute_started" ||
    type === "checkin_requested" ||
    type === "task_activation_cancelled"
  ) {
    return "/hub";
  }

  return null;
};

export const useNotificationNavigation = () => {
  const router = useRouter();

  const goToNotification = (notification: NotificationRecord) => {
    const destination = getNotificationDestination(notification);
    if (destination) {
      router.push(destination);
    }
  };

  return { goToNotification };
};
