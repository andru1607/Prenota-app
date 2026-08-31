"use client";

import { Lock, Check, Mail } from "lucide-react";

const FEATURE_LABELS: Record<string, string> = {
  comande: "Comande",
  clienti: "Clienti e fedeltà",
  statistiche: "Statistiche",
  haccp: "Registro HACCP",
  turni: "Turni",
  fornitori: "Fornitori e ordini",
  cestino: "Cestino",
};

const BASE_INCLUDES = [
  "Sala e Prenotazioni",
  "Tavoli e QR per i clienti",
  "Foto agenda e Leggi fattura",
  "Cocktail, Dosatore e Magazzino (bar)",
];

const PREMIUM_EXTRA = ["Comande", "Clienti e fedeltà", "Statistiche", "HACCP", "Turni", "Fornitori", "Cestino"];

export function LockedFeature({ feature }: { feature: string }) {
  const label = FEATURE_LABELS[feature] ?? "Questa funzione";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1A1310] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-6 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-[#E3A857]/40 bg-[#E3A857]/10 text-[#E3A857]">
            <Lock size={24} />
          </div>
          <h1 className="mb-1 text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">
            {label} è Premium
          </h1>
          <p className="text-sm text-[#A69686]">
            Passa a Premium per sbloccarla, insieme al resto degli strumenti di gestione.
          </p>
        </div>

        <div className="mb-3 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
          <p className="text-sm font-semibold text-[#F0E9E0]">Base — 150€/mese</p>
          <div className="mt-2 space-y-1.5">
            {BASE_INCLUDES.map((item) => (
              <p key={item} className="flex items-center gap-2 text-xs text-[#A69686]">
                <Check size={13} className="shrink-0 text-[#A69686]" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-4">
          <p className="text-sm font-semibold text-[#F0E9E0]">Premium — 200€/mese</p>
          <p className="mb-2 text-xs text-[#A69686]">Tutto quello di Base, più:</p>
          <div className="space-y-1.5">
            {PREMIUM_EXTRA.map((item) => (
              <p key={item} className="flex items-center gap-2 text-xs text-[#F0E9E0]">
                <Check size={13} className="shrink-0 text-[#E3A857]" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <a
          href="mailto:alexandrut04@gmail.com?subject=Sblocca%20Premium%20Prenota"
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-3 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)]"
        >
          <Mail size={16} />
          Scrivici per sbloccare
        </a>
      </div>
    </div>
  );
}
