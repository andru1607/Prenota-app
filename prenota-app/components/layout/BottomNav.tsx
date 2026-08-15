"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarClock, Users, Settings } from "lucide-react";

// 4 voci essenziali, raggiungibili col pollice. "Tavoli" resta accessibile da Impostazioni su mobile.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Servizio", icon: LayoutGrid },
  { href: "/prenotazioni", label: "Prenot.", icon: CalendarClock },
  { href: "/clienti", label: "Clienti", icon: Users },
  { href: "/impostazioni", label: "Altro", icon: Settings },
];

// Visibile solo su mobile (nascosta da md: in su, dove c'è la Sidebar)
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-black/5 bg-white md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`touch-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
              active ? "text-primary" : "text-ink-muted"
            }`}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
