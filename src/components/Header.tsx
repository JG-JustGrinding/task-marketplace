"use client";

import { useState } from "react";

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function Header({ search, onSearchChange }: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const handleChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange(value);
  };

  return (
    <header className="w-full border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-[0.16em]">
            <b>{process.env.NEXT_PUBLIC_SITE_NAME}</b>
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--text-primary)]">
            Find work that fits your flow
          </h1>
        </div>

        <div className="flex-1 max-w-md ml-auto">
          <div className="relative">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search tasks, skills, or keywords..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
