import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
	const requestUrl = new URL(request.url);
	const code = requestUrl.searchParams.get("code");
	const next = requestUrl.searchParams.get("next") ?? "/";
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
	} catch {
		return buildAuthRedirect("exchange_error");
	}

	return NextResponse.redirect(new URL(next, requestUrl.origin));
}
