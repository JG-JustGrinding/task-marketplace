"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faHouse } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

interface HeaderProps {
  user: any;
  profile?: any;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export default function Header({ user, profile, search = "", onSearchChange }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    // Keep header input in sync when navigating between pages
    if (pathname === "/search") {
      const q = searchParams.get("q") || "";
      setLocalSearch(q);
    } else if (!search) {
      setLocalSearch("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  const isLoggedIn = !!user;
  const userName = profile ? profile.username : "No Username";
  const userInitial = userName?.charAt(0);

  const handleChange = (value: string) => {
    setLocalSearch(value);
    onSearchChange?.(value);
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    const query = localSearch.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <header className="w-full border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="relative h-10 w-10">
            <Image
              src="/logos/bountask_logo_icon.svg"
              alt="Bountask Logo"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <div className="hidden sm:block">
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Boun<span className="text-[var(--accent-primary)]">task</span>
            </span>
          </div>
        </Link>

        <div className="flex-1 max-w-md ml-auto">
          <form className="relative" onSubmit={handleSubmit}>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search tasks, skills, or keywords..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
          </form>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-2">
          <a
            href="/create"
            className={
              "hidden sm:inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm transition-all " +
              (isLoggedIn
                ? "bg-[var(--accent-primary)] text-white font-semibold shadow-sm hover:shadow-md hover:brightness-110"
                : "border border-[var(--border-color)] bg-[var(--bg-muted)]/60 text-[var(--text-primary)] hover:bg-[var(--bg-muted)]")
            }
          >
            <FontAwesomeIcon icon={faPlus} className="h-3 w-3" />
            <span>Create task</span>
          </a>

          {isLoggedIn && (
            <a
              href="/hub"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-muted)]/70 px-3 py-1.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
            >
              <FontAwesomeIcon icon={faHouse} className="h-3 w-3" />
              <span className="hidden sm:inline">Hub</span>
            </a>
          )}

          {isLoggedIn ? (
            <a
              href={`/profile/${user.id}`}
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              aria-label={`Go to ${userName}'s profile`}
            >
              <div className="h-9 w-9 rounded-full bg-[var(--accent-primary)] flex items-center justify-center text-sm font-semibold text-white">
                {userInitial}
              </div>
            </a>
          ) : (
            <>
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/70 transition-colors"
              >
                Log in
              </a>
              <a href="/signup">
                <button className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:shadow-md hover:brightness-110 transition-all">
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
