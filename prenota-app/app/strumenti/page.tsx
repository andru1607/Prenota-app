"use client";

import Link from "next/link";
import {
  UtensilsCrossed,
  Truck,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  ClipboardList,
  ChefHat,
  Wine,
  BookOpen,
} from "lucide-react";

const TOOLS = [
  {
    href: "/vetrina",
    icon: BookOpen,
    title: "Menu e prodotti",
    description: "Aggiungi piatti, prezzi e categorie",
  },
  {
    href: "/comande",
    icon: ClipboardList,
    title: "Comande",
    description: "Apri i tavoli e invia gli ordini",
  },
  {
    href: "/cucina",
    icon: ChefHat,
    title: "Monitor cucina",
    description: "Piatti da preparare, per un tablet in cucina",
  },
  {
    href: "/bar",
    icon: Wine,
    title: "Monitor bar",
    description: "Bevande da preparare, per un tablet al bancone",
  },
  {
    href: "/tavoli",
    icon: UtensilsCrossed,
    title: "Tavoli",
    description: "Stato e capienza dei tavoli",
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
];

export default function StrumentiPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-ink">Strumenti</h1>

      <div className="space-y-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="touch-target flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{tool.title}</p>
                  <p className="text-xs text-ink-muted">{tool.description}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-ink-muted" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
