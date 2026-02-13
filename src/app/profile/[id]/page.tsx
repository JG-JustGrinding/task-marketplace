"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ListingCard from "@/components/ListingCard";
import { LISTINGS } from "@/data/listings";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const [createdExpanded, setCreatedExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(true);

  // Mock user data for design
  const userName = "Alex Rivera";
  const userInitial = userName.charAt(0);
  const memberSince = "January 2025";
  
  // Mock created and completed listings
  // In a real app, these would be filtered by user ID
  const createdListings = [LISTINGS[0], LISTINGS[1]];
  const completedListings = [LISTINGS[2]];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header search="" onSearchChange={() => {}} />

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Profile Header */}
        <section className="card p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="h-24 w-24 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-3xl font-semibold text-[var(--text-primary)]">
              {userInitial}
            </div>
            
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h1 className="text-2xl font-semibold">{userName}</h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Member since {memberSince}
              </p>
              
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start text-sm pt-2">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {createdListings.length}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Created
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {completedListings.length}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Created Listings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Created listings</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)]">
                {createdListings.length} {createdListings.length === 1 ? 'listing' : 'listings'}
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

        {/* Completed Listings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Completed listings</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-secondary)]">
                {completedListings.length} {completedListings.length === 1 ? 'listing' : 'listings'}
              </span>
              <button
                type="button"
                onClick={() => setCompletedExpanded((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] transition"
                aria-expanded={completedExpanded}
                aria-controls="completed-listings"
              >
                {completedExpanded ? "Collapse" : "Expand"}
                <FontAwesomeIcon
                  icon={faCaretDown}
                  className={`text-xs transition-transform ${completedExpanded ? "rotate-180" : "rotate-0"}`}
                />
              </button>
            </div>
          </div>
          
          {completedExpanded && (
            <div id="completed-listings">
              {completedListings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedListings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    No listings completed yet.
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
