"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Martini, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

type Cocktail = {
  id: string;
  name: string;
  category: string | null;
  glass: string | null;
  technique: string | null;
  garnish: string | null;
  instructions: string | null;
  restaurant_id: string | null;
};

type Ingredient = {
  id: string;
  name: string;
  amount_ml: number;
  position: number;
};

type Prodotto = {
  id: string;
  name: string;
  category: string | null;
  capacita_standard_ml: number;
  bottiglie_chiuse: number;
  ml_rimanenti_bottiglia_aperta: number | null;
  soglia_minima: number;
};

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export default function CocktailDetailPage() {
  const params = useParams<{ id: string }>();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dosatorePiccolo, setDosatorePiccolo] = useState<number | null>(null);
  const [dosatoreGrande, setDosatoreGrande] = useState<number | null>(null);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [showPrepPanel, setShowPrepPanel] = useState(false);
  const [newProductFor, setNewProductFor] = useState<string | null>(null);
  const [newProductName, setNewProductName] = useState("");
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [prepResult, setPrepResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setIsLoading(false);
        return;
      }
      setRestaurantId(staffRow.restaurantId);

      const supabase = createClient();

      const { data: cocktailData } = await supabase
        .from("cocktails")
        .select("id, name, category, glass, technique, garnish, instructions, restaurant_id")
        .eq("id", params.id)
        .single();

      const { data: ingredientData } = await supabase
        .from("cocktail_ingredients")
        .select("id, name, amount_ml, position")
        .eq("cocktail_id", params.id)
        .order("position", { ascending: true });

      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("dosatore_lato_piccolo_ml, dosatore_lato_grande_ml")
        .eq("id", staffRow.restaurantId)
        .single();

      const { data: prodottiData } = await supabase
        .from("magazzino_prodotti")
        .select(
          "id, name, category, capacita_standard_ml, bottiglie_chiuse, ml_rimanenti_bottiglia_aperta, soglia_minima"
        )
        .eq("restaurant_id", staffRow.restaurantId)
        .order("name", { ascending: true });

      const ingredientIds = (ingredientData ?? []).map((i) => i.id);
      const existingMappings: Record<string, string> = {};
      if (ingredientIds.length > 0) {
        const { data: mappingData } = await supabase
          .from("cocktail_ingredient_mapping")
          .select("cocktail_ingredient_id, magazzino_prodotto_id")
          .eq("restaurant_id", staffRow.restaurantId)
          .in("cocktail_ingredient_id", ingredientIds);

        (mappingData ?? []).forEach((m) => {
          existingMappings[m.cocktail_ingredient_id] = m.magazzino_prodotto_id;
        });
      }

      setCocktail(cocktailData ?? null);
      setIngredients(ingredientData ?? []);
      setDosatorePiccolo(restaurantData?.dosatore_lato_piccolo_ml ?? null);
      setDosatoreGrande(restaurantData?.dosatore_lato_grande_ml ?? null);
      setProdotti(prodottiData ?? []);
      setMappings(existingMappings);
      setIsLoading(false);
    }
    load();
  }, [params.id]);

  function formatDose(amountMl: number) {
    const ratios: string[] = [];
    if (dosatorePiccolo) {
      ratios.push(`${(amountMl / dosatorePiccolo).toFixed(1)} picc.`);
    }
    if (dosatoreGrande) {
      ratios.push(`${(amountMl / dosatoreGrande).toFixed(1)} gr.`);
    }
    return ratios.length > 0 ? `${amountMl} ml (≈ ${ratios.join(" / ")})` : `${amountMl} ml`;
  }

  async function handleAddNewProduct(ingredientId: string) {
    if (!restaurantId || !newProductName.trim()) return;
    setIsSavingProduct(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("magazzino_prodotti")
        .insert({
          restaurant_id: restaurantId,
          name: newProductName.trim(),
          capacita_standard_ml: 700,
          bottiglie_chiuse: 1,
          soglia_minima: 1,
        })
        .select()
        .single();

      if (error || !data) throw error;

      setProdotti((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setMappings((prev) => ({ ...prev, [ingredientId]: data.id }));
      setNewProductFor(null);
      setNewProductName("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function handleConfirmPreparation() {
    if (!restaurantId || !cocktail) return;
    const missing = ingredients.some((ing) => !mappings[ing.id]);
    if (missing) return;

    setIsConfirming(true);
    setPrepResult(null);

    try {
      const supabase = createClient();

      const rows = ingredients.map((ing) => ({
        restaurant_id: restaurantId,
        cocktail_ingredient_id: ing.id,
        magazzino_prodotto_id: mappings[ing.id],
      }));
      await supabase
        .from("cocktail_ingredient_mapping")
        .upsert(rows, { onConflict: "restaurant_id,cocktail_ingredient_id" });

      const needed: Record<string, number> = {};
      ingredients.forEach((ing) => {
        const prodId = mappings[ing.id];
        needed[prodId] = (needed[prodId] ?? 0) + ing.amount_ml;
      });

      const outOfStock: string[] = [];

      for (const prodId of Object.keys(needed)) {
        const { data: prodotto } = await supabase
          .from("magazzino_prodotti")
          .select("id, name, capacita_standard_ml, bottiglie_chiuse, ml_rimanenti_bottiglia_aperta")
          .eq("id", prodId)
          .single();

        if (!prodotto) continue;

        let restante = needed[prodId];
        let aperta = prodotto.ml_rimanenti_bottiglia_aperta ?? 0;
        let chiuse = prodotto.bottiglie_chiuse;

        while (restante > 0) {
          if (aperta >= restante) {
            aperta -= restante;
            restante = 0;
          } else if (chiuse > 0) {
            restante -= aperta;
            chiuse -= 1;
            aperta = prodotto.capacita_standard_ml;
          } else {
            aperta = 0;
            restante = 0;
            outOfStock.push(prodotto.name);
          }
        }

        await supabase
          .from("magazzino_prodotti")
          .update({ ml_rimanenti_bottiglia_aperta: aperta, bottiglie_chiuse: chiuse })
          .eq("id", prodId);
      }

      await supabase.from("registro_preparazioni").insert({
        restaurant_id: restaurantId,
        cocktail_id: cocktail.id,
      });

      setPrepResult(
        outOfStock.length > 0
          ? `Registrato. Attenzione, scorta esaurita per: ${outOfStock.join(", ")}.`
          : "Preparazione registrata, magazzino aggiornato."
      );
      setShowPrepPanel(false);
    } catch (err) {
      console.error(err);
      setPrepResult("Non sono riuscito a registrare la preparazione. Riprova.");
    } finally {
      setIsConfirming(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1310] text-[#C17F45]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!cocktail) {
    return (
      <div className="min-h-screen bg-[#1A1310] p-4">
        <p className="text-sm text-[#A69686]">Cocktail non trovato.</p>
      </div>
    );
  }

  const allMapped = ingredients.every((ing) => mappings[ing.id]);

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <Link href="/cocktail" className="mb-3 flex items-center gap-1 text-xs font-medium text-[#A69686]">
        <ArrowLeft size={14} />
        Tutti i cocktail
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center">
          <div className="absolute inset-0 rounded-full bg-[#E3A857] opacity-20 blur-md" />
          <div className="relative grid h-12 w-12 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
            <Martini size={22} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">{cocktail.name}</h1>
          <p className="text-xs text-[#A69686]">
            {[cocktail.category, cocktail.glass].filter(Boolean).join(" · ")}
          </p>
        </div>
        {cocktail.restaurant_id && (
          <span className="shrink-0 rounded-full border border-[#E3A857]/30 bg-[#E3A857]/15 px-2 py-0.5 text-[10px] font-medium text-[#E3A857]">
            Tuo
          </span>
        )}
      </div>

      {ingredients.length > 0 && (
        <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A69686]">Ingredienti</p>
          <div className="space-y-1.5">
            {ingredients.map((ing) => (
              <div key={ing.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[#F0E9E0]">{ing.name}</span>
                <span className="num-tabular text-right text-[#A69686]">{formatDose(ing.amount_ml)}</span>
              </div>
            ))}
          </div>
          {!dosatorePiccolo && !dosatoreGrande && (
            <p className="mt-2 text-xs text-[#A69686]">
              Imposta il tuo dosatore in Impostazioni per vedere le dosi anche in numero di dosatori.
            </p>
          )}
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A69686]">Preparazione</p>
        {cocktail.technique && <p className="mb-1 text-sm text-[#F0E9E0]">{cocktail.technique}</p>}
        {cocktail.instructions && <p className="text-sm text-[#A69686]">{cocktail.instructions}</p>}
        {cocktail.garnish && cocktail.garnish !== "nessuna" && (
          <p className="mt-2 text-sm text-[#A69686]">Guarnizione: {cocktail.garnish}</p>
        )}
      </div>

      {prepResult && (
        <p className="mb-3 rounded-lg border border-[#C17F45]/30 bg-[#251C17] p-3 text-sm text-[#F0E9E0]">
          {prepResult}
        </p>
      )}

      {!showPrepPanel && (
        <button
          onClick={() => setShowPrepPanel(true)}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)]"
        >
          Segna come preparato
        </button>
      )}

      {showPrepPanel && (
        <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
          <p className="mb-3 text-sm font-medium text-[#F0E9E0]">
            Abbina ogni ingrediente al prodotto giusto del tuo magazzino
          </p>
          <div className="space-y-3">
            {ingredients.map((ing) => (
              <div key={ing.id}>
                <p className="mb-1 text-xs text-[#A69686]">{ing.name}</p>
                {newProductFor === ing.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Nome del prodotto"
                      autoFocus
                      className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddNewProduct(ing.id)}
                      disabled={isSavingProduct || !newProductName.trim()}
                      className="touch-target shrink-0 rounded-lg bg-gradient-to-b from-[#C17F45] to-[#A6683A] px-3 py-2 text-[#1A1310] disabled:opacity-40"
                    >
                      {isSavingProduct ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    </button>
                  </div>
                ) : (
                  <select
                    value={mappings[ing.id] ?? ""}
                    onChange={(e) => {
                      if (e.target.value === "__new__") {
                        setNewProductFor(ing.id);
                        setNewProductName("");
                      } else {
                        setMappings((prev) => ({ ...prev, [ing.id]: e.target.value }));
                      }
                    }}
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0]"
                  >
                    <option value="" disabled>
                      Scegli un prodotto...
                    </option>
                    {prodotti.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value="__new__">+ Nuovo prodotto</option>
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowPrepPanel(false)}
              className="touch-target flex-1 rounded-xl border border-[#3A2C22] py-2.5 text-sm font-medium text-[#A69686]"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmPreparation}
              disabled={!allMapped || isConfirming}
              className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-40"
            >
              {isConfirming && <Loader2 size={16} className="animate-spin" />}
              Conferma preparazione
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
