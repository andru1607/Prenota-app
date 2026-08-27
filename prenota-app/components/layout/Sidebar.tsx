"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarClock, ClipboardList, Wrench, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Servizio", icon: LayoutGrid },
  { href: "/comande", label: "Comande", icon: ClipboardList },
  { href: "/prenotazioni", label: "Prenotazioni", icon: CalendarClock },
  { href: "/strumenti", label: "Strumenti", icon: Wrench },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-black/5 bg-white p-3 md:block">
      <p className="mb-4 px-2 text-lg font-bold text-ink">Prenota</p>
      <nav className="space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-primary-light text-primary" : "text-ink-muted hover:bg-bg-subtle"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
