"use client";

export default function WelcomePage() {
	return (
		<main style={{ backgroundColor: "var(--bg-primary)" }}>
			{/* Header */}
			<header className="border-b" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
					<div aria-label="Task marketplace logo">
						<span className="inline-flex items-baseline gap-1.5 text-xl font-bold tracking-tight title-font">
							<span>{process.env.NEXT_PUBLIC_SITE_NAME}</span>
						</span>
					</div>
					<nav className="flex items-center gap-4">
						<a href="/login" className="text-sm font-medium body-font">
							Log in
						</a>
						<a href="/signup">
							<button className="text-sm font-semibold body-font">
								Sign up
							</button>
						</a>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="px-6 py-20 md:py-32">
				<div className="mx-auto max-w-4xl text-center">
					<h1 className="text-4xl font-bold leading-tight title-font md:text-5xl lg:text-6xl">
						Post tasks.
						<br />
						Get them done.
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
						A marketplace where anyone can list creative tasks they need completed—from game soundtracks to design work—and skilled people can earn by delivering quality results.
					</p>
					<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
						<a href="/signup">
							<button className="px-6 py-3 text-base font-semibold body-font">
								Get started
							</button>
						</a>
						<a href="/login">
							<button className="btn-outline px-6 py-3 text-base font-semibold body-font">
								Browse tasks
							</button>
						</a>
					</div>
				</div>
			</section>

			{/* How It Works */}
			<section className="px-6 py-16">
				<div className="mx-auto max-w-6xl">
					<h2 className="mb-12 text-center text-3xl font-bold title-font">
						How it works
					</h2>
					<div className="grid gap-8 md:grid-cols-3">
						<div
							className="rounded-2xl border p-6 card"
							style={{
								backgroundColor: "var(--bg-secondary)",
								borderColor: "var(--border-color)",
								boxShadow: "var(--shadow-soft)",
							}}
						>
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--bg-muted)" }}>
								<span className="text-2xl font-bold title-font">1</span>
							</div>
							<h3 className="mb-2 text-xl font-semibold title-font">
								Post a task
							</h3>
							<p className="text-sm leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
								Describe what you need—a soundtrack for your game, illustration work, voice acting, or any creative project. Set your budget and deadline.
							</p>
						</div>

						<div
							className="rounded-2xl border p-6 card"
							style={{
								backgroundColor: "var(--bg-secondary)",
								borderColor: "var(--border-color)",
								boxShadow: "var(--shadow-soft)",
							}}
						>
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--bg-muted)" }}>
								<span className="text-2xl font-bold title-font">2</span>
							</div>
							<h3 className="mb-2 text-xl font-semibold title-font">
								Receive submissions
							</h3>
							<p className="text-sm leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
								Talented creators browse tasks and submit their work. Review submissions, communicate with creators, and choose the best fit.
							</p>
						</div>

						<div
							className="rounded-2xl border p-6 card"
							style={{
								backgroundColor: "var(--bg-secondary)",
								borderColor: "var(--border-color)",
								boxShadow: "var(--shadow-soft)",
							}}
						>
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--bg-muted)" }}>
								<span className="text-2xl font-bold title-font">3</span>
							</div>
							<h3 className="mb-2 text-xl font-semibold title-font">
								Pay and complete
							</h3>
							<p className="text-sm leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
								Accept the work you love, release payment securely, and get your project assets. Creators get paid when you approve their work.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-6 py-16">
				<div className="mx-auto max-w-6xl">
					<div className="grid gap-12 md:grid-cols-2 md:items-center">
						<div>
							<h2 className="mb-4 text-3xl font-bold title-font">
								For task posters
							</h2>
							<p className="mb-6 leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
								Need creative work done? Post your task and let skilled creators compete to deliver the best result for your project.
							</p>
							<ul className="space-y-3 body-font">
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Set your own budget and timeline</span>
								</li>
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Review multiple submissions before choosing</span>
								</li>
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Pay only when you're satisfied</span>
								</li>
							</ul>
						</div>
						<div>
							<h2 className="mb-4 text-3xl font-bold title-font">
								For creators
							</h2>
							<p className="mb-6 leading-relaxed body-font" style={{ color: "var(--text-secondary)" }}>
								Turn your skills into income. Browse available tasks, submit your best work, and earn when clients accept your submissions.
							</p>
							<ul className="space-y-3 body-font">
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Browse tasks that match your skills</span>
								</li>
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Work on your own schedule</span>
								</li>
								<li className="flex items-start gap-3">
									<span className="mt-1 text-lg" style={{ color: "var(--accent-primary)" }}>✓</span>
									<span>Build your portfolio and reputation</span>
								</li>
							</ul>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-6 py-20">
				<div
					className="mx-auto max-w-4xl rounded-3xl border p-12 text-center card"
					style={{
						backgroundColor: "var(--bg-secondary)",
						borderColor: "var(--border-color)",
						boxShadow: "var(--shadow-soft)",
					}}
				>
					<h2 className="mb-4 text-3xl font-bold title-font">
						Ready to get started?
					</h2>
					<p className="mx-auto mb-8 max-w-xl body-font" style={{ color: "var(--text-secondary)" }}>
						Join thousands of creators and task posters building projects together.
					</p>
					<a href="/signup">
						<button className="px-8 py-3 text-base font-semibold body-font">
							Create your account
						</button>
					</a>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t px-6 py-8" style={{ borderColor: "var(--border-color)" }}>
				<div className="mx-auto max-w-6xl text-center">
					<p className="text-sm body-font" style={{ color: "var(--text-muted)" }}>
						© 2026 {process.env.NEXT_PUBLIC_SITE_NAME}. All rights reserved.
					</p>
				</div>
			</footer>
		</main>
	);
}
