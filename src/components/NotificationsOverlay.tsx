"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { formatNotificationText, useNotificationNavigation, NotificationRecord } from "@/lib/notificationsClient";

interface NotificationsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsOverlay({ isOpen, onClose }: NotificationsOverlayProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastOpenedAt, setLastOpenedAt] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { goToNotification } = useNotificationNavigation();

  const fetchPage = async (append: boolean) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (append && cursor) {
        params.set("cursor", cursor);
      }

      if (!append) {
        setHasMore(true);
        setCursor(null);
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const newItems = Array.isArray(data.notifications) ? data.notifications : [];

      if (append) {
        setNotifications((prev) => [...prev, ...newItems]);
      } else {
        setNotifications(newItems);
        setLastOpenedAt(data.lastOpenedAt ?? null);
        void fetch("/api/notifications/mark-opened", { method: "POST" });
      }

      if (newItems.length > 0) {
        const last = newItems[newItems.length - 1];
        if (last?.created_at) {
          setCursor(last.created_at as string);
        }
        if (newItems.length < 50) {
          setHasMore(false);
        }
      } else if (append) {
        setHasMore(false);
      }
    } catch {
      // Ignore errors; overlay is best-effort.
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    void (async () => {
      await fetchPage(false);
      if (!isMounted) return;
    })();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    if (!hasMore || isLoading) return;

    const threshold = 40; // px from bottom
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      void fetchPage(true);
    }
  };

  const handleItemClick = (notification: NotificationRecord) => {
    goToNotification(notification);
    onClose();
  };

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex sm:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close notifications"
        onClick={onClose}
      />

      <div className="relative ml-auto h-full w-full max-w-sm bg-[var(--bg-secondary)] shadow-xl transform transition-transform duration-200 ease-out translate-x-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Notifications</span>
          <button
            type="button"
            aria-label="Close"
            className="p-1 rounded-full hover:bg-[var(--bg-muted)]/70"
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-[var(--text-primary)]" />
          </button>
        </div>

        {isLoading && (
          <div className="px-4 py-3 text-xs text-[var(--text-muted)]">Loading...</div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="px-4 py-6 text-xs text-[var(--text-muted)]">
            You have no notifications yet.
          </div>
        )}

        <div className="max-h-[calc(100vh-56px)] overflow-y-auto" onScroll={handleScroll}>
          {notifications.map((notification) => {
            const createdAt = notification.created_at
              ? new Date(notification.created_at as string)
              : null;
            const isUnread = lastOpenedAt
              ? new Date(notification.created_at as string) > new Date(lastOpenedAt)
              : true;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleItemClick(notification)}
                className={
                  "w-full text-left px-4 py-3 text-xs flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-muted)]/60 transition-colors " +
                  (isUnread ? "bg-[var(--bg-muted)]/40" : "")
                }
              >
                <span className="text-[var(--text-primary)]">
                  {formatNotificationText(notification)}
                </span>
                {createdAt && !Number.isNaN(createdAt.getTime()) && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {createdAt.toLocaleString()}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
