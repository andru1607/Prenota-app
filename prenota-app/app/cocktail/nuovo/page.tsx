"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Martini, Loader2, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

type IngredientRow = {
  id: string;
  name: string;
  amount_ml: string;
};

function newIngredientRow(): IngredientRow {
  return { id: crypto.randomUUID(), name: "", amount_ml: "" };
}

export default function NuovoCocktailPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [glass, setGlass] = useState("");
  const [technique, setTechnique] = useState("");
  const [garnish, setGarnish] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([newIngredientRow()]);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(id: string, field: "name" | "amount_ml", value: string) {
    setIngredients((prev) => prev.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, newIngredientRow()]);
  }

  function removeIngredient(id: string) {
    setIngredients((prev) => (prev.length > 1 ? prev.filter((ing) => ing.id !== id) : prev));
  }

  async function handleSave() {
    setError(null);

    if (!name.trim()) {
      setError("Il nome del cocktail è obbligatorio.");
      return;
    }

    const validIngredients = ingredients
      .map((ing) => ({ name: ing.name.trim(), amount_ml: Number(ing.amount_ml) }))
      .filter((ing) => ing.name && ing.amount_ml > 0);

    if (validIngredients.length === 0) {
      setError("Aggiungi almeno un ingrediente con nome e dose in ml.");
      return;
    }

    setIsSaving(true);

    try {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setError("Sessione non valida, ricarica la pagina.");
        return;
      }

      const supabase = createClient();

      const { data: cocktail, error: cocktailError } = await supabase
        .from("cocktails")
        .insert({
          restaurant_id: staffRow.restaurantId,
          name: name.trim(),
          category: category.trim() || null,
          glass: glass.trim() || null,
          technique: technique.trim() || null,
          garnish: garnish.trim() || null,
          instructions: instructions.trim() || null,
        })
        .select()
        .single();

      if (cocktailError || !cocktail) throw cocktailError;

      const ingredientRows = validIngredients.map((ing, index) => ({
        cocktail_id: cocktail.id,
        name: ing.name,
        amount_ml: ing.amount_ml,
        position: index,
      }));

      const { error: ingredientsError } = await supabase
        .from("cocktail_ingredients")
        .insert(ingredientRows);

      if (ingredientsError) {
        await supabase.from("cocktails").delete().eq("id", cocktail.id);
        throw ingredientsError;
      }

      router.push(`/cocktail/${cocktail.id}`);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare il cocktail. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

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
        <div>
          <h1 className="text-lg font-semibold text-ink">Nuovo cocktail</h1>
          <p className="text-xs text-ink-muted">Visibile e modificabile solo dal tuo bar</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del cocktail"
            autoFocus
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (es. Long drink)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={glass}
              onChange={(e) => setGlass(e.target.value)}
              placeholder="Bicchiere (es. Tumbler basso)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="Tecnica (es. Shakerato, Mescolato, Build)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={garnish}
            onChange={(e) => setGarnish(e.target.value)}
            placeholder="Guarnizione (es. scorza di limone)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Procedimento"
            rows={3}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase text-ink-muted">Ingredienti</p>
        <div className="space-y-2">
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                placeholder="Ingrediente (es. Gin)"
                className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <input
                type="number"
                inputMode="decimal"
                value={ing.amount_ml}
                onChange={(e) => updateIngredient(ing.id, "amount_ml", e.target.value)}
                placeholder="ml"
                className="w-20 shrink-0 rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <button
                onClick={() => removeIngredient(ing.id)}
                disabled={ingredients.length <= 1}
                className="touch-target grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted disabled:opacity-30"
                aria-label="Rimuovi ingrediente"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addIngredient}
          className="touch-target mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/20 py-2 text-xs font-medium text-ink-muted"
        >
          <Plus size={14} />
          Aggiungi ingrediente
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-status-danger">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {isSaving ? "Salvo..." : "Salva cocktail"}
      </button>
    </div>
  );
}
