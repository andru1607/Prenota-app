"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Martini, Plus, Search, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

type Cocktail = {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  image_url: string | null;
  restaurant_id: string | null;
};

export default function CocktailListPage() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("cocktails")
        .select("id, name, category, glass, image_url, restaurant_id")
        .or(`restaurant_id.is.null,restaurant_id.eq.${staffRow.restaurantId}`)
        .order("name", { ascending: true });

      if (error) {
        console.error("Errore caricamento cocktail:", error);
      } else if (data) {
        setCocktails(data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const filtered = cocktails.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Cocktail</h1>
        <Link
          href="/cocktail/nuovo"
          className="touch-target grid h-9 w-9 place-items-center rounded-lg bg-primary text-white"
          aria-label="Aggiungi cocktail"
        >
          <Plus size={18} />
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5">
        <Search size={16} className="text-ink-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca un cocktail"
          className="w-full text-sm outline-none"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10 text-ink-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          {search ? "Nessun cocktail trovato." : "Non ci sono ancora cocktail."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((cocktail) => (
            <Link
              key={cocktail.id}
              href={`/cocktail/${cocktail.id}`}
              className="touch-target flex items-center gap-3 rounded-xl border border-black/5 bg-white p-3"
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-light text-primary">
                {cocktail.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cocktail.image_url}
                    alt={cocktail.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Martini size={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{cocktail.name}</p>
                <p className="truncate text-xs text-ink-muted">
                  {[cocktail.category, cocktail.glass].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              {cocktail.restaurant_id && (
                <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                  Tuo
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
