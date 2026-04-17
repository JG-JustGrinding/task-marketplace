import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faClock, faCoins, faPuzzlePiece, faShieldHalved, faUsers } from "@fortawesome/free-solid-svg-icons";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bountask";
const siteTagline =
    process.env.NEXT_PUBLIC_SITE_SLOGAN ||
    "Turn problems into bounties. Post tasks, accept solutions, and pay only when a solution is accepted.";

const useCompleterLanguage = process.env.NEXT_USE_COMPLETER_LANGUAGE === "true";

export const metadata: Metadata = {
    title: "Welcome",
    description: siteTagline,
};

export default function WelcomePage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
            <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/95 backdrop-blur">
                <div className="text-center mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                        <div className="relative h-10 w-10">
                            <Image
                                src="/logos/bountask_logo_icon.svg"
                                alt={`${process.env.NEXT_PUBLIC_SITE_NAME} Logo`}
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

                    <nav className="flex items-center gap-3 sm:gap-5">
                        <Link
                            href="/"
                            className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                        >
                            Browse Tasks
                        </Link>
                        <Link
                            href="/create"
                            className="hidden text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] sm:inline"
                        >
                            Post a Task
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center rounded-full border border-[var(--border-color)] bg-transparent px-4 py-2 text-xs sm:text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)]/70 transition-colors"
                        >
                            Log In
                        </Link>
                        <Link
                            href="/signup"
                            className="rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] sm:px-6"
                        >
                            Sign Up
                        </Link>
                    </nav>
                </div>
            </header>

            <main className="flex-1 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-primary)] to-[var(--bg-muted)]">
                <section className="relative overflow-hidden border-b border-[var(--border-color)] bg-gradient-to-br from-[var(--accent-primary)] via-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
                    <div className="pointer-events-none absolute inset-0 opacity-15" aria-hidden="true">
                        <div className="bg-grid-pattern h-full w-full" />
                    </div>

                    <div className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:gap-16 lg:py-24 lg:px-8">
                        <div className="max-w-xl lg:max-w-2xl">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/80 ring-1 ring-white/20">
                                {useCompleterLanguage
                                    ? "Post tasks. Earn by completing them."
                                    : "Post tasks. Earn by solving them."}
                            </span>
                            <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                                Turn Problems Into Bounties.
                                <span className="block text-white/90">
                                    {useCompleterLanguage
                                        ? "Post Tasks or Earn by Completing Them."
                                        : "Post Tasks or Earn by Solving Them."}
                                </span>
                            </h1>
                            <p className="mt-5 text-base text-white/85 sm:text-lg">
                                {useCompleterLanguage
                                    ? "Post a problem with a bounty and let completers submit their work. Accept the best submission, pay the reward, and keep everything in one simple flow on "
                                    : "Post a problem with a bounty and let solvers submit their solutions. Accept the best solution, pay the reward, and keep everything in one simple flow on "}
                                {siteName}.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    href="/create"
                                    className="inline-flex items-center justify-center rounded-lg border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 sm:px-8"
                                >
                                    Post a Task
                                </Link>
                                <Link
                                    href="/signup"
                                    className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-[var(--accent-primary)] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-xl sm:px-8"
                                >
                                    Sign up
                                </Link>
                            </div>

                            {false && <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/75 sm:text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Escrowed payments</span>
                                    <span>Powered by Stripe</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-base">★</span>
                                    <span>
                                        Built for creative makers and freelancers
                                    </span>
                                </div>
                            </div>}
                        </div>

                        <div className="flex flex-1 justify-center lg:justify-end">
                            <div className="w-full max-w-md rounded-2xl bg-[var(--bg-secondary)]/95 p-5 text-[var(--text-primary)] shadow-2xl shadow-black/20 backdrop-blur">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                                    Take a look
                                </p>
                                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                    {useCompleterLanguage
                                        ? "A glimpse of the kinds of problems people post and complete on "
                                        : "A glimpse of the kinds of problems people post and solve on "}
                                    {siteName}.
                                </p>

                                <div className="mt-6 space-y-3">
                                    <div className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-semibold text-[var(--accent-primary)]">
                                            SOU
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">Create a Theme for My Project</p>
                                            <p className="text-xs text-[var(--text-secondary)]">$8</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-xs font-semibold text-[var(--accent-secondary)]">
                                            MUS
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">Soundtrack for My Game's "Sky Castle" Stage</p>
                                            <p className="text-xs text-[var(--text-secondary)]">$10</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-semibold text-[var(--accent-primary)]">
                                            MOD
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">Model a New Enemy for my Minecraft Mod</p>
                                            <p className="text-xs text-[var(--text-secondary)]">$30</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 rounded-xl border bordborder-[var(--border-color)] bg-[var(--bg-muted)]/60 px-3 py-3">
                                        <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-secondary)]/5 text-xs font-semibold text-[var(--accent-secondary)]">
                                            +
                                        </span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold">Your Next Task</p>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                {useCompleterLanguage
                                                    ? "Post a problem, set a bounty, & accept a completion."
                                                    : "Post a problem, set a bounty, & accept a solution."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-y border-[var(--border-color)] bg-[var(--bg-secondary)] py-16 px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Why Choose Bountask?</h2>
                            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
                                {useCompleterLanguage
                                    ? "Post a task, let completers submit work, and pay only when you accept a result."
                                    : "Post a task, let solvers submit solutions, and pay only when you accept a result."}
                            </p>
                        </div>

                        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    <FontAwesomeIcon icon={faCoins} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">Pay Only for Results</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Set a reward for the task and release payment only when you accept a submission. No hourly contracts or surprise invoices.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]">
                                    <FontAwesomeIcon icon={faUsers} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">
                                    {useCompleterLanguage ? "Anyone can Complete Tasks" : "Anyone can Solve Tasks"}
                                </h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Tasks aren&apos;t limited to professionals. Anyone with the right idea or skill can jump in and earn the reward.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    <FontAwesomeIcon icon={faPuzzlePiece} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">Perfect for Small Tasks</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Not every problem needs a long contract. {siteName} is built for quick tasks you want solved fast.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]">
                                    <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">Fast and Simple</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    {useCompleterLanguage
                                        ? "Posting a task takes minutes and completers can start immediately without a long application process."
                                        : "Posting a task takes minutes and solvers can start immediately without a long application process."}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    <FontAwesomeIcon icon={faClock} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">Earn on Your Own Time</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Browse tasks whenever you want, pick the tasks that interest you, and earn rewards on your own schedule.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
                                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-[var(--accent-secondary)]">
                                    <FontAwesomeIcon icon={faShieldHalved} className="h-4 w-4" />
                                </div>
                                <h3 className="text-base font-semibold">Safe Payments</h3>
                                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                                    Rewards are held securely until a task is accepted, so both sides know the money is there.                                
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] py-16 px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-2xl font-bold sm:text-3xl">How It Works</h2>
                            <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
                                {useCompleterLanguage
                                    ? "A simple three-step flow for both task creators and completers, from problem to submission to payout."
                                    : "A simple three-step flow for both task creators and solvers, from problem to solution to payout."}
                            </p>
                        </div>

                        <div className="mt-10 grid gap-8 md:grid-cols-2">
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    For task creators
                                </p>
                                <h3 className="mt-2 text-base font-semibold">Post a Problem, Reward a Solution</h3>
                                <div className="mt-5 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-semibold text-[var(--accent-primary)]">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Post Your Task</p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                Describe what you need done and set a payout amount.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-semibold text-[var(--accent-primary)]">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {useCompleterLanguage ? "Review Completions" : "Review Solutions"}
                                            </p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                {useCompleterLanguage
                                                    ? "Completers finish your task and submit their work."
                                                    : "Solvers finish your task and submit their work."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-semibold text-[var(--accent-primary)]">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Accept & Pay</p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                {useCompleterLanguage
                                                    ? "Approve the best completion and the reward is released to the completer. You can also request revisions or reject submissions if they don't meet your needs."
                                                    : "Approve the best solution and the reward is released to the solver. You can also request revisions or reject submissions if they don't meet your needs."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    {useCompleterLanguage ? "For completers" : "For solvers"}
                                </p>
                                <h3 className="mt-2 text-base font-semibold">
                                    {useCompleterLanguage
                                        ? "Browse Tasks, Complete Work, Earn Rewards"
                                        : "Browse Tasks, Solve Problems, Earn Rewards"}
                                </h3>
                                <div className="mt-5 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-xs font-semibold text-[var(--accent-secondary)]">
                                            1
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Browse Tasks</p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                Find tasks that match your skills and interests
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-xs font-semibold text-[var(--accent-secondary)]">
                                            2
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {useCompleterLanguage ? "Complete Tasks" : "Solve Tasks"}
                                            </p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                {useCompleterLanguage
                                                    ? "Start the task, complete the work, and submit it for review."
                                                    : "Start the task, solve the problem, and submit your solution for review."}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="inline-flex h-8 w-8 aspect-square items-center justify-center rounded-full bg-[var(--accent-secondary)]/10 text-xs font-semibold text-[var(--accent-secondary)]">
                                            3
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">Get Paid</p>
                                            <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                                {useCompleterLanguage
                                                    ? "If the creator accepts your completion, the payout is released to your balance and you can withdraw your earnings."
                                                    : "If the creator accepts your solution, the payout is released to your balance and you can withdraw your earnings."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[var(--bg-primary)] py-16 px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center">
                        <h2 className="text-2xl font-bold sm:text-3xl">Ready to Join {siteName}?</h2>
                        <p className="mt-2 text-sm text-[var(--text-secondary)] sm:text-base">
                            {useCompleterLanguage
                                ? "Create an account to start posting tasks and completing tasks for rewards."
                                : "Create an account to start posting tasks and solving tasks for rewards."}
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-center">
                            <Link
                                href="/"
                                className="inline-flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-8 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-muted)]"
                            >
                                Browse Tasks
                            </Link>
                            <Link
                                href="/signup"
                                className="inline-flex items-center justify-center rounded-lg bg-[var(--accent-primary)] px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[var(--accent-hover)] hover:shadow-lg"
                            >
                                Create Your Account
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-[var(--bg-secondary)] border-t border-[var(--border-color)] py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                    <div>
                    <h3 className="font-bold text-[var(--text-primary)] mb-3">{process.env.NEXT_PUBLIC_SITE_NAME}</h3>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {process.env.NEXT_PUBLIC_SITE_SLOGAN}
                    </p>
                    </div>
                    <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Product</h4>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                        <li><Link href="/" className="hover:text-[var(--accent-primary)]">Browse Tasks</Link></li>
                        <li><Link href="/create" className="hover:text-[var(--accent-primary)]">Post a Task</Link></li>
                        <li><Link href="/premium" className="hover:text-[var(--accent-primary)]">Upgrade</Link></li>
                    </ul>
                    </div>
                    {false && (<div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-4">Company</h4>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                        <li><Link href="/about" className="hover:text-[var(--accent-primary)]">About Us</Link></li>
                        <li><Link href="/contact" className="hover:text-[var(--accent-primary)]">Contact</Link></li>
                        <li><Link href="/careers" className="hover:text-[var(--accent-primary)]">Careers</Link></li>
                    </ul>
                    </div>)}
                    <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-3">Legal</h4>
                    <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                        <li><Link href="/terms" className="hover:text-[var(--accent-primary)]">Terms of Service</Link></li>
                        <li><Link href="/privacy" className="hover:text-[var(--accent-primary)]">Privacy Policy</Link></li>
                    </ul>
                    </div>
                </div>
                <div className="border-t border-[var(--border-color)] pt-8 text-center text-sm text-[var(--text-secondary)]">
                    <p>&copy; {new Date().getFullYear()} {process.env.NEXT_PUBLIC_SITE_NAME}. All rights reserved.</p>
                </div>
                </div>
            </footer>
        </div>
    );
}