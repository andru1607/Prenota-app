export type SubscriptionTier = "trial" | "base" | "premium" | "expired";
export type EffectiveTier = "base" | "premium" | "expired";

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  trialEndsAt: string | null;
  daysLeftInTrial: number | null;
  effectiveTier: EffectiveTier;
}

// Funzioni disponibili solo dal piano Premium in su. Tutto il resto dell'app
// (Sala, Prenotazioni, Tavoli, QR, Foto agenda, Vetrina, Profilo, e per il bar
// Cocktail/Dosatore/Magazzino/Leggi fattura) è incluso già dalla prova/Base.
export const PREMIUM_FEATURES = new Set([
  "comande",
  "clienti",
  "statistiche",
  "haccp",
  "turni",
  "fornitori",
  "cestino",
]);

export function computeSubscriptionInfo(
  tier: SubscriptionTier,
  trialEndsAt: string | null
): SubscriptionInfo {
  let daysLeftInTrial: number | null = null;
  let isTrialExpired = false;

  if (tier === "trial" && trialEndsAt) {
    const msLeft = new Date(trialEndsAt).getTime() - Date.now();
    daysLeftInTrial = Math.max(0, Math.ceil(msLeft / 86_400_000));
    isTrialExpired = msLeft <= 0;
  }

  let effectiveTier: EffectiveTier;
  if (tier === "expired" || isTrialExpired) {
    effectiveTier = "expired";
  } else if (tier === "premium") {
    effectiveTier = "premium";
  } else {
    // "trial" (ancora attiva) e "base" danno lo stesso accesso di base
    effectiveTier = "base";
  }

  return { tier, trialEndsAt, daysLeftInTrial, effectiveTier };
}

export function hasAccessToFeature(effectiveTier: EffectiveTier, feature: string): boolean {
  if (effectiveTier === "expired") return false;
  if (effectiveTier === "premium") return true;
  return !PREMIUM_FEATURES.has(feature);
}
