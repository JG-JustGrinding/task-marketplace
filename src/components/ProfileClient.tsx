"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ListingCard from "@/components/ListingCard";
import CustomTaskCard from "@/components/CustomTaskCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

type Task = {
  id: number;
  title: string;
  short_description: string | null;
  price: number;
  categories: string[] | null;
  logoUrl?: string;
  bannerUrl?: string;
  status?: string | null;
  is_taken?: boolean;
  has_started_for_viewer?: boolean;
};

interface ProfileClientProps {
  userId: string;
  userName: string;
  memberSince?: string | null;
  isCurrentUser: boolean;
  createdTasks: Task[];
  totalCreatedCount?: number;
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  creatorProActive?: boolean;
  earnerProActive?: boolean;
}

export default function ProfileClient({
  userId,
  userName,
  memberSince,
  isCurrentUser,
  createdTasks,
  totalCreatedCount,
  initialHasMore = false,
  initialNextCursor = null,
  creatorProActive = false,
  earnerProActive = false,
}: ProfileClientProps) {
  const [createdExpanded, setCreatedExpanded] = useState(true);
  const [tasks, setTasks] = useState<Task[]>(createdTasks);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const userInitial = userName.charAt(0).toUpperCase();

  const totalCreated = totalCreatedCount ?? createdTasks.length;

  const createdListings = (tasks ?? []).map((task) => {
    const status = task.status ?? "";
    const isActive = status === "active";
    const isPendingPayment = status === "pending_payment";
    const isTaken = Boolean(task.is_taken);
    const hasStarted = Boolean(task.has_started_for_viewer);

    let stateLabel: "open" | "unavailable" | null = null;

    if (!isCurrentUser) {
      if (isActive && !isPendingPayment && !isTaken && !hasStarted) {
        stateLabel = "open";
      }
    }

    return {
      id: task.id,
      title: task.title,
      categories: task.categories ?? [],
      description: task.short_description ?? undefined,
      price: task.price,
      logoUrl: task.logoUrl,
      bannerUrl: task.bannerUrl,
      status: task.status,
      stateLabel,
    };
  });

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      params.set("userId", userId);
      params.set("cursor", nextCursor);

      const res = await fetch(`/api/tasks/by-user?${params.toString()}`);
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error((body as any)?.error || "Failed to load more listings");
      }

      const { tasks: newTasks = [], hasMore: more, nextCursor: cursor } = body as {
        tasks?: Task[];
        hasMore?: boolean;
        nextCursor?: string | null;
      };

      setTasks((prev) => [...prev, ...newTasks]);
      setHasMore(Boolean(more));
      setNextCursor(cursor ?? null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load more listings";
      setLoadError(message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  useEffect(() => {
    if (!hasMore || !nextCursor || !createdExpanded) return;

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore) {
          void handleLoadMore();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, nextCursor, isLoadingMore, createdExpanded]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Profile Header */}
        <section className="card p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-3xl font-semibold text-white">
              {userInitial}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-3">

              {(creatorProActive || earnerProActive) && (
                <div className="flex flex-wrap items-center gap-3 pt-1 justify-center sm:justify-start">
                  {creatorProActive && (
                    <div className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/50 bg-gradient-to-r from-[var(--accent-primary)]/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] px-3 py-1 shadow-sm shadow-[var(--accent-primary)]/20 backdrop-blur-sm">
                      <div className="relative h-6 w-6 flex-shrink-0">
                        <Image
                          src="/creator_pro_badge.svg"
                          alt="Creator Pro badge"
                          fill
                          sizes="24px"
                          className="drop-shadow-sm group-hover:scale-105 transition-transform duration-150"
                        />
                      </div>
                      <span className="text-xs font-semibold tracking-wide text-[var(--accent-primary)] uppercase">
                        Pro Creator
                      </span>
                    </div>
                  )}

                  {earnerProActive && (
                    <div className="group inline-flex items-center gap-2 rounded-full border border-[var(--accent-secondary)]/50 bg-gradient-to-r from-[var(--accent-secondary)]/10 via-[var(--bg-secondary)] to-[var(--bg-secondary)] px-3 py-1 shadow-sm shadow-[var(--accent-secondary)]/20 backdrop-blur-sm">
                      <div className="relative h-6 w-6 flex-shrink-0">
                        <Image
                          src="/earner_pro_badge.svg"
                          alt="Earner Pro badge"
                          fill
                          sizes="24px"
                          className="drop-shadow-sm group-hover:scale-105 transition-transform duration-150"
                        />
                      </div>
                      <span className="text-xs font-semibold tracking-wide text-[var(--accent-secondary)] uppercase">
                        Pro Earner
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <h1 className="text-2xl font-semibold">{userName}</h1>
                {memberSince && (
                  <p className="text-sm text-[var(--text-secondary)]">
                    Member since {memberSince}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm pt-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {totalCreated}
                  </span>
                  <span className="text-[var(--text-secondary)]">Created</span>
                </div>
              </div>

              {isCurrentUser && (
                <div className="flex flex-wrap gap-3 justify-center sm:justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/hub";
                    }}
                    className="px-4 py-2 text-xs sm:text-sm font-medium rounded-full bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] transition"
                  >
                    Go to hub
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/account";
                    }}
                    className="px-4 py-2 text-xs sm:text-sm font-medium rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition"
                  >
                    Your account
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Created Listings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Created listings</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)]">
                {totalCreated} {totalCreated === 1 ? "listing" : "listings"}
              </span>
              <button
                type="button"
                onClick={() => setCreatedExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] transition"
                aria-expanded={createdExpanded}
                aria-controls="created-listings"
              >
                {createdExpanded ? "Collapse" : "Expand"}
                <FontAwesomeIcon
                  icon={faCaretDown}
                  className={`text-xs transition-transform ${createdExpanded ? "rotate-180" : "rotate-0"}`}
                />
              </button>
            </div>
          </div>

          {createdExpanded && (
            <div id="created-listings">
              {createdListings.length > 0 ? (
                <>
                  {loadError && (
                    <p className="mb-2 text-xs text-[var(--danger)]">{loadError}</p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {createdListings.map((listing) => {
                      const shouldShowStatus =
                        isCurrentUser || listing.status === "task_accepted";

                      if (listing.logoUrl || listing.bannerUrl) {
                        return (
                          <CustomTaskCard
                            key={listing.id}
                            listing={listing}
                            logoUrl={listing.logoUrl}
                            bannerUrl={listing.bannerUrl}
                          />
                        );
                      }

                      return (
                        <ListingCard
                          key={listing.id}
                          listing={listing}
                          stateLabel={listing.stateLabel}
                          showStatus={shouldShowStatus}
                        />
                      );
                    })}
                  </div>
                  {hasMore && (
                    <div ref={loadMoreRef} className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-4 py-2 text-xs font-semibold rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isLoadingMore ? "Loading more..." : "Load more"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No listings created yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
