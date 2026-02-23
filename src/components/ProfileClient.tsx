"use client";

import { useState } from "react";
import ListingCard from "@/components/ListingCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

type Task = {
  id: number;
  title: string;
  short_description: string | null;
  price: number;
  categories: string[] | null;
};

interface ProfileClientProps {
  userName: string;
  memberSince?: string | null;
  isCurrentUser: boolean;
  createdTasks: Task[];
}

export default function ProfileClient({
  userName,
  memberSince,
  isCurrentUser,
  createdTasks,
}: ProfileClientProps) {
  const [createdExpanded, setCreatedExpanded] = useState(true);

  const userInitial = userName.charAt(0).toUpperCase();

  const createdListings = (createdTasks ?? []).map((task) => ({
    id: task.id,
    title: task.title,
    categories: task.categories ?? [],
    description: task.short_description ?? undefined,
    price: task.price,
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Profile Header */}
        <section className="card p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-3xl font-semibold text-[var(--text-primary)]">
              {userInitial}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-3">
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
                    {createdListings.length}
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
                {createdListings.length} {createdListings.length === 1 ? "listing" : "listings"}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createdListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
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
