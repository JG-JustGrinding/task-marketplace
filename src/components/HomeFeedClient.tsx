"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import CategoryFilters from "@/components/CategoryFilters";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/data/listings";

type HomeFeedClientProps = {
  listings: Listing[];
  initialSearch?: string;
  initialHasMore?: boolean;
  initialNextCursor?: string | null;
  initialSeed: number;
};

type FeedResponse = {
  listings: Listing[];
  hasMore: boolean;
  nextCursor: string | null;
};

export default function HomeFeedClient({
  listings,
  initialSearch = "",
  initialHasMore = false,
  initialNextCursor = null,
  initialSeed,
}: HomeFeedClientProps) {
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState("All");
  const [items, setItems] = useState<Listing[]>(listings);
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const seedRef = useRef(initialSeed ?? Math.floor(Math.random() * 1_000_000_000));
  const isFirstCategoryLoadRef = useRef(true);

  useEffect(() => {
    // Reset feed state whenever the server-provided listings/search context changes
    setItems(listings);
    setSearch(initialSearch);
    setHasMore(initialHasMore);
    setNextCursor(initialNextCursor);
    setIsLoadingMore(false);
    setIsRefreshing(false);
    setLoadError(null);
    seedRef.current = initialSeed ?? Math.floor(Math.random() * 1_000_000_000);
  }, [listings, initialSearch, initialHasMore, initialNextCursor, initialSeed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, []);

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      // When there is no search query, just use the items
      // as returned from the server (which may already be
      // filtered by category via the RPC).
      return items;
    }

    return items.filter((listing) => {
      return (
        listing.title.toLowerCase().includes(query) ||
        listing.categories.some((c) => c.toLowerCase().includes(query)) ||
        (listing.description && listing.description.toLowerCase().includes(query))
      );
    });
  }, [search, items]);

  const skeletonCount = useMemo(() => {
    if (!hasMore) return 0;

    // On desktop we show 3 columns; fill the last row visually
    // whenever there are more tasks available so gaps don't look awkward
    // even before the next page starts loading.
    const SKELETON_PER_ROW = 3;
    const remainder = filteredListings.length % SKELETON_PER_ROW;
    if (remainder === 0) return 0;
    return SKELETON_PER_ROW - remainder;
  }, [filteredListings.length, hasMore]);

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || isLoadingMore || isRefreshing) return;

    setIsLoadingMore(true);
    setLoadError(null);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      if (initialSearch.trim()) {
        params.set("q", initialSearch.trim());
      } else {
        params.set("seed", String(seedRef.current));
        if (activeCategory !== "All") {
          params.set("category", activeCategory);
        }
      }

      const endpoint = initialSearch.trim()
        ? "/api/tasks/search-feed"
        : "/api/tasks/feed";

      const res = await fetch(`${endpoint}?${params.toString()}`);
      const body = (await res.json().catch(() => ({}))) as Partial<FeedResponse & { error?: string }>;

      if (!res.ok) {
        throw new Error(body.error || "Failed to load more tasks");
      }

      const payload = body as FeedResponse;

      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));

        for (const item of payload.listings ?? []) {
          map.set(item.id, item);
        }

        return Array.from(map.values());
      });
      setHasMore(Boolean(payload.hasMore));
      setNextCursor(payload.nextCursor ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load more tasks";
      setLoadError(message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore || !nextCursor) return;

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
  }, [hasMore, nextCursor, isLoadingMore, activeCategory, isRefreshing]);

  // When the active category changes on the homepage (non-search view),
  // fetch a fresh first page from the server with that category filter.
  useEffect(() => {
    if (initialSearch.trim()) return;

    // Skip the initial render for the default "All" category,
    // since the server already provided the first page.
    if (isFirstCategoryLoadRef.current) {
      isFirstCategoryLoadRef.current = false;
      if (activeCategory === "All") return;
    }

    const controller = new AbortController();

    const fetchCategoryFeed = async () => {
      setIsRefreshing(true);
      setLoadError(null);

      try {
        const params = new URLSearchParams();
        params.set("seed", String(seedRef.current));
        if (activeCategory !== "All") {
          params.set("category", activeCategory);
        }

        const res = await fetch(`/api/tasks/feed?${params.toString()}`, {
          signal: controller.signal,
        });

        const body = (await res
          .json()
          .catch(() => ({}))) as Partial<FeedResponse & { error?: string }>;

        if (!res.ok) {
          throw new Error(body.error || "Failed to load tasks");
        }

        const payload = body as FeedResponse;

        setItems(payload.listings ?? []);
        setHasMore(Boolean(payload.hasMore));
        setNextCursor(payload.nextCursor ?? null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to load tasks";
        setLoadError(message);
      } finally {
        setIsRefreshing(false);
      }
    };

    void fetchCategoryFeed();

    return () => {
      controller.abort();
    };
  }, [activeCategory, initialSearch]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-7xl px-4 pt-2 pb-10 flex flex-col gap-4">
        {!initialSearch.trim() && (
          <CategoryFilters
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        )}

        <section className="mt-6 flex-1">
          <div className="mb-6 space-y-1">
            {initialSearch.trim() && filteredListings.length > 0 && (
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)]"
              >
                Back to tasks
              </button>
            )}
            {initialSearch.trim() && (
              <h2 className="text-lg text-[var(--text-muted)]">
                Search results for {""}
                <span className="font-semibold text-[var(--text-secondary)]">
                  &ldquo;{initialSearch.trim()}&rdquo;
                </span>
              </h2>
            )}
          </div>

          {loadError && (
            <p className="mb-3 text-xs text-[var(--danger)]">{loadError}</p>
          )}

          {isRefreshing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {Array.from({ length: 9 }).map((_, index) => (
                <div
                  key={`initial-skeleton-${index}`}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 animate-pulse flex flex-col gap-3 min-h-[220px]"
                >
                  <div className="h-4 w-2/3 rounded bg-[var(--bg-muted)]" />
                  <div className="h-3 w-full rounded bg-[var(--bg-muted)]" />
                  <div className="h-3 w-5/6 rounded bg-[var(--bg-muted)]" />
                  <div className="mt-2 h-5 w-1/3 rounded-full bg-[var(--bg-muted)]" />
                </div>
              ))}
            </div>
          ) : filteredListings.length === 0 && initialSearch.trim() ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No tasks found for
                <span className="font-semibold text-[var(--text-secondary)]">&nbsp;
                  &ldquo;{initialSearch.trim()}&rdquo;
                </span>
                .
              </p>
              <Link
                href="/"
                className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                Go back to home
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
              {Array.from({ length: skeletonCount }).map((_, index) => (
                <div
                  key={`skeleton-${index}`}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 animate-pulse flex flex-col gap-3"
                >
                  <div className="h-4 w-2/3 rounded bg-[var(--bg-muted)]" />
                  <div className="h-3 w-full rounded bg-[var(--bg-muted)]" />
                  <div className="h-3 w-5/6 rounded bg-[var(--bg-muted)]" />
                  <div className="mt-2 h-5 w-1/3 rounded-full bg-[var(--bg-muted)]" />
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <div ref={loadMoreRef} className="mt-6 flex justify-center">
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
        </section>
      </main>
    </div>
  );
}
