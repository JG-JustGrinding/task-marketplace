import type { Metadata } from "next";
import PremiumClient from "@/components/PremiumClient";

export const metadata: Metadata = {
  title: "Upgrade to Premium",
  description:
    "Explore Creator Pro and Earner Pro premium plans on Bountask to unlock a range of exciting features and benefits.",
};

export default function PricingPage() {
  return <PremiumClient />;
}

