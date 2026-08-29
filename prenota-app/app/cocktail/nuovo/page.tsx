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
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Nuovo cocktail</h1>
          <p className="text-xs text-[#A69686]">Visibile e modificabile solo dal tuo bar</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del cocktail"
            autoFocus
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria (es. Long drink)"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={glass}
              onChange={(e) => setGlass(e.target.value)}
              placeholder="Bicchiere (es. Tumbler basso)"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
          </div>
          <input
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="Tecnica (es. Shakerato, Mescolato, Build)"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <input
            value={garnish}
            onChange={(e) => setGarnish(e.target.value)}
            placeholder="Guarnizione (es. scorza di limone)"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Procedimento"
            rows={3}
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#A69686]">Ingredienti</p>
        <div className="space-y-2">
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-center gap-2">
              <input
                value={ing.name}
                onChange={(e) => updateIngredient(ing.id, "name", e.target.value)}
                placeholder="Ingrediente (es. Gin)"
                className="min-w-0 flex-1 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                value={ing.amount_ml}
                onChange={(e) => updateIngredient(ing.id, "amount_ml", e.target.value)}
                placeholder="ml"
                className="num-tabular w-20 shrink-0 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
              <button
                onClick={() => removeIngredient(ing.id)}
                disabled={ingredients.length <= 1}
                className="touch-target grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#A69686] disabled:opacity-30"
                aria-label="Rimuovi ingrediente"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addIngredient}
          className="touch-target mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#3A2C22] py-2 text-xs font-medium text-[#A69686]"
        >
          <Plus size={14} />
          Aggiungi ingrediente
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-[#D97A63]">{error}</p>}

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)] disabled:opacity-50"
      >
        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {isSaving ? "Salvo..." : "Salva cocktail"}
      </button>
    </div>
  );
}
