"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

const supabase = createClient();

export default function SignupClient() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const redirectParam = searchParams.get("redirect");
	const redirectPath =
		redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
			? redirectParam
			: "/";

	const errorParam = searchParams.get("error");

	useEffect(() => {
		if (!errorParam) return;

		if (errorParam === "oauth_error" || errorParam === "exchange_error") {
			setError("Unable to sign up with Google. Please try again.");
		}
	}, [errorParam]);

	const handleBack = () => {
		if (typeof document !== "undefined" && typeof window !== "undefined") {
			const referrer = document.referrer;
			try {
				if (referrer) {
					const referrerUrl = new URL(referrer);
					if (referrerUrl.origin === window.location.origin) {
						return router.back();
					}
				}
			} catch {
				// Ignore parsing errors and fall through to home redirect.
			}
		}

		router.push("/");
	};

	const handleGoogleSignIn = async () => {
		setError("");
		setLoading(true);

		try {
			const origin = window.location.origin;
			const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
				redirectPath,
			)}&origin=signup`;

			const { error: authError } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo,
				},
			});

			if (authError) {
				console.error("Google signup error:", authError);
				setError("Unable to sign up with Google. Please try again.");
				setLoading(false);
			}
		} catch (err) {
			console.error("Google signup unexpected error:", err);
			setError("An error occurred. Please try again.");
			setLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		setLoading(true);

		try {
			const { error: authError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					data: {
						display_name: displayName,
					},
				},
			});

			if (authError) {
				if (
					authError.message.includes("already registered") ||
					authError.message.includes("User already exists")
				) {
					setError("Email already in use");
				} else if (
					authError.message.includes("Invalid email") ||
					authError.message.includes("invalid email")
				) {
					setError("Please enter a valid email address");
				} else if (authError.message.includes("rate limit exceeded")) {
					setError("Too many requests. Please try again later.");
				} else {
					console.error("Signup error:", authError);
					setError("An error occurred. Please try again.");
				}
				setLoading(false);
				return;
			}

			router.push(redirectPath);
		} catch (err) {
			setError("An error occurred. Please try again.");
			setLoading(false);
		}
	};

	return (
		<main
			className="flex min-h-screen items-center justify-center px-4 py-12"
			style={{ backgroundColor: "var(--bg-primary)" }}
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
					<button
						type="button"
						onClick={handleBack}
						className="mb-4 inline-flex items-center text-sm body-font hover:text-[color:var(--accent-primary)] transition-colors"
						aria-label="Go back"
					>
						<span className="mr-1 text-lg">
							←
						</span>
					</button>

					<div className="mb-8 text-center" aria-label="Task marketplace logo">
						<span className="inline-flex items-baseline gap-1.5 text-2xl font-bold tracking-tight title-font">
							<span>{process.env.NEXT_PUBLIC_SITE_NAME}</span>
						</span>
						<p className="mt-2 text-sm uppercase tracking-[0.2em] body-font">
							{process.env.NEXT_PUBLIC_SITE_SLOGAN}
						</p>
					</div>
					{error && (
						<div className="mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger)]/10 p-3">
							<p className="text-sm font-medium" style={{ color: "var(--danger)" }}>
								{error}
							</p>
						</div>
					)}
					<header className="mb-6">
						<h1 className="mb-1 text-2xl font-bold title-font">Create Your Account</h1>
						<p className="text-sm body-font">
							Sign up to post tasks, complete work, and get paid.
						</p>
					</header>

					<form className="space-y-5" aria-label="Sign up form" onSubmit={handleSubmit}>
						<div className="space-y-2">
							<label htmlFor="name" className="block text-sm font-medium body-font">
								Username
							</label>
							<input
								id="name"
								name="name"
								type="text"
								autoComplete="name"
								required
								value={displayName}
								onChange={(e) => {
									setDisplayName(e.target.value);
									setError("");
								}}
								disabled={loading}
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2 disabled:opacity-50"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
									boxShadow: "0 0 0 1px transparent",
								}}
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="email" className="block text-sm font-medium body-font">
								Email Address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setError("");
								}}
								disabled={loading}
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2 disabled:opacity-50"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
									boxShadow: "0 0 0 1px transparent",
								}}
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="password" className="block text-sm font-medium body-font">
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="new-password"
								required
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									setError("");
								}}
								disabled={loading}
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2 disabled:opacity-50"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
								}}
							/>
						</div>

						<div className="space-y-2">
							<label htmlFor="confirmPassword" className="block text-sm font-medium body-font">
								Confirm Password
							</label>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type="password"
								autoComplete="new-password"
								required
								value={confirmPassword}
								onChange={(e) => {
									setConfirmPassword(e.target.value);
									setError("");
								}}
								disabled={loading}
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2 disabled:opacity-50"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
								}}
							/>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="default mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold body-font transition-colors disabled:opacity-50"
						>
							{loading ? "Creating account..." : "Create account"}
						</button>
					</form>

					<div className="mt-6 space-y-4">
						<div className="flex items-center gap-3">
							<hr className="h-px flex-1 border-0 bg-[color:var(--border-color)]" />
							<span className="text-xs uppercase tracking-[0.2em] body-font">Or</span>
							<hr className="h-px flex-1 border-0 bg-[color:var(--border-color)]" />
						</div>

						<button
							type="button"
							onClick={handleGoogleSignIn}
							disabled={loading}
							className="btn-outline uncolored w-full rounded-lg px-4 py-2 text-sm font-semibold body-font transition-colors btn-outline flex items-center justify-center gap-2 disabled:opacity-50"
							aria-label="Sign up with Google account"
						>
							<img src="/logo_google.png" alt="Google" className="h-4 w-4" />
							<span>Continue with Google</span>
						</button>
					</div>

					<p className="mt-6 text-center text-sm body-font">
						Already have an account?{" "}
						<a href={redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : "/login"}>
							<b>Log in</b>
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}
