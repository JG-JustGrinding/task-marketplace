import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bountask";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${siteName}. Learn how we collect, use, and protect your information.`,
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">Bountask Privacy Policy</h1>

        <section className="space-y-6 text-sm leading-relaxed text-[var(--text-secondary)]">
          <div>
            <p className="mb-2">
              This Privacy Policy describes how Bountask ("Bountask", "we",
              "us", or "our") collects, uses, and protects your information
              when you use the Bountask website and services (the "Service").
            </p>
            <p>
              By creating an account or using the Service, you agree to this
              Privacy Policy.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              1. Information We Collect
            </h2>
            <p className="mb-2">
              We collect several types of information in order to operate and
              improve the Service.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mb-1 mt-4">
              Account Information
            </h3>
            <p className="mb-2">When you create an account, we may collect:</p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Email address</li>
              <li>Username or display name</li>
              <li>Password (stored securely using encryption)</li>
            </ul>
            <p className="mb-4">
              This information is used to create and manage your account.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Task and Submission Data
            </h3>
            <p className="mb-2">When using the platform, users may provide:</p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Task descriptions</li>
              <li>Task submissions</li>
              <li>Uploaded files or images</li>
              <li>Other information included in tasks</li>
            </ul>
            <p className="mb-4">
              This information is necessary for the platform to function.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Payment Information
            </h3>
            <p className="mb-2">
              Payments are processed through third-party payment providers
              including Stripe. When using payment features:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Stripe may collect payment details such as credit card information.</li>
              <li>Bountask does not store full payment card numbers on its servers.</li>
              <li>
                Workers who withdraw earnings may be required to connect a Stripe
                account.
              </li>
            </ul>
            <p className="mb-4">
              Stripe&apos;s handling of payment data is governed by Stripe&apos;s
              own privacy policies.
            </p>

            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Usage Data
            </h3>
            <p className="mb-2">
              We may automatically collect certain information when you use the
              Service, including:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>IP address</li>
              <li>Browser type</li>
              <li>Device information</li>
              <li>Pages visited</li>
              <li>Time spent on pages</li>
            </ul>
            <p>
              This information helps us maintain and improve the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              2. Cookies and Session Data
            </h2>
            <p>
              Bountask uses cookies and similar technologies to maintain login
              sessions, authenticate users, and ensure proper platform
              functionality. These cookies are necessary for the Service to
              operate.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              3. How We Use Your Information
            </h2>
            <p className="mb-2">We use collected information to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Provide and maintain the Service</li>
              <li>Allow users to post and complete tasks</li>
              <li>Process payments and withdrawals</li>
              <li>Communicate with users regarding their accounts</li>
              <li>Prevent fraud or abuse</li>
              <li>Improve platform performance and reliability</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              4. Third-Party Services
            </h2>
            <p className="mb-2">
              Bountask relies on third-party services to operate the platform.
              These services may process user data in accordance with their own
              policies. Examples include:
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Stripe for payment processing</li>
              <li>Supabase for database and backend infrastructure</li>
            </ul>
            <p>
              We only share data with third-party services when necessary to
              operate the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              5. Data Storage and Security
            </h2>
            <p>
              We implement reasonable technical and organizational measures to
              protect user data. However, no system can guarantee absolute
              security. Users are responsible for keeping their account
              credentials secure.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              6. Sharing of Information
            </h2>
            <p className="mb-2">Bountask does not sell user data.</p>
            <p className="mb-2">We may share information only in limited circumstances:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>With service providers required to operate the platform</li>
              <li>To comply with legal obligations</li>
              <li>To prevent fraud, abuse, or illegal activity</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              7. User Rights and Account Deletion
            </h2>
            <p className="mb-2">
              Users may request deletion of their account and associated personal
              data.
            </p>
            <p className="mb-2">To request account deletion, contact:</p>
            <p>
              Email:{" "}
              <Link
                href="mailto:justgrindingmarketplace@gmail.com"
                className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
              >
                justgrindingmarketplace@gmail.com
              </Link>
            </p>
            <p className="mt-2">
              We will process deletion requests within a reasonable timeframe
              unless retention is required for legal or security reasons.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              8. Children&apos;s Privacy
            </h2>
            <p>
              Bountask is intended for users 13 years of age or older. We do not
              knowingly collect personal information from children under 13. If
              we become aware that such information has been collected, we will
              delete it.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              9. International Users
            </h2>
            <p>
              Bountask may be accessed worldwide. By using the Service, you
              understand that your information may be stored and processed in the
              United States.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              10. Changes to This Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. When changes
              occur, the updated version will be posted on this page with a
              revised "Last Updated" date. Continued use of the Service
              indicates acceptance of the updated policy.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
              11. Contact
            </h2>
            <p className="mb-2">If you have questions about this Privacy Policy, contact:</p>
            <p>
              Email:{" "}
              <Link
                href="mailto:justgrindingmarketplace@gmail.com"
                className="text-[var(--accent-primary)] hover:text-[var(--accent-hover)]"
              >
                justgrindingmarketplace@gmail.com
              </Link>
            </p>
            <p className="mt-4 text-[var(--text-muted)]">Last Updated: March 12, 2026</p>
          </div>
        </section>
      </main>
    </div>
  );
}
