export interface LoyaltyTier {
  key: "new" | "bronze" | "silver" | "gold";
  label: string;
  minVisits: number;
  color: string;
  bg: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  { key: "new", label: "Nuovo", minVisits: 0, color: "#A69686", bg: "#3A2C22" },
  { key: "bronze", label: "Bronzo", minVisits: 3, color: "#C17F45", bg: "rgba(193,127,69,0.18)" },
  { key: "silver", label: "Argento", minVisits: 7, color: "#C7CDD1", bg: "rgba(199,205,209,0.16)" },
  { key: "gold", label: "Oro", minVisits: 15, color: "#E3A857", bg: "rgba(227,168,87,0.20)" },
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
