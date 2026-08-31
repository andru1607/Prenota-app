"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";

export function TrialBanner() {
  const { info, isLoading } = useSubscription();

  if (isLoading || !info) return null;
  if (info.tier === "premium" || info.tier === "base") return null;

  if (info.effectiveTier === "expired") {
    return (
      <div className="mx-4 mt-4 rounded-xl border border-[#C0503D]/40 bg-[#2A1B14] px-4 py-2.5 text-center text-sm font-medium text-[#D97A63]">
        La prova gratuita è scaduta. Scegli Base o Premium per continuare a usare l'app.
      </div>
    );
  }

  const days = info.daysLeftInTrial ?? 0;
  return (
    <div className="mx-4 mt-4 rounded-xl border border-[#E3A857]/30 bg-[#E3A857]/10 px-4 py-2.5 text-center text-sm font-medium text-[#E3A857]">
      {days === 0
        ? "Ultimo giorno di prova gratuita"
        : `${days} giorn${days === 1 ? "o" : "i"} rimast${days === 1 ? "o" : "i"} nella prova gratuita`}
    </div>
  );
}
