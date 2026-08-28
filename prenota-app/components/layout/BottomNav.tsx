"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarClock, ClipboardList, Wrench, Settings, Martini, Boxes } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

const RISTORANTE_NAV_ITEMS = [
  { href: "/dashboard", label: "Servizio", icon: LayoutGrid },
  { href: "/comande", label: "Comande", icon: ClipboardList },
  { href: "/prenotazioni", label: "Prenot.", icon: CalendarClock },
  { href: "/strumenti", label: "Strumenti", icon: Wrench },
  { href: "/impostazioni", label: "Altro", icon: Settings },
];

const BAR_NAV_ITEMS = [
  { href: "/cocktail", label: "Cocktail", icon: Martini },
  { href: "/magazzino", label: "Magazzino", icon: Boxes },
  { href: "/strumenti", label: "Strumenti", icon: Wrench },
  { href: "/impostazioni", label: "Altro", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [businessType, setBusinessType] = useState<"ristorante" | "bar">("ristorante");

  useEffect(() => {
    async function loadBusinessType() {
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
    loadBusinessType();
  }, []);

  const items = businessType === "bar" ? BAR_NAV_ITEMS : RISTORANTE_NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-black/5 bg-white md:hidden">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`touch-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${
              active ? "text-primary" : "text-ink-muted"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
