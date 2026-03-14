import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upgrade to Premium",
  description:
    "Explore Creator Pro and Earner Pro premium plans on Bountask to unlock a range of exciting features and benefits.",
};

const plans = [
  {
    name: "Creator Pro",
    tagline: "For task creators and businesses",
    accent: "var(--accent-primary)",
    accentHover: "var(--accent-hover)",
    features: [
      "Create unlimited tasks",
      "Priority task listing in the feed",
      "Advanced analytics dashboard",
      "Reduced platform fees",
      "Featured creator badge",
      "Priority support",
    ],
    cta: "Get Creator Pro",
  },
  {
    name: "Earner Pro",
    tagline: "For task completers and freelancers",
    accent: "var(--accent-secondary)",
    accentHover: "var(--accent-secondary-hover)",
    features: [
      "Early access to new tasks",
      "No transaction fees on earnings",
      "Instant withdrawal option",
      "Enhanced profile visibility",
      "Verified earner badge",
      "Priority support",
    ],
    cta: "Get Earner Pro",
  },
];

export default function PricingPage() {
  return (
    <div
      style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}
      className="min-h-screen py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-14">

        {/* Header */}
        <div className="text-center flex flex-col gap-3">
          <span
            style={{
              backgroundColor: "var(--bg-muted)",
              color: "var(--accent-primary)",
              border: "1px solid var(--border-color)",
            }}
            className="mx-auto text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full w-fit"
          >
            UPGRADE
          </span>
          <h1 className="text-4xl font-bold tracking-tight">
            Choose Your Plan
          </h1>
          <p style={{ color: "var(--text-secondary)" }} className="text-base max-w-xl mx-auto">
            Unlock premium features and take your experience with {process.env.NEXT_PUBLIC_SITE_NAME} to the next level.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="card flex flex-col gap-6 transition-transform duration-200 hover:-translate-y-1"
              style={{ borderTop: `3px solid ${plan.accent}` }}
            >
              {/* Plan header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <p style={{ color: "var(--text-secondary)" }} className="text-sm mt-0.5">
                    {plan.tagline}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${plan.accent} 12%, transparent)`,
                    color: plan.accent,
                  }}
                >
                  PRO
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-extrabold tracking-tight">$10</span>
                <span style={{ color: "var(--text-muted)" }} className="text-sm">/month</span>
              </div>

              {/* Divider */}
              <hr style={{ borderColor: "var(--border-color)" }} />

              {/* Features */}
              <ul className="flex flex-col gap-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `color-mix(in srgb, ${plan.accent} 15%, transparent)` }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke={plan.accent}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                className="w-full py-2.5 px-5 rounded-lg text-sm font-semibold text-white transition duration-200 hover:brightness-110"
                style={{ backgroundColor: plan.accent }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center flex flex-col gap-1">
          <p style={{ color: "var(--text-secondary)" }} className="text-sm">
            Billing is handled securely through Stripe. You can cancel your subscription at any time from your account settings.
          </p>
        </div>

      </div>
    </div>
  );
}

