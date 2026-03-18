import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
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

  return res;
}

// Apply Supabase auth refresh middleware to all non-static routes
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
