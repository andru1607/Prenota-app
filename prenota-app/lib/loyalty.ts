export interface LoyaltyTier {
  key: "new" | "bronze" | "silver" | "gold";
  label: string;
  minVisits: number;
  color: string;
  bg: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { key: "new", label: "Nuovo", minVisits: 0, color: "#57534E", bg: "#F5F5F4" },
  { key: "bronze", label: "Bronzo", minVisits: 3, color: "#92400E", bg: "#FEF3C7" },
  { key: "silver", label: "Argento", minVisits: 7, color: "#475569", bg: "#E2E8F0" },
  { key: "gold", label: "Oro", minVisits: 15, color: "#A16207", bg: "#FEF9C3" },
];

export function getLoyaltyTier(reservationCount: number): LoyaltyTier {
  let current = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (reservationCount >= tier.minVisits) current = tier;
  }
  return current;
}

export function getNextTier(reservationCount: number): { tier: LoyaltyTier; visitsToGo: number } | null {
  const next = LOYALTY_TIERS.find((t) => t.minVisits > reservationCount);
  if (!next) return null;
  return { tier: next, visitsToGo: next.minVisits - reservationCount };
}
