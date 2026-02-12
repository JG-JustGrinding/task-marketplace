"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import CategoryFilters from "@/components/CategoryFilters";
import ListingCard from "@/components/ListingCard";
import { LISTINGS } from "@/data/listings";

export default function Home() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredListings = useMemo(() => {
    return LISTINGS.filter((listing) => {
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
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header search={search} onSearchChange={setSearch} />

      <main className="mx-auto max-w-5xl px-4 pt-2 pb-10 flex flex-col gap-4">
        <CategoryFilters
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        <section className="mt-4 flex-1">
          <div className="flex items-center justify-between mb-3">
            {filteredListings.length < 11 && <h2 className="text-sm font-medium text-[var(--text-secondary)]">
              {filteredListings.length} listing{filteredListings.length !== 1 && "s"}
            </h2>}
          </div>

          <div className="space-y-3 md:space-y-4">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
