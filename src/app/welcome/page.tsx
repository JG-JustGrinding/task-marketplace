import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Welcome to Bountask, the modern marketplace that connects task creators with skilled workers to get things done and earn money.",
};

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          {/* Logo */}
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

          {/* Navigation */}
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link 
              href="/"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm sm:text-base font-medium"
            >
              Browse Tasks
            </Link>
            <Link 
              href="/login"
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-sm sm:text-base font-medium"
            >
              Log in
            </Link>
            <Link 
              href="/signup"
              className="px-4 sm:px-6 py-2 bg-[var(--accent-primary)] text-white rounded-full font-semibold text-sm sm:text-base hover:bg-[var(--accent-hover)] transition-all shadow-md"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Get Things Done.<br />
              <span className="text-white/90">Earn While You Work.</span>
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
              The marketplace that connects task creators with skilled workers. 
              Post your tasks or start earning today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/signup"
                className="px-8 py-4 bg-white text-[var(--accent-primary)] rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Get Started Free
              </Link>
              <Link 
                href="/"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold text-lg hover:bg-white/20 transition-all border-2 border-white/30"
              >
                Browse Tasks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
            Why Choose {process.env.NEXT_PUBLIC_SITE_NAME}?
          </h2>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            A modern platform built for efficiency, trust, and growth.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[var(--bg-secondary)] p-8 rounded-xl shadow-[var(--shadow-soft)] hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
              Fast & Simple
            </h3>
            <p className="text-[var(--text-secondary)]">
              Post a task in minutes or start working immediately. No complicated processes, just results.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] p-8 rounded-xl shadow-[var(--shadow-soft)] hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
              Secure Payments
            </h3>
            <p className="text-[var(--text-secondary)]">
              Payments held securely until work is complete. Powered by Stripe for your peace of mind.
            </p>
          </div>

          <div className="bg-[var(--bg-secondary)] p-8 rounded-xl shadow-[var(--shadow-soft)] hover:shadow-xl transition-shadow">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] rounded-lg flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">
              Quality Community
            </h3>
            <p className="text-[var(--text-secondary)]">
              Join thousands of verified users. Build your reputation and grow your opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[var(--bg-muted)]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-lg text-[var(--text-secondary)]">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            {/* For Task Creators */}
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center md:text-left">
                For Task Creators
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Post Your Task</h4>
                    <p className="text-[var(--text-secondary)]">Describe what you need done and set your budget</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Review Submissions</h4>
                    <p className="text-[var(--text-secondary)]">Workers complete your task and submit their work</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-primary)] text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Approve & Pay</h4>
                    <p className="text-[var(--text-secondary)]">Accept the best submission and payment is released</p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Workers */}
            <div>
              <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-8 text-center md:text-left">
                For Workers
              </h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-secondary)] text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Browse Tasks</h4>
                    <p className="text-[var(--text-secondary)]">Find tasks that match your skills and interests</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-secondary)] text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Complete Work</h4>
                    <p className="text-[var(--text-secondary)]">Activate and submit your high-quality work</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-secondary)] text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)] mb-1">Get Paid</h4>
                    <p className="text-[var(--text-secondary)]">Receive payment once your submission is approved</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {false && 
      (<section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--accent-primary)] mb-2">10K+</div>
              <div className="text-[var(--text-secondary)]">Tasks Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--accent-primary)] mb-2">5K+</div>
              <div className="text-[var(--text-secondary)]">Active Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--accent-primary)] mb-2">$500K+</div>
              <div className="text-[var(--text-secondary)]">Paid Out</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[var(--accent-primary)] mb-2">4.9★</div>
              <div className="text-[var(--text-secondary)]">Average Rating</div>
            </div>
          </div>
        </div>
      </section>)}

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-white/90 mb-10">
            Join {process.env.NEXT_PUBLIC_SITE_NAME} today and experience a better way to work.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/signup"
              className="px-8 py-4 bg-white text-[var(--accent-primary)] rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Create Free Account
            </Link>
            <Link 
              href="/pricing"
              className="px-8 py-4 bg-transparent text-white rounded-lg font-semibold text-lg hover:bg-white/10 transition-all border-2 border-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
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
