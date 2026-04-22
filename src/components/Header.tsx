"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faHouse, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { faBell } from "@fortawesome/free-regular-svg-icons";
import Link from "next/link";
import NotificationsOverlay from "./NotificationsOverlay";
import { formatNotificationText, getNotificationDestination, NotificationRecord } from "@/lib/notificationsClient";

interface HeaderProps {
  user: any;
  profile?: any;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export default function Header({ user, profile, search = "", onSearchChange }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState(search);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastOpenedAt, setLastOpenedAt] = useState<string | null>(null);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifCursor, setNotifCursor] = useState<string | null>(null);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);
  const [isMobileOverlayOpen, setIsMobileOverlayOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Keep header input in sync when navigating between pages
    if (pathname === "/search") {
      const q = searchParams.get("q") || "";
      setLocalSearch(q);
    } else if (!search) {
      setLocalSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  const isLoggedIn = !!user;
  const userName = profile?.username || "Bountask User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const loadNotifications = async (options?: { append?: boolean }) => {
    const append = options?.append ?? false;

    if (append && (!hasMoreNotifications || isNotifLoading)) return;

    try {
      setIsNotifLoading(true);
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (append && notifCursor) {
        params.set("cursor", notifCursor);
      }

      if (!append) {
        setHasMoreNotifications(true);
        setNotifCursor(null);
      }

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const newItems = Array.isArray(data.notifications) ? data.notifications : [];

      if (append) {
        setNotifications((prev) => [...prev, ...newItems]);
      } else {
        setNotifications(newItems);
        // Store the pre-open lastOpenedAt so items created after it show as unread
        // for this session, then immediately update the DB so the badge resets.
        setLastOpenedAt(data.lastOpenedAt ?? null);
        const count = typeof data.unreadCount === "number" ? data.unreadCount : 0;
        setUnreadCount(count);
        void fetch("/api/notifications/mark-opened", { method: "POST" }).then(() => {
          setUnreadCount(0);
        });
      }

      if (newItems.length > 0) {
        const last = newItems[newItems.length - 1];
        if (last?.created_at) {
          setNotifCursor(last.created_at as string);
        }
        if (newItems.length < 20) {
          setHasMoreNotifications(false);
        }
      } else if (append) {
        setHasMoreNotifications(false);
      }
    } catch {
      // Ignore errors in popup; header should still function.
    } finally {
      setIsNotifLoading(false);
    }
  };

  const handleNotificationClick = (notification: NotificationRecord) => {
    const destination = getNotificationDestination(notification);
    if (destination) {
      router.push(destination);
      setIsNotifOpen(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setUnreadCount(0);
      return;
    }

    let isMounted = true;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications?limit=0");
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        const count = typeof data.unreadCount === "number" ? data.unreadCount : 0;
        setUnreadCount(count);
      } catch {
        // Ignore errors in header badge; not critical.
      }
    };

    fetchUnread();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn]);

  // Close notifications popup when clicking outside of it
  useEffect(() => {
    if (!isNotifOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!notifRef.current || !target) return;
      if (!notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isNotifOpen]);

  const handleNotificationsScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    if (!hasMoreNotifications || isNotifLoading) return;

    const threshold = 40; // px from bottom
    if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
      void loadNotifications({ append: true });
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const query = localSearch.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const initialQuery = pathname === "/search" ? (searchParams.get("q") || "") : "";
  const trimmedInitialQuery = initialQuery.trim();
  const trimmedCurrentQuery = localSearch.trim();
  const isSearchEmpty = trimmedCurrentQuery.length === 0;
  const isSameAsInitial = trimmedCurrentQuery === trimmedInitialQuery;
  const isSearchButtonActive = !isSearchEmpty && !isSameAsInitial;

  return (
    <header className="w-full border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="relative h-10 w-10">
            <Image
              src="/logos/bountask_logo_icon.svg"
              alt="Bountask Logo"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Boun<span className="text-[var(--accent-primary)]">task</span>
            </span>
          </div>
        </Link>

        <div className="flex-1 max-w-md ml-auto">
          <form className="relative" onSubmit={handleSubmit}>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search tasks, skills, or keywords..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 pl-3 pr-9 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!isSearchButtonActive}
              aria-label="Search"
              className={
                "absolute inset-y-0 right-2 my-1 flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors " +
                (isSearchButtonActive
                  ? "bg-[var(--accent-primary)] text-white hover:brightness-110"
                  : "bg-transparent text-[var(--text-muted)] cursor-default")
              }
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-3 w-3" />
            </button>
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-2">
          {isLoggedIn && (
            <>
              <div className="relative sm:hidden">
                <button
                  type="button"
                  className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                  aria-label="Notifications"
                  onClick={() => setIsMobileOverlayOpen(true)}
                >
                  <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] px-1 rounded-full bg-[var(--accent-primary)] text-[10px] font-semibold text-white flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="relative hidden sm:block" ref={notifRef}>
              <button
                type="button"
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                aria-label="Notifications"
                onClick={() => {
                  const next = !isNotifOpen;
                  setIsNotifOpen(next);
                  if (next) {
                    void loadNotifications();
                  }
                }}
              >
                <FontAwesomeIcon icon={faBell} className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] px-1 rounded-full bg-[var(--accent-primary)] text-[10px] font-semibold text-white flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] max-h-80 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-lg z-30" onScroll={handleNotificationsScroll}>
                  <div className="px-3 py-2 border-b border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      Notifications
                    </span>
                    {isNotifLoading && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Loading...
                      </span>
                    )}
                  </div>

                  {notifications.length === 0 && !isNotifLoading && (
                    <div className="px-3 py-4 text-xs text-[var(--text-muted)]">
                      You have no notifications yet.
                    </div>
                  )}

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
                        onClick={() => handleNotificationClick(notification)}
                        className={
                          "w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--bg-muted)]/60 transition-colors " +
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
              )}
            </div>

              <NotificationsOverlay
                isOpen={isMobileOverlayOpen}
                onClose={() => setIsMobileOverlayOpen(false)}
              />
            </>
          )}

          <a
            href="/create"
            className={
              "hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm transition-all " +
              (isLoggedIn
                ? "bg-[var(--accent-primary)] text-white font-semibold shadow-sm hover:shadow-md hover:brightness-110"
                : "border border-[var(--border-color)] bg-[var(--bg-muted)]/60 text-[var(--text-primary)] hover:bg-[var(--bg-muted)]")
            }
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>Create Task</span>
          </a>

          {isLoggedIn && (
            <a
              href="/hub"
              className="inline-flex items-center justify-center gap-0 sm:gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 h-9 w-9 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
              <span className="hidden sm:inline">Hub</span>
            </a>
          )}

          {isLoggedIn ? (
            <a
              href={`/profile/${user.id}`}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label={`Go to ${userName}'s profile`}
            >
              <div className="h-9 w-9 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-sm font-semibold text-white">
                {userInitial}
              </div>
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/70 transition-colors"
              >
                Log In
              </a>
              <a href="/signup">
                <button className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all">
                  Sign Up
                </button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
