"use client";

import { useMemo, useState } from "react";
import CategoryFilters from "@/components/CategoryFilters";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/data/listings";

type HomeFeedClientProps = {
  listings: Listing[];
};

export default function HomeFeedClient({ listings }: HomeFeedClientProps) {
  const [search, setSearch] = useState("");
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

        {/* Optional: hook up search input later */}

        <section className="mt-6 flex-1">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
              {filteredListings.length} listing
              {filteredListings.length !== 1 && "s"} available
            </h2>
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
