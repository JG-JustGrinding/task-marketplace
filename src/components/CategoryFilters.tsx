"use client";
import { CATEGORY_OPTIONS } from "@/lib/categories";

const CATEGORIES = ["All", ...CATEGORY_OPTIONS];

interface CategoryFiltersProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function CategoryFilters({
  activeCategory,
  onCategoryChange,
}: CategoryFiltersProps) {
  return (
    <section className="w-full border-b border-[var(--border-color)] bg-[var(--bg-primary)]/90">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto md:overflow-visible">
        {CATEGORIES.map((category) => {
          const isActive = activeCategory === category || (activeCategory === "All" && category === "All");

          return (
            <button
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm whitespace-nowrap tranWsition-colors border uncolored ${
                isActive
                  ? "bg-[var(--accent-primary)] text-white border-transparent shadow-sm"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-muted)]"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>
    </section>
  );
}
