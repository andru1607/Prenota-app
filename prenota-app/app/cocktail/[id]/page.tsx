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

export default function CocktailDetailPage() {
  const params = useParams<{ id: string }>();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [dosatorePiccolo, setDosatorePiccolo] = useState<number | null>(null);
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
      setProdotti(prodottiData ?? []);
      setMappings(existingMappings);
      setIsLoading(false);
    }
    load();
  }, [params.id]);

  function formatDose(amountMl: number) {
    const parts = [`${amountMl} ml`];
    if (dosatorePiccolo) {
      const ratio = amountMl / dosatorePiccolo;
      parts.push(`≈ ${ratio.toFixed(1)} dosatore piccolo`);
    }
    return parts.join(" · ");
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
      <div className="flex justify-center py-16 text-ink-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (!cocktail) {
    return (
      <div className="p-4">
        <p className="text-sm text-ink-muted">Cocktail non trovato.</p>
      </div>
    );
  }

  const allMapped = ingredients.every((ing) => mappings[ing.id]);

  return (
    <div className="p-4">
      <Link href="/cocktail" className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted">
        <ArrowLeft size={14} />
        Tutti i cocktail
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
          <Martini size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-ink">{cocktail.name}</h1>
          <p className="text-xs text-ink-muted">
            {[cocktail.category, cocktail.glass].filter(Boolean).join(" · ")}
          </p>
        </div>
        {cocktail.restaurant_id && (
          <span className="shrink-0 rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-medium text-ink-muted">
            Tuo
          </span>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">Ingredienti</p>
        <div className="space-y-1.5">
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{ing.name}</span>
              <span className="text-ink-muted">{formatDose(ing.amount_ml)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">Preparazione</p>
        {cocktail.technique && <p className="mb-1 text-sm text-ink">{cocktail.technique}</p>}
        {cocktail.instructions && <p className="text-sm text-ink-muted">{cocktail.instructions}</p>}
        {cocktail.garnish && cocktail.garnish !== "nessuna" && (
          <p className="mt-2 text-sm text-ink-muted">Guarnizione: {cocktail.garnish}</p>
        )}
      </div>

      {prepResult && <p className="mb-3 rounded-lg bg-bg-subtle p-3 text-sm text-ink">{prepResult}</p>}

      {!showPrepPanel && (
        <button
          onClick={() => setShowPrepPanel(true)}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white"
        >
          Segna come preparato
        </button>
      )}

      {showPrepPanel && (
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-ink">
            Abbina ogni ingrediente al prodotto giusto del tuo magazzino
          </p>
          <div className="space-y-3">
            {ingredients.map((ing) => (
              <div key={ing.id}>
                <p className="mb-1 text-xs text-ink-muted">{ing.name}</p>
                {newProductFor === ing.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Nome del prodotto"
                      autoFocus
                      className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => handleAddNewProduct(ing.id)}
                      disabled={isSavingProduct || !newProductName.trim()}
                      className="touch-target shrink-0 rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-40"
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
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
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
              className="touch-target flex-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink-muted"
            >
              Annulla
            </button>
            <button
              onClick={handleConfirmPreparation}
              disabled={!allMapped || isConfirming}
              className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
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
