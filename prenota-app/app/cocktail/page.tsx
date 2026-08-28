"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Martini, Plus, Search, Loader2, ArrowLeft, Award, Sparkles, Zap, Droplets, User } from "lucide-react";
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

const CATEGORY_ICONS: Record<string, typeof Martini> = {
  "Intramontabili": Award,
  "Contemporary Classics": Sparkles,
  "New Era Drinks": Zap,
  "Analcolici": Droplets,
};

const CUSTOM_LABEL = "I tuoi cocktail";

export default function CocktailListPage() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const customCocktails = useMemo(
    () => cocktails.filter((c) => c.restaurant_id !== null),
    [cocktails]
  );
  const standardCocktails = useMemo(
    () => cocktails.filter((c) => c.restaurant_id === null),
    [cocktails]
  );

  const standardCategories = useMemo(() => {
    const names = Array.from(new Set(standardCocktails.map((c) => c.category || "Altro")));
    return names.sort();
  }, [standardCocktails]);

  const searching = search.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    const term = search.trim().toLowerCase();
    return cocktails.filter((c) => c.name.toLowerCase().includes(term));
  }, [cocktails, search, searching]);

  const categoryResults = useMemo(() => {
    if (!selectedCategory) return [];
    if (selectedCategory === CUSTOM_LABEL) return customCocktails;
    return standardCocktails.filter((c) => (c.category || "Altro") === selectedCategory);
  }, [selectedCategory, standardCocktails, customCocktails]);

  function renderCocktailRow(cocktail: Cocktail) {
    return (
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
    );
  }

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
      ) : searching ? (
        searchResults.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">Nessun cocktail trovato.</p>
        ) : (
          <div className="space-y-2">{searchResults.map(renderCocktailRow)}</div>
        )
      ) : selectedCategory ? (
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted"
          >
            <ArrowLeft size={14} />
            Tutte le categorie
          </button>
          <p className="mb-3 text-xs font-semibold uppercase text-ink-muted">{selectedCategory}</p>
          {categoryResults.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-muted">
              Non hai ancora cocktail qui. Tocca &quot;+&quot; per aggiungerne uno.
            </p>
          ) : (
            <div className="space-y-2">{categoryResults.map(renderCocktailRow)}</div>
          )}
        </div>
      ) : cocktails.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">Non ci sono ancora cocktail.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedCategory(CUSTOM_LABEL)}
            className="touch-target flex flex-col items-start gap-2 rounded-xl border border-black/5 bg-white p-4 text-left"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
              <User size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{CUSTOM_LABEL}</p>
              <p className="text-xs text-ink-muted">{customCocktails.length} cocktail</p>
            </div>
          </button>

          {standardCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category] ?? Martini;
            const count = standardCocktails.filter((c) => (c.category || "Altro") === category).length;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="touch-target flex flex-col items-start gap-2 rounded-xl border border-black/5 bg-white p-4 text-left"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{category}</p>
                  <p className="text-xs text-ink-muted">{count} cocktail</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
