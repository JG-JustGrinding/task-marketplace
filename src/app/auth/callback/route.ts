import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Only allow same-origin relative paths for `next` to prevent open redirects.
function sanitizeNextPath(raw: string | null | undefined): string {
	if (!raw || typeof raw !== "string") return "/";
	// Must start with a single "/" and must not start with "//" or "/\\"
	if (!raw.startsWith("/")) return "/";
	if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
	return raw;
}

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
	const error = requestUrl.searchParams.get("error");
	const origin = requestUrl.searchParams.get("origin");

	const buildAuthRedirect = (reason: "oauth_error" | "exchange_error") => {
		const authPath = origin === "signup" ? "/signup" : "/login";
		const url = new URL(authPath, requestUrl.origin);
		if (next) {
			url.searchParams.set("redirect", next);
		}
		url.searchParams.set("error", reason);
		return NextResponse.redirect(url);
	};

	if (error || !code) {
		return buildAuthRedirect("oauth_error");
	}

	try {
		const supabase = await createClient();
		await supabase.auth.exchangeCodeForSession(code);

		// After exchanging the code, check if this is a new user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return buildAuthRedirect("exchange_error");
		}

		const { data: profile } = await supabase
			.from("profiles")
			.select("username")
			.eq("id", user.id)
			.maybeSingle();

		const hasUsername = !!profile && typeof profile.username === "string" && profile.username.trim() !== "";

		if (!hasUsername) {
			// Generate a suggested username from the Google display name / metadata
			const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
			const rawName =
				(typeof meta.display_name === "string" && meta.display_name) ||
				(typeof meta.full_name === "string" && meta.full_name) ||
				(typeof meta.name === "string" && meta.name) ||
				(user.email ? user.email.split("@")[0] : "");

			let base = (rawName || "user")
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "");

			if (!base) {
				base = "user";
			}

			const suggested = base.slice(0, 24);

			const completeProfileUrl = new URL("/auth/complete-profile", requestUrl.origin);
			if (next) {
				completeProfileUrl.searchParams.set("redirect", next);
			}
			completeProfileUrl.searchParams.set("suggested", suggested);

			return NextResponse.redirect(completeProfileUrl);
		}
	} catch {
		return buildAuthRedirect("exchange_error");
	}

	return NextResponse.redirect(new URL(next, requestUrl.origin));
}
