import Link from "next/link";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export default async function NotFound() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id)
    .single();

  return (
    <>
      <main className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 bg-[var(--bg-primary)]">
        <div className="max-w-md w-full text-center card">
          <p className="text-sm font-semibold tracking-wide text-[var(--accent-primary)] mb-2">
            404
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-[var(--text-primary)]">
            Page Not Found
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-6">
            The page you are looking for doesn&apos;t exist or may have been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex justify-center items-center rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all"
            >
              Browse Tasks
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
