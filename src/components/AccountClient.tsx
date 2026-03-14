"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TABS = ["My Profile", "Settings", "Subscription", "Sign out"] as const;

type Tab = (typeof TABS)[number];

interface AccountClientProps {
  username: string;
  email: string;
  userId: string;
  allowImportantEmails: boolean;
  allowPromotionalEmails: boolean;
  allowActivityEmails: boolean;
}

export default function AccountClient({
  username,
  email,
  userId,
  allowImportantEmails: initialAllowImportantEmails,
  allowPromotionalEmails: initialAllowPromotionalEmails,
  allowActivityEmails: initialAllowActivityEmails,
}: AccountClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("My Profile");
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [profileUsername, setProfileUsername] = useState(username);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [allowImportantEmails, setAllowImportantEmails] = useState(initialAllowImportantEmails);
  const [allowPromotionalEmails, setAllowPromotionalEmails] = useState(initialAllowPromotionalEmails);
  const [allowActivityEmails, setAllowActivityEmails] = useState(initialAllowActivityEmails);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError("Something went wrong signing you out. Please try again.");
        setIsSigningOut(false);
        return;
      }

      window.location.href = "/login";
    } catch (err) {
      setSignOutError("Something went wrong signing you out. Please try again.");
      setIsSigningOut(false);
    }
  };

  const resetErrorAndSuccess = () => {
    setProfileError(null);
    setProfileSuccess(null);
  }

  const resetSettingsMessages = () => {
    setSettingsError(null);
    setSettingsSuccess(null);
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    resetErrorAndSuccess();

    try {
      let hadError = false;

      // Update profile username if it changed and is non-empty.
      if (profileUsername.trim() && profileUsername.trim() !== username) {
        const supabase = createClient();
        const { error } = await supabase.rpc("update_profile", {
          p_display_name: profileUsername.trim(),
          p_avatar_url: null,
        });

        if (error) {
          setProfileError("There was a problem saving your profile. Please try again.");
          hadError = true;
        }
      }

      // Handle password change if any password field has been filled in.
      const wantsPasswordChange =
        currentPassword.trim() || newPassword.trim() || confirmPassword.trim();

      if (wantsPasswordChange) {
        if (!currentPassword || !newPassword || !confirmPassword) {
          setProfileError("Please fill out all password fields.");
          hadError = true;
        } else if (newPassword.length < 8) {
          setProfileError("New password must be at least 8 characters long.");
          hadError = true;
        } else if (newPassword !== confirmPassword) {
          setProfileError("New password and confirmation do not match.");
          hadError = true;
        } else {
          const res = await fetch("/api/account/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            setProfileError(data?.error || "There was a problem updating your password.");
            hadError = true;
          } else {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        }
      }

      if (!hadError) {
        setProfileSuccess("Account updated.");
      }
    } catch (err) {
      setProfileError("There was a problem saving your profile. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    resetSettingsMessages();

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("update_email_preferences", {
        p_allow_important_emails: allowImportantEmails,
        p_allow_promotional_emails: allowPromotionalEmails,
        p_allow_activity_emails: allowActivityEmails,
      });

      if (error) {
        setSettingsError("There was a problem saving your settings. Please try again.");
      } else {
        setSettingsSuccess("Settings updated.");
      }
    } catch (err) {
      setSettingsError("There was a problem saving your settings. Please try again.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="card flex flex-col md:flex-row gap-6 p-4 md:p-6">
          {/* Sidebar */}
          <aside className="w-full md:w-56 md:mr-6 md:border-r md:border-[var(--border-color)] md:pr-4">
            <nav className="space-y-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                const isSignOut = tab === "Sign out";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      if (isSignOut) {
                        setShowSignOutModal(true);
                        setSignOutError(null);
                      } else {
                        setSettingsSuccess(null);
                        setProfileSuccess(null);
                        setSettingsError(null);
                        setProfileError(null);
                        setActiveTab(tab);
                      }
                    }}
                    className={`none uncolored w-full text-left px-3 py-2 rounded-md text-sm font-medium transition border-l-2 ${isSignOut
                        ? "border-transparent text-[var(--danger-less-saturated)] hover:bg-[var(--bg-muted)]"
                        : isActive
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
            {activeTab === "Subscription" && (
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Subscription</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Manage your Bountask subscription.
                </p>
              </div>
            )}

            {activeTab === "My Profile" && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">My Profile</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Manage your account.
                  </p>
                </div>

                {(profileError || profileSuccess) && (
                  <p
                    className={`text-xs ${profileError ? "text-[var(--danger)]" : "text-[var(--success)]"
                      }`}
                  >
                    {profileError || profileSuccess}
                  </p>
                )}

                {/* Top row: avatar + basic info */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-20 w-20 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-xl font-semibold text-white">
                      {profileUsername.charAt(0).toUpperCase()}
                    </div>
                    {false && (
                      <button
                        type="button"
                        className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)]"
                      >
                        Change photo
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profileUsername}
                        onChange={(e) => { setProfileUsername(e.target.value); resetErrorAndSuccess(); }}
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">
                        Current password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => { setCurrentPassword(e.target.value); resetErrorAndSuccess(); }}
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">
                        New password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); resetErrorAndSuccess(); }}
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">
                        Confirm new password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); resetErrorAndSuccess(); }}
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
                    >
                      {isSavingProfile ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Settings" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Settings</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Manage your notification preferences.
                  </p>
                </div>

                {(settingsError || settingsSuccess) && (
                  <p
                    className={`text-xs ${settingsError ? "text-[var(--danger)]" : "text-[var(--success)]"
                      }`}
                  >
                    {settingsError || settingsSuccess}
                  </p>
                )}


                <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">Allow activity emails</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Receive emails about important site events such as when someone starts, submits, or when your submission has been accepted.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                      checked={allowActivityEmails}
                      onChange={(e) => {
                        setAllowActivityEmails(e.target.checked);
                        resetSettingsMessages();
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Allow important email notifications</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Receive essential updates about your account, security, and
                        critical activity through email.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                        checked={allowImportantEmails}
                        onChange={(e) => {
                          setAllowImportantEmails(e.target.checked);
                          resetSettingsMessages();
                        }}
                      />
                    </label>
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Allow promotional emails</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Get emails about tips, product updates, and occasional promotions about
                        new tasks and features.
                      </p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                        checked={allowPromotionalEmails}
                        onChange={(e) => {
                          setAllowPromotionalEmails(e.target.checked);
                          resetSettingsMessages();
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
                  >
                    {isSavingSettings ? "Saving..." : "Save settings"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {showSignOutModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="card max-w-sm w-full mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Sign out</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Are you sure you want to sign out?
            </p>

            {signOutError && (
              <p className="text-xs text-[var(--danger)]">{signOutError}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!isSigningOut) {
                    setShowSignOutModal(false);
                  }
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSignOut}
                disabled={isSigningOut}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-70"
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
