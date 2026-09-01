"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Martini,
  Plus,
  Search,
  Loader2,
  ArrowLeft,
  Wine,
  FlaskConical,
  CupSoda,
  Droplets,
  Coffee,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { TrialBanner } from "@/components/ui/TrialBanner";

type Cocktail = {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  image_url: string | null;
  restaurant_id: string | null;
  featured_rank: number | null;
};

const CATEGORY_ICONS: Record<string, typeof Martini> = {
  "Aperitivi": Wine,
  "Amari": FlaskConical,
  "Long Drink": CupSoda,
  "Cocktail Classici": Martini,
  "Analcolici": Droplets,
  "Caffetteria": Coffee,
};

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`}
    />
  );
}

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
        .select("id, name, category, glass, image_url, restaurant_id, featured_rank")
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

  const featuredCocktails = useMemo(
    () =>
      cocktails
        .filter((c) => c.featured_rank !== null)
        .sort((a, b) => (a.featured_rank ?? 0) - (b.featured_rank ?? 0)),
    [cocktails]
  );

  const categories = useMemo(() => {
    const names = Array.from(new Set(cocktails.map((c) => c.category || "Altro")));
    return names.sort();
  }, [cocktails]);

  const searching = search.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    const term = search.trim().toLowerCase();
    return cocktails.filter((c) => c.name.toLowerCase().includes(term));
  }, [cocktails, search, searching]);

  const categoryResults = useMemo(() => {
    if (!selectedCategory) return [];
    return cocktails.filter((c) => (c.category || "Altro") === selectedCategory);
  }, [selectedCategory, cocktails]);

  function renderCocktailRow(cocktail: Cocktail) {
    return (
      <Link
        key={cocktail.id}
        href={`/cocktail/${cocktail.id}`}
        className="touch-target flex items-center gap-3 rounded-xl border border-[#3A2C22] bg-[#251C17] p-3"
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#C17F45]/40 bg-[#1A1310] text-[#E3A857]">
          {cocktail.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cocktail.image_url}
              alt={cocktail.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Martini size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[#F0E9E0]">{cocktail.name}</p>
          <p className="truncate text-xs text-[#A69686]">
            {[cocktail.category, cocktail.glass].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        {cocktail.restaurant_id && (
          <span className="shrink-0 rounded-full border border-[#E3A857]/30 bg-[#E3A857]/15 px-2 py-0.5 text-[10px] font-medium text-[#E3A857]">
            Tuo
          </span>
        )}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1310]">
      <OnboardingGuide />
      <TrialBanner />
      <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Cocktail</h1>
          <SignatureLine className="mt-1.5" />
        </div>
        <Link
          href="/cocktail/nuovo"
          className="touch-target grid h-10 w-10 place-items-center rounded-full bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.35)]"
          aria-label="Aggiungi cocktail"
        >
          <Plus size={19} />
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#3A2C22] bg-[#251C17] px-3 py-2.5 focus-within:border-[#C17F45]/60">
        <Search size={16} className="text-[#A69686]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca un cocktail"
          className="w-full bg-transparent text-base text-[#F0E9E0] outline-none placeholder:text-[#7A6E63]"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10 text-[#C17F45]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : searching ? (
        searchResults.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#A69686]">Nessun cocktail trovato.</p>
        ) : (
          <div className="space-y-2">{searchResults.map(renderCocktailRow)}</div>
        )
      ) : selectedCategory ? (
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="mb-3 flex items-center gap-1 text-xs font-medium text-[#A69686]"
          >
            <ArrowLeft size={14} />
            Tutte le categorie
          </button>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F0E9E0]">
            {selectedCategory}
          </p>
          <SignatureLine className="mb-3" />
          {categoryResults.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#A69686]">
              Non ci sono ancora cocktail qui.
            </p>
          ) : (
            <div className="mb-3 space-y-2">{categoryResults.map(renderCocktailRow)}</div>
          )}
          <Link
            href={`/cocktail/nuovo?categoria=${encodeURIComponent(selectedCategory)}`}
            className="touch-target flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#3A2C22] py-2.5 text-xs font-medium text-[#A69686]"
          >
            <Plus size={14} />
            Aggiungi un prodotto in {selectedCategory}
          </Link>
        </div>
      ) : cocktails.length === 0 ? (
        <p className="py-10 text-center text-sm text-[#A69686]">Non ci sono ancora cocktail.</p>
      ) : (
        <>
          {featuredCocktails.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#E3A857]">
                <Star size={13} className="fill-[#E3A857]" />
                I più richiesti
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {featuredCocktails.map((c) => (
                  <Link
                    key={c.id}
                    href={`/cocktail/${c.id}`}
                    className="flex h-20 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-2 text-center"
                  >
                    <Martini size={16} className="text-[#E3A857]" />
                    <span className="text-xs font-medium leading-tight text-[#F0E9E0]">{c.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category] ?? Martini;
              const count = cocktails.filter((c) => (c.category || "Altro") === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className="touch-target flex flex-col items-start gap-2.5 rounded-2xl border border-[#3A2C22] bg-gradient-to-b from-[#2A211C] to-[#1F1712] p-4 text-left"
                >
                  <div className="relative grid h-11 w-11 place-items-center">
                    <div className="absolute inset-0 rounded-full bg-[#C17F45] opacity-20 blur-md" />
                    <div className="relative grid h-11 w-11 place-items-center rounded-full border border-[#C17F45]/50 bg-[#1A1310] text-[#C17F45]">
                      <Icon size={18} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-[#F0E9E0]">{category}</p>
                    <p className="num-tabular text-xs text-[#A69686]">{count} cocktail</p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
