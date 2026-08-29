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
  { href: "/prenotazioni", label: "Prenotazioni", icon: CalendarClock },
  { href: "/strumenti", label: "Strumenti", icon: Wrench },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

const BAR_NAV_ITEMS = [
  { href: "/cocktail", label: "Cocktail", icon: Martini },
  { href: "/magazzino", label: "Magazzino", icon: Boxes },
  { href: "/strumenti", label: "Strumenti", icon: Wrench },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
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
    <aside className="hidden w-56 shrink-0 border-r border-[#3A2C22] bg-[#251C17] p-3 md:block">
      <div className="mb-4 px-2">
        <p className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Prenota</p>
        <div className="mt-1.5 h-px w-10 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent" />
      </div>
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#C17F45]/15 text-[#C17F45]"
                  : "text-[#A69686] hover:bg-[#1A1310] hover:text-[#F0E9E0]"
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
