import type { Metadata } from "next";
import PremiumClient from "@/components/PremiumClient";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Upgrade to Premium",
  description:
    "Explore Creator Pro and Earner Pro premium plans on Bountask to unlock a range of exciting features and benefits.",
};

export default async function PricingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let creatorProActive = false;
  let earnerProActive = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("creator_pro_active, earner_pro_active")
      .eq("id", user.id)
      .maybeSingle();

    creatorProActive = (profile as any)?.creator_pro_active === true;
    earnerProActive = (profile as any)?.earner_pro_active === true;
  }

  return (
    <PremiumClient
      creatorProActive={creatorProActive}
      earnerProActive={earnerProActive}
    />
  );
}

