"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UsernameOnboardingClientProps {
  initialUsername: string;
  redirectPath: string;
  email: string;
}

export default function UsernameOnboardingClient({
  initialUsername,
  redirectPath,
  email,
}: UsernameOnboardingClientProps) {
  const [username, setUsername] = useState(initialUsername);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = username.trim();
    if (!trimmed) {
      setError("Please choose a username.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(trimmed)) {
      setError("Usernames must be 3-32 characters and use letters, numbers, underscores, or dashes.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc("update_profile", {
        p_display_name: trimmed,
        p_avatar_url: null,
      });

      if (rpcError) {
        console.error("Error updating profile username from onboarding:", rpcError);
        if (
          rpcError.message?.toLowerCase().includes("already exists") ||
          rpcError.message?.toLowerCase().includes("duplicate")
        ) {
          setError("That username is already taken. Please try another.");
        } else {
          setError("There was a problem saving your username. Please try again.");
        }
        setLoading(false);
        return;
      }

      router.push(redirectPath || "/");
    } catch (err) {
      console.error("Unexpected error saving username from onboarding:", err);
      setError("There was a problem saving your username. Please try again.");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push(redirectPath || "/");
  };

  const emailHint = email ? ` (${email})` : "";

  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12 bg-[var(--bg-primary)]"
    >
      <section className="w-full max-w-md">
        <div
          className="rounded-2xl border bg-white/95 p-8 shadow-md backdrop-blur-sm card"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <header className="mb-6 text-center">
            <h1 className="mb-1 text-2xl font-bold title-font">Choose your username</h1>
            <p className="text-sm body-font text-[var(--text-secondary)]">
              We created a suggestion based on your Google account{emailHint}. You can change it now or later in
              your account settings.
            </p>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 p-3">
              <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium body-font">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="off"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2 disabled:opacity-50"
                style={{
                  borderColor: "var(--border-color)",
                  backgroundColor: "var(--bg-secondary)",
                  boxShadow: "0 0 0 1px transparent",
                }}
              />
              <p className="text-xs text-[var(--text-secondary)]">
                This will be shown on your profile and on tasks you post.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/70 transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={loading}
                className="default inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold body-font transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save username"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
