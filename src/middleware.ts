import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  applyRateLimitHeaders,
  createRateLimitResponse,
  rateLimitByIp,
} from "@/lib/rateLimit";

const RATE_LIMIT_EXCLUDED_PATHS = [
  "/api/stripe/webhook",
  "/api/tasks/auto-accept-submissions",
  "/api/tasks/enforce-time-limits",
  "/api/tasks/expire-checkins",
];

function shouldApplyApiRateLimit(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) {
    return false;
  }

  return !RATE_LIMIT_EXCLUDED_PATHS.some((excludedPath) =>
    pathname.startsWith(excludedPath),
  );
}

export async function middleware(req: NextRequest) {
  let apiRateLimitResult = null;

  if (shouldApplyApiRateLimit(req.nextUrl.pathname)) {
    apiRateLimitResult = await rateLimitByIp("api", req);

    if (!apiRateLimitResult.success) {
      return createRateLimitResponse(
        "Too many requests. Please try again shortly.",
        apiRateLimitResult,
      );
    }
  }

  // Clone the request headers for the downstream response
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // This will refresh the session if needed and update cookies on the response
  await supabase.auth.getUser().catch(() => {
    // If refresh fails (e.g. refresh token expired), let the request continue;
    // downstream code can treat the user as signed out.
  });

  if (apiRateLimitResult) {
    applyRateLimitHeaders(res, apiRateLimitResult);
  }

  return res;
}

// Apply Supabase auth refresh middleware to all non-static routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
