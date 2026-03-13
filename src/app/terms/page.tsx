import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bountask";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${siteName}. Please review these terms before using the platform.`,
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border-color)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <div className="relative h-10 w-10">
              <Image
                src="/logos/bountask_logo_icon.svg"
                alt={`${siteName} Logo`}
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
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Bountask Terms of Service</h1>

        <section className="space-y-6 text-sm leading-relaxed text-[var(--text-secondary)]">
          <div>
            <p className="mb-2">
              Welcome to Bountask ("Bountask", "we", "us", or "our").
            </p>
            <p className="mb-2">
              These Terms of Service ("Terms") govern your use of the Bountask
              platform, website, and services (collectively, the "Service").
            </p>
            <p className="mb-2">
              By creating an account or using the Service, you agree to these
              Terms. If you do not agree, you may not use Bountask.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              1. Description of the Service
            </h2>
            <p className="mb-2">
              Bountask is an online platform that connects users who want tasks
              completed ("Task Posters") with users who are willing to complete
              those tasks ("Workers").
            </p>
            <p className="mb-2">Users may:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Post tasks and offer payment for completion</li>
              <li>Accept tasks posted by others</li>
              <li>Submit work for payment</li>
            </ul>
            <p className="mt-2">
              Bountask acts only as a platform facilitating these interactions and
              is not a party to the agreements between users.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              2. Eligibility
            </h2>
            <p className="mb-2">To use Bountask you must:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Be at least 13 years old</li>
              <li>Provide accurate registration information</li>
              <li>Comply with these Terms</li>
            </ul>
            <p className="mt-2">
              If you are under 18, you may only use the Service with parental or
              guardian permission.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              3. User Accounts
            </h2>
            <p className="mb-2">When creating an account you agree to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide accurate information</li>
              <li>Maintain the security of your login credentials</li>
              <li>Be responsible for all activity under your account</li>
            </ul>
            <p className="mt-2 mb-2">
              Users may not create multiple accounts to evade restrictions or bans.
            </p>
            <p>
              Bountask reserves the right to suspend or terminate accounts at its
              discretion.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              4. Posting Tasks
            </h2>
            <p className="mb-2">Task Posters may create tasks that include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>A title and description</li>
              <li>A payment amount</li>
              <li>Requirements for completion</li>
            </ul>
            <p className="mt-2 mb-2">
              Once a Worker accepts a task, that Worker becomes the sole user
              allowed to complete that task.
            </p>
            <p>
              Task Posters agree to provide clear instructions and respond to
              submissions in good faith.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              5. Task Completion and Approval
            </h2>
            <p className="mb-2">
              Workers submit completed tasks through the platform. The Task Poster
              may:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Accept the submission and release payment</li>
              <li>Reject the submission and request revisions</li>
              <li>Open a dispute</li>
            </ul>
            <p className="mt-2">
              Payment is only released after the Task Poster accepts the
              submission or the platform resolves a dispute.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              6. Payments
            </h2>
            <p className="mb-2">
              Payments on Bountask are processed through third-party payment
              providers including Stripe.
            </p>
            <p className="mb-2">
              When a Task Poster creates a task, the payment is collected and
              held until the task is completed or refunded.
            </p>
            <p className="mb-2">Bountask charges a 10% platform fee on transactions.</p>
            <p>
              By using the platform, users agree to the payment processing terms
              of Stripe.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              7. Withdrawals
            </h2>
            <p className="mb-2">
              Workers may withdraw earnings after funds move from pending to
              available, which typically occurs approximately three (3) days
              after payment is released.
            </p>
            <p className="mb-2">
              Withdrawal availability may depend on payment processor
              requirements.
            </p>
            <p>
              Bountask may delay withdrawals if fraud, abuse, or disputes are
              suspected.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              8. Disputes
            </h2>
            <p className="mb-2">If a dispute arises regarding task completion:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Either party may report the dispute to Bountask</li>
              <li>
                Bountask may review the task, submission, and communication between
                users
              </li>
              <li>Bountask will determine the outcome at its discretion</li>
            </ul>
            <p className="mt-2 mb-2">Possible outcomes include:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Payment released to the Worker</li>
              <li>Refund to the Task Poster</li>
              <li>Task cancellation</li>
            </ul>
            <p className="mt-2">Bountask&apos;s dispute decision is final.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              9. Prohibited Tasks and Activities
            </h2>
            <p className="mb-2">Users may not post or participate in tasks involving:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Illegal activities</li>
              <li>Fraud or scams</li>
              <li>Harassment or threats</li>
              <li>Impersonation</li>
              <li>Academic dishonesty (homework cheating)</li>
              <li>Spam or unsolicited advertising</li>
              <li>Adult or explicit content</li>
              <li>Any activity that violates applicable laws</li>
            </ul>
            <p className="mt-2">
              Bountask reserves the right to remove tasks or accounts violating
              these rules.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              10. Ownership of Work
            </h2>
            <p className="mb-2">
              Upon payment for a completed task, the Worker agrees to transfer all
              applicable rights to the Task Poster unless otherwise stated in the
              task description.
            </p>
            <p>
              Workers represent that submitted work is original and does not
              infringe on third-party rights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              11. Platform Role
            </h2>
            <p className="mb-2">
              Bountask provides a platform for users to interact but does not
              guarantee:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Task quality</li>
              <li>Task completion</li>
              <li>User reliability</li>
            </ul>
            <p className="mt-2">
              Bountask is not responsible for agreements between users. Users
              interact at their own risk.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              12. Account Suspension and Termination
            </h2>
            <p className="mb-2">Bountask may suspend or terminate accounts if users:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Violate these Terms</li>
              <li>Engage in fraud or abuse</li>
              <li>Attempt to bypass platform fees</li>
              <li>Create multiple accounts to evade restrictions</li>
            </ul>
            <p className="mt-2">Termination may occur without prior notice.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              13. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Bountask is not liable for
              loss of profits, damages from user interactions, incomplete or
              unsatisfactory work, or platform interruptions. Use of the Service
              is at your own risk.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              14. Indemnification
            </h2>
            <p>
              Users agree to indemnify and hold Bountask harmless from claims
              arising from their tasks, their submissions, or violations of these
              Terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              15. Changes to the Service
            </h2>
            <p>
              Bountask may modify, suspend, or discontinue any part of the
              Service at any time.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              16. Changes to Terms
            </h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              Service after changes means you accept the updated Terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              17. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the United States, without
              regard to its conflict of laws principles.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              18. Contact
            </h2>
            <p className="mb-2">For questions regarding these Terms, contact:</p>
            <p>
              Email:{" "}
              <Link
                href="mailto:justgrindingmarketplace@gmail.com"
                className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
              >
                justgrindingmarketplace@gmail.com
              </Link>
            </p>
            <p className="mt-4 text-[var(--text-muted)]">
              Last Updated: March 12, 2026
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
