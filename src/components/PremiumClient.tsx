"use client";

import { useState } from "react";

type PlanKey = "creator" | "earner";

interface PremiumClientProps {
  creatorProActive?: boolean;
  earnerProActive?: boolean;
}

const plans: Array<{
  key: PlanKey;
  name: string;
  price: number;
  tagline: string;
  accent: string;
  accentHover: string;
  features: string[];
  cta: string;
}> = [
  {
    key: "creator",
    name: "Creator Pro",
    price: 10,
    tagline: "For task creators and businesses",
    accent: "var(--accent-primary)",
    accentHover: "var(--accent-hover)",
    features: [
      "Add custom task banners",
      "Add time limits to tasks",
      "Ability to create task collections",
      "Task review time extended from 3 days to 7 days",
      "Verified creator badge",
    ],
    cta: "Get Creator Pro",
  },
  {
    key: "earner",
    name: "Earner Pro",
    price: 15,
    tagline: "For task completers and freelancers",
    accent: "var(--accent-secondary)",
    accentHover: "var(--accent-secondary-hover)",
    features: [
      "Increase in max active task limit from 3 to 10",
      "Decrease in earning fee from 10% to 3%",
      "Increased submission file upload limit",
      "Priority support for dispute resolution",
      "Verified earner badge",
    ],
    cta: "Get Earner Pro",
  },
];

export default function PremiumClient({
  creatorProActive = false,
  earnerProActive = false,
}: PremiumClientProps) {
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartSubscription = async (plan: PlanKey) => {
    // If this plan is already active, do nothing.
    if ((plan === "creator" && creatorProActive) || (plan === "earner" && earnerProActive)) {
      return;
    }

    setLoadingPlan(plan);
    setError(null);

    try {
      const res = await fetch("/api/account/create-subscription-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const message = (data as any)?.error ||
          (res.status === 401
            ? "Please sign in to upgrade your account."
            : "There was a problem starting checkout. Please try again.");
        //setError(message);
        //setLoadingPlan(null);
        window.location.href = "/login?redirect=/premium";
        return;
      }

      const url = (data as any)?.url as string | undefined;

      if (!url) {
        setError("No checkout URL was returned. Please try again.");
        setLoadingPlan(null);
        return;
      }

      window.location.href = url;
    } catch (err) {
      setError("Unexpected error starting checkout. Please try again.");
      setLoadingPlan(null);
    }
  };

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
          <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
          <p
            style={{ color: "var(--text-secondary)" }}
            className="text-base max-w-xl mx-auto"
          >
            Unlock premium features and take your experience with {process.env.NEXT_PUBLIC_SITE_NAME} to the next level.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const isActive = plan.key === "creator" ? creatorProActive : earnerProActive;
            return (
            <div
              key={plan.key}
              className="card flex flex-col gap-6 transition-transform duration-200 hover:-translate-y-1"
              style={{ borderTop: `3px solid ${plan.accent}` }}
            >
              {/* Plan header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{plan.name}</h2>
                  <p
                    style={{ color: "var(--text-secondary)" }}
                    className="text-sm mt-0.5"
                  >
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
                <span className="text-5xl font-extrabold tracking-tight">
                  ${plan.price}
                </span>
                <span
                  style={{ color: "var(--text-muted)" }}
                  className="text-sm"
                >
                  /month
                </span>
              </div>

              {/* Divider */}
              <hr style={{ borderColor: "var(--border-color)" }} />

              {/* Features */}
              <ul className="flex flex-col gap-3 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${plan.accent} 15%, transparent)`,
                      }}
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
                    <span
                      style={{ color: "var(--text-secondary)", fontWeight: "bold" }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => handleStartSubscription(plan.key)}
                disabled={loadingPlan === plan.key || isActive}
                className="w-full py-2.5 px-5 rounded-lg text-sm font-semibold text-white transition duration-200 hover:brightness-110 disabled:opacity-70"
                style={{ backgroundColor: plan.accent }}
              >
                {isActive
                  ? "Already active"
                  : loadingPlan === plan.key
                    ? "Redirecting..."
                    : plan.cta}
              </button>
            </div>
          );})}
        </div>

        {/* Footer note */}
        <div className="text-center flex flex-col gap-1">
          <p
            style={{ color: "var(--text-secondary)" }}
            className="text-sm"
          >
            Billing is handled securely through Stripe. You can cancel your subscription at any time from your account settings.
          </p>
          {error && (
            <p className="text-sm text-[var(--danger)] mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
