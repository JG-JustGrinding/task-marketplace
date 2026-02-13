"use client";

export default function LoginPage() {
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
          
				<div
					className="mb-8 text-center"
					aria-label="Task marketplace logo"
				>
					<span className="inline-flex items-baseline gap-1.5 text-2xl font-bold tracking-tight title-font">
						<span>{process.env.NEXT_PUBLIC_SITE_NAME}</span>
					</span>
					<p className="mt-2 text-sm uppercase tracking-[0.2em] body-font">
						{process.env.NEXT_PUBLIC_SITE_SLOGAN}
					</p>
				</div>
        
					<header className="mb-6">
						<h1 className="mb-1 text-2xl font-bold title-font">
							Log In
						</h1>
						{false && <p className="text-sm body-font">
							Sign in to complete tasks and earn.
						</p> }
					</header>

					<form className="space-y-5" aria-label="Sign in form">
						<div className="space-y-2">
							<label
								htmlFor="email"
								className="block text-sm font-medium body-font"
							>
								Email address
							</label>
							<input
								id="email"
								name="email"
								type="email"
								autoComplete="email"
								required
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
									boxShadow: "0 0 0 1px transparent",
								}}
							/>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="password"
								className="block text-sm font-medium body-font"
							>
								Password
							</label>
							<input
								id="password"
								name="password"
								type="password"
								autoComplete="current-password"
								required
								className="w-full rounded-lg border px-3 py-2 text-sm body-font outline-none transition focus:ring-2"
								style={{
									borderColor: "var(--border-color)",
									backgroundColor: "var(--bg-secondary)",
								}}
							/>
						</div>

						<button
							type="submit"
							className="mt-2 w-full rounded-lg px-4 py-2 text-sm font-semibold body-font transition-colors"
						>
							Log In
						</button>
					</form>

					<div className="mt-6 space-y-4">
						<div className="flex items-center gap-3">
							<hr className="h-px flex-1 border-0 bg-[color:var(--border-color)]" />
							<span className="text-xs uppercase tracking-[0.2em] body-font">
								Or
							</span>
							<hr className="h-px flex-1 border-0 bg-[color:var(--border-color)]" />
						</div>

						<button
							type="button"
							className="btn-outline uncolored w-full rounded-lg px-4 py-2 text-sm font-semibold body-font transition-colors btn-outline flex items-center justify-center gap-2"
							aria-label="Log in with Google account"
						>
							<img
								src="/logo_google.png"
								alt="Google"
								className="h-4 w-4"
							/>
							<span>Continue with Google</span>
						</button>
					</div>

					<p className="mt-6 text-center text-sm body-font">
						Don&apos;t have an account?{" "}
						<a
							href="/signup"
						>
							<b>Sign up</b>
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}

