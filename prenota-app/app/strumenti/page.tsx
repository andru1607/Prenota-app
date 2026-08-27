"use client";

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
} from "lucide-react";

const SECTIONS = [
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

export default function StrumentiPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-ink">Strumenti</h1>

      {SECTIONS.map((section) => (
        <div key={section.title} className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">{section.title}</p>
          <div className="space-y-2">
            {section.tools.map((tool) => {
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
      ))}
    </div>
  );
}
