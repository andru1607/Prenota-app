"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  UtensilsCrossed,
  Truck,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  ChefHat,
  BookOpen,
  Users,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

const RISTORANTE_SECTIONS = [
  {
    title: "Sala e ordini",
    tools: [
      {
        href: "/clienti",
        icon: Users,
        title: "Clienti",
        description: "Rubrica clienti e livelli fedeltà",
      },
      {
        href: "/cucina",
        icon: ChefHat,
        title: "Monitor cucina e bar",
        description: "Cosa preparare, con interruttore tra le due viste",
      },
      {
        href: "/tavoli",
        icon: UtensilsCrossed,
        title: "Tavoli",
        description: "Stato e capienza dei tavoli",
      },
      {
        href: "/cestino",
        icon: Trash2,
        title: "Cestino",
        description: "Prenotazioni cancellate, recuperabili per 30 giorni",
      },
    ],
  },
  {
    title: "Gestione locale",
    tools: [
      {
        href: "/vetrina",
        icon: BookOpen,
        title: "Menu e prodotti",
        description: "Aggiungi piatti, prezzi e categorie",
      },
      {
        href: "/fornitori",
        icon: Truck,
        title: "Fornitori e ordini",
        description: "Rubrica fornitori e lista prodotti da ordinare",
      },
      {
        href: "/turni",
        icon: CalendarClock,
        title: "Turni",
        description: "Chi lavora e a che ora",
      },
      {
        href: "/haccp",
        icon: ClipboardCheck,
        title: "Registro HACCP",
        description: "Temperature e checklist pulizie",
      },
    ],
  },
];

const BAR_SECTIONS = [
  {
    title: "Gestione locale",
    tools: [
      {
        href: "/fornitori",
        icon: Truck,
        title: "Fornitori e ordini",
        description: "Rubrica fornitori e lista prodotti da ordinare",
      },
      {
        href: "/turni",
        icon: CalendarClock,
        title: "Turni",
        description: "Chi lavora e a che ora",
      },
      {
        href: "/haccp",
        icon: ClipboardCheck,
        title: "Registro HACCP",
        description: "Temperature e checklist pulizie",
      },
    ],
  },
];

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export default function StrumentiPage() {
  const [businessType, setBusinessType] = useState<"ristorante" | "bar">("ristorante");

  useEffect(() => {
    async function load() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) return;

      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("business_type")
        .eq("id", staffRow.restaurantId)
        .single();

      if (data?.business_type === "bar") {
        setBusinessType("bar");
      }
    }
    load();
  }, []);

  const sections = businessType === "bar" ? BAR_SECTIONS : RISTORANTE_SECTIONS;

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <h1 className="mb-1 text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Strumenti</h1>
      <SignatureLine className="mb-4" />

      {sections.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A69686]">{section.title}</p>
          <div className="space-y-2">
            {section.tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="touch-target flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#F0E9E0]">{tool.title}</p>
                      <p className="text-xs text-[#A69686]">{tool.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[#A69686]" />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
