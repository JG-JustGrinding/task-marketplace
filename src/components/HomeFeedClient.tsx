"use client";

import { useMemo, useState } from "react";
import CategoryFilters from "@/components/CategoryFilters";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/data/listings";

type HomeFeedClientProps = {
  listings: Listing[];
  initialSearch?: string;
};

export default function HomeFeedClient({ listings, initialSearch = "" }: HomeFeedClientProps) {
  const [search, setSearch] = useState(initialSearch);
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesCategory =
        activeCategory === "All" || listing.categories.includes(activeCategory);

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        listing.title.toLowerCase().includes(query) ||
        listing.categories.some((c) => c.toLowerCase().includes(query)) ||
        (listing.description && listing.description.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, listings]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-7xl px-4 pt-2 pb-10 flex flex-col gap-4">
        <CategoryFilters
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
        {/* Search is handled globally in the header; this component just filters based on the current query. */}

        <section className="mt-6 flex-1">
          <div className="mb-6 space-y-1">
            {initialSearch.trim() && (
              <p className="text-xs text-[var(--text-muted)]">
                Search results for {""}
                <span className="font-semibold text-[var(--text-secondary)]">
                  &ldquo;{initialSearch.trim()}&rdquo;
                </span>
              </p>
            )}
            <div className="flex items-center justify-between">
              {false && (
                <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
                  {filteredListings.length} task
                  {filteredListings.length !== 1 && "s"} available
                </h2>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
