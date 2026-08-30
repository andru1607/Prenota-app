"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  X,
  Palette,
  QrCode,
  UtensilsCrossed,
  CalendarX,
  Sparkles,
  Martini,
  Boxes,
  BookOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

const RISTORANTE_STEPS = [
  {
    href: "/impostazioni",
    icon: Palette,
    title: "Personalizza la pagina prenotazioni",
    description: "Aggiungi logo, nome e colore del tuo locale",
  },
  {
    href: "/impostazioni",
    icon: QrCode,
    title: "Genera il tuo QR code",
    description: "Stampalo e mettilo bene in vista per i clienti",
  },
  {
    href: "/tavoli",
    icon: UtensilsCrossed,
    title: "Aggiungi i tuoi tavoli",
    description: "Così potrai tenerne traccia durante il servizio",
  },
  {
    href: "/orari",
    icon: CalendarX,
    title: "Imposta i giorni di chiusura",
    description: "I clienti non potranno prenotare in quei giorni",
  },
];

const BAR_STEPS = [
  {
    href: "/impostazioni",
    icon: Palette,
    title: "Personalizza il tuo locale",
    description: "Aggiungi logo, nome e colore del tuo bar",
  },
  {
    href: "/impostazioni/dosatore",
    icon: Martini,
    title: "Imposta il tuo dosatore",
    description: "Le dosi delle ricette si convertiranno in automatico",
  },
  {
    href: "/magazzino",
    icon: Boxes,
    title: "Aggiungi i prodotti al magazzino",
    description: "Bottiglie, scorte e avvisi sempre sotto controllo",
  },
  {
    href: "/cocktail",
    icon: BookOpen,
    title: "Esplora l'enciclopedia cocktail",
    description: "116 ricette pronte, o aggiungi le tue",
  },
];

export function OnboardingGuide() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [businessType, setBusinessType] = useState<"ristorante" | "bar">("ristorante");

  useEffect(() => {
    async function check() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) return;

      setRestaurantId(staffRow.restaurantId);

      const supabase = createClient();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("onboarding_completed, business_type")
        .eq("id", staffRow.restaurantId)
        .single();

      if (restaurant?.business_type === "bar") {
        setBusinessType("bar");
      }

      if (restaurant && restaurant.onboarding_completed === false) {
        setVisible(true);
      }
    }
    check();
  }, []);

  async function handleDismiss() {
    setVisible(false);
    if (!restaurantId) return;
    const supabase = createClient();
    await supabase
      .from("restaurants")
      .update({ onboarding_completed: true })
      .eq("id", restaurantId);
  }

  if (!visible) return null;

  const steps = businessType === "bar" ? BAR_STEPS : RISTORANTE_STEPS;

  return (
    <div className="mx-4 mt-4 rounded-2xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#E3A857]" />
          <p className="text-sm font-semibold text-[#F0E9E0]">Benvenuto! Completa la configurazione</p>
        </div>
        <button
          onClick={handleDismiss}
          className="touch-target grid shrink-0 place-items-center rounded-lg text-[#A69686]"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              onClick={handleDismiss}
              className="touch-target flex items-center gap-3 rounded-lg border border-[#3A2C22] bg-[#251C17] p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F0E9E0]">{step.title}</p>
                <p className="text-xs text-[#A69686]">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleDismiss}
        className="mt-3 w-full text-center text-xs font-medium text-[#A69686]"
      >
        Salta per ora
      </button>
    </div>
  );
}
