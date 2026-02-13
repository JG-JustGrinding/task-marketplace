"use client";

import { useState } from "react";

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export default function Header({ search, onSearchChange }: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(search);
  
  // Mock auth state - in a real app, this would come from auth context/session
  const isLoggedIn = false; // Change to true to see logged-in state
  const userName = "Alex Rivera";
  const userInitial = userName.charAt(0);

  const handleChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange(value);
  };

  return (
    <header className="w-full border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-4">
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

        {/* Auth Section */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <a
              href="/profile/1"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              aria-label={`Go to ${userName}'s profile`}
            >
              <div className="h-9 w-9 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-sm font-semibold text-white">
                {userInitial}
              </div>
            </a>
          ) : (
            <>
              <a href="/login" className="text-sm font-medium body-font hover:opacity-80 transition-opacity">
                Log in
              </a>
              <a href="/signup">
                <button className="text-sm font-semibold body-font px-4 py-2">
                  Sign up
                </button>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
