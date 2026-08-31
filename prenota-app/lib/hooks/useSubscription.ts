"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
import {
  computeSubscriptionInfo,
  type SubscriptionInfo,
  type SubscriptionTier,
} from "@/lib/subscription";

export function useSubscription() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("subscription_tier, trial_ends_at")
        .eq("id", staffRow.restaurantId)
        .single();

      if (data) {
        setInfo(
          computeSubscriptionInfo(
            (data.subscription_tier as SubscriptionTier) ?? "trial",
            data.trial_ends_at
          )
        );
      }
      setIsLoading(false);
    }
    load();
  }, []);

  return { info, isLoading };
}
