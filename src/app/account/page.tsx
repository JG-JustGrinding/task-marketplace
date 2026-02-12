"use client";

import { useState } from "react";
import Header from "@/components/Header";

const TABS = ["My Profile", "Dashboard", "Settings"] as const;

type Tab = (typeof TABS)[number];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>("My Profile");

  // Mock user data for design only
  const username = "alexrivera";
  const email = "alex@example.com";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Header search="" onSearchChange={() => {}} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="card flex flex-col md:flex-row gap-6 p-4 md:p-6">
          {/* Sidebar */}
          <aside className="w-full md:w-56 md:mr-6 md:border-r md:border-[var(--border-color)] md:pr-4">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`none uncolored w-full text-left px-3 py-2 rounded-md text-sm font-medium transition border-l-2 ${
                      isActive
                        ? "bold border-[var(--accent-primary)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Main content */}
          <section className="flex-1 min-w-0 space-y-6">
            {activeTab === "Dashboard" && (
              <div className="space-y-3">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                This is a simple placeholder dashboard. You can add stats,
                recent activity, or shortcuts here later.
              </p>
            </div>
            )}

            {activeTab === "My Profile" && (
              <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">My Profile</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Manage how your account looks and basic details.
                </p>
              </div>

              {/* Top row: avatar + basic info */}
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-20 w-20 rounded-full bg-[var(--bg-muted)] flex items-center justify-center text-xl font-semibold text-[var(--text-primary)]">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                  >
                    Change photo
                  </button>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-muted)]">
                      Username
                    </label>
                    <input
                      type="text"
                      defaultValue={username}
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-muted)]">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      readOnly
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--text-secondary)] cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Change password */}
              <div className="pt-4 border-t border-[var(--border-color)] space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Change password</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    For now this is just a design mock; no changes are saved.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-muted)]">
                      Current password
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-muted)]">
                      New password
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[var(--text-muted)]">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)]"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </div>
            )}

            {activeTab === "Settings" && (
              <div className="space-y-3">
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                General account preferences and notification settings can go here
                later.
              </p>
            </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
