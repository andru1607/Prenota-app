"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Palette, QrCode, UtensilsCrossed, CalendarX, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

const STEPS = [
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

export function OnboardingGuide() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function check() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) return;

      setRestaurantId(staffRow.restaurantId);

      const supabase = createClient();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("onboarding_completed")
        .eq("id", staffRow.restaurantId)
        .single();

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

  return (
    <div className="mx-4 mt-4 rounded-xl border border-primary/20 bg-primary-light p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-primary" />
          <p className="text-sm font-semibold text-ink">Benvenuto! Completa la configurazione</p>
        </div>
        <button
          onClick={handleDismiss}
          className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.title}
              href={step.href}
              onClick={handleDismiss}
              className="touch-target flex items-center gap-3 rounded-lg bg-white p-3"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="text-xs text-ink-muted">{step.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <button
        onClick={handleDismiss}
        className="mt-3 w-full text-center text-xs font-medium text-ink-muted"
      >
        Salta per ora
      </button>
    </div>
  );
}
