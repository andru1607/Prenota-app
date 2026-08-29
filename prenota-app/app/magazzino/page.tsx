"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Boxes, Plus, Minus, Loader2, AlertTriangle, Trash2, Check, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

type Prodotto = {
  id: string;
  name: string;
  category: string | null;
  capacita_standard_ml: number;
  bottiglie_chiuse: number;
  ml_rimanenti_bottiglia_aperta: number | null;
  soglia_minima: number;
};

type FormState = {
  name: string;
  category: string;
  capacita_standard_ml: string;
  bottiglie_chiuse: string;
  ml_rimanenti_bottiglia_aperta: string;
  soglia_minima: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  capacita_standard_ml: "700",
  bottiglie_chiuse: "0",
  ml_rimanenti_bottiglia_aperta: "",
  soglia_minima: "1",
};

function isEsaurito(p: Prodotto) {
  const apertaVuota = p.ml_rimanenti_bottiglia_aperta === null || p.ml_rimanenti_bottiglia_aperta <= 0;
  return p.bottiglie_chiuse <= 0 && apertaVuota;
}

function isScortaBassa(p: Prodotto) {
  return !isEsaurito(p) && p.bottiglie_chiuse <= p.soglia_minima;
}

function stockRank(p: Prodotto) {
  if (isEsaurito(p)) return 0;
  if (isScortaBassa(p)) return 1;
  return 2;
}

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export default function MagazzinoPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [soloScorteBasse, setSoloScorteBasse] = useState(false);

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    const staffRow = await getMyStaffRow();
    if (!staffRow) {
      setIsLoading(false);
      return;
    }
    setRestaurantId(staffRow.restaurantId);

    const supabase = createClient();
    const { data } = await supabase
      .from("magazzino_prodotti")
      .select(
        "id, name, category, capacita_standard_ml, bottiglie_chiuse, ml_rimanenti_bottiglia_aperta, soglia_minima"
      )
      .eq("restaurant_id", staffRow.restaurantId)
      .order("name", { ascending: true });

    setProdotti(data ?? []);
    setIsLoading(false);
  }

  const scorteBasseCount = useMemo(
    () => prodotti.filter((p) => isEsaurito(p) || isScortaBassa(p)).length,
    [prodotti]
  );

  const listaOrdinata = useMemo(() => {
    return [...prodotti]
      .filter((p) => !soloScorteBasse || isEsaurito(p) || isScortaBassa(p))
      .sort((a, b) => stockRank(a) - stockRank(b) || a.name.localeCompare(b.name));
  }, [prodotti, soloScorteBasse]);

  function startNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditingId("new");
  }

  function startEdit(p: Prodotto) {
    setForm({
      name: p.name,
      category: p.category ?? "",
      capacita_standard_ml: String(p.capacita_standard_ml),
      bottiglie_chiuse: String(p.bottiglie_chiuse),
      ml_rimanenti_bottiglia_aperta:
        p.ml_rimanenti_bottiglia_aperta === null ? "" : String(p.ml_rimanenti_bottiglia_aperta),
      soglia_minima: String(p.soglia_minima),
    });
    setError(null);
    setEditingId(p.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    if (!restaurantId) return;
    if (!form.name.trim()) {
      setError("Il nome è obbligatorio.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      capacita_standard_ml: Number(form.capacita_standard_ml) || 700,
      bottiglie_chiuse: Number(form.bottiglie_chiuse) || 0,
      ml_rimanenti_bottiglia_aperta:
        form.ml_rimanenti_bottiglia_aperta === "" ? null : Number(form.ml_rimanenti_bottiglia_aperta),
      soglia_minima: Number(form.soglia_minima) || 0,
    };

    try {
      const supabase = createClient();

      if (editingId === "new") {
        const { error: insertError } = await supabase.from("magazzino_prodotti").insert(payload);
        if (insertError) throw insertError;
      } else if (editingId) {
        const { error: updateError } = await supabase
          .from("magazzino_prodotti")
          .update(payload)
          .eq("id", editingId);
        if (updateError) throw updateError;
      }

      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setIsSaving(true);
    try {
      const supabase = createClient();
      await supabase.from("magazzino_prodotti").delete().eq("id", id);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a eliminare. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  async function adjustBottiglieChiuse(id: string, delta: number) {
    const target = prodotti.find((p) => p.id === id);
    if (!target) return;
    const nextValue = Math.max(0, target.bottiglie_chiuse + delta);
    if (nextValue === target.bottiglie_chiuse) return;

    setProdotti((prev) => prev.map((p) => (p.id === id ? { ...p, bottiglie_chiuse: nextValue } : p)));

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("magazzino_prodotti")
      .update({ bottiglie_chiuse: nextValue })
      .eq("id", id);

    if (updateError) {
      console.error(updateError);
      setProdotti((prev) =>
        prev.map((p) => (p.id === id ? { ...p, bottiglie_chiuse: target.bottiglie_chiuse } : p))
      );
    }
  }

  function renderForm() {
    return (
      <div className="mb-3 rounded-2xl border border-[#C17F45]/40 bg-gradient-to-b from-[#2A211C] to-[#1F1712] p-4">
        <div className="space-y-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome prodotto (es. Gin Bombay Sapphire)"
            autoFocus
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Categoria (es. Gin)"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[#A69686]">
              Capacità bottiglia (ml)
              <input
                type="number"
                value={form.capacita_standard_ml}
                onChange={(e) => setForm((f) => ({ ...f, capacita_standard_ml: e.target.value }))}
                className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
              />
            </label>
            <label className="text-xs text-[#A69686]">
              Soglia minima (bottiglie)
              <input
                type="number"
                value={form.soglia_minima}
                onChange={(e) => setForm((f) => ({ ...f, soglia_minima: e.target.value }))}
                className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
              />
            </label>
            <label className="text-xs text-[#A69686]">
              Bottiglie chiuse in stock
              <input
                type="number"
                value={form.bottiglie_chiuse}
                onChange={(e) => setForm((f) => ({ ...f, bottiglie_chiuse: e.target.value }))}
                className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
              />
            </label>
            <label className="text-xs text-[#A69686]">
              Bottiglia aperta (ml rimasti)
              <input
                type="number"
                value={form.ml_rimanenti_bottiglia_aperta}
                onChange={(e) => setForm((f) => ({ ...f, ml_rimanenti_bottiglia_aperta: e.target.value }))}
                placeholder="vuoto = nessuna aperta"
                className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
            </label>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-[#D97A63]">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={cancelEdit}
            className="touch-target flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#3A2C22] bg-[#1A1310] py-2 text-sm font-medium text-[#A69686]"
          >
            <X size={14} />
            Annulla
          </button>
          {editingId !== "new" && editingId && (
            <button
              onClick={() => handleDelete(editingId)}
              disabled={isSaving}
              className="touch-target flex items-center justify-center gap-1 rounded-xl border border-[#C0503D]/50 px-3 py-2 text-sm font-medium text-[#D97A63]"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="touch-target flex flex-1 items-center justify-center gap-1 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Magazzino</h1>
          <SignatureLine className="mt-1.5" />
        </div>
        {editingId === null && (
          <div className="flex items-center gap-2">
            <Link
              href="/magazzino/fattura"
              className="touch-target flex items-center gap-1.5 rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-xs font-medium text-[#A69686]"
            >
              <FileText size={14} className="text-[#C17F45]" />
              Leggi fattura
            </Link>
            <button
              onClick={startNew}
              className="touch-target grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.35)]"
              aria-label="Aggiungi prodotto"
            >
              <Plus size={18} />
            </button>
          </div>
        )}
      </div>

      {scorteBasseCount > 0 && (
        <button
          onClick={() => setSoloScorteBasse((v) => !v)}
          className={`mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium ${
            soloScorteBasse
              ? "bg-[#C0503D] text-[#F5E9E4]"
              : "border border-[#C0503D]/40 bg-[#2A1B14] text-[#E8977C]"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">
            {scorteBasseCount} prodott{scorteBasseCount === 1 ? "o" : "i"} sotto scorta
          </span>
          <span className="shrink-0 text-xs font-normal underline">
            {soloScorteBasse ? "mostra tutti" : "mostra solo questi"}
          </span>
        </button>
      )}

      {editingId === "new" && renderForm()}

      {isLoading ? (
        <div className="flex justify-center py-10 text-[#C17F45]">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : listaOrdinata.length === 0 && editingId !== "new" ? (
        <p className="py-10 text-center text-sm text-[#A69686]">
          {soloScorteBasse
            ? "Nessun prodotto sotto scorta al momento."
            : "Non ci sono ancora prodotti in magazzino. Tocca \"+\" per aggiungerne uno."}
        </p>
      ) : (
        <div className="space-y-2">
          {listaOrdinata.map((p) => {
            const esaurito = isEsaurito(p);
            const scortaBassa = isScortaBassa(p);
            const isEditingThis = editingId === p.id;
            const pct =
              p.ml_rimanenti_bottiglia_aperta !== null
                ? Math.max(
                    0,
                    Math.min(100, Math.round((p.ml_rimanenti_bottiglia_aperta / p.capacita_standard_ml) * 100))
                  )
                : null;

            if (isEditingThis) {
              return <div key={p.id}>{renderForm()}</div>;
            }

            return (
              <div
                key={p.id}
                className={`rounded-xl border bg-[#251C17] p-3 ${
                  esaurito ? "border-[#C0503D]/50" : scortaBassa ? "border-[#E3A857]/50" : "border-[#3A2C22]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(p)}
                    className="touch-target flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                      <Boxes size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-[#F0E9E0]">{p.name}</p>
                        {esaurito && (
                          <span className="shrink-0 rounded-full border border-[#C0503D]/40 bg-[#C0503D]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#D97A63]">
                            Esaurito
                          </span>
                        )}
                        {!esaurito && scortaBassa && (
                          <span className="shrink-0 rounded-full border border-[#E3A857]/40 bg-[#E3A857]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#E3A857]">
                            Scorta bassa
                          </span>
                        )}
                      </div>
                      <p className="num-tabular truncate text-xs text-[#A69686]">
                        {p.ml_rimanenti_bottiglia_aperta !== null
                          ? `aperta ${p.ml_rimanenti_bottiglia_aperta}/${p.capacita_standard_ml} ml`
                          : "nessuna bottiglia aperta"}
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#1A1310]">
                          <div
                            className={`h-full rounded-full ${
                              pct <= 20 ? "bg-[#C0503D]" : "bg-gradient-to-r from-[#C17F45] to-[#E3A857]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBottiglieChiuse(p.id, -1);
                      }}
                      disabled={p.bottiglie_chiuse <= 0}
                      className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-[#3A2C22] text-[#A69686] disabled:opacity-30"
                      aria-label="Togli una bottiglia chiusa"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="num-tabular w-6 text-center text-sm font-medium text-[#F0E9E0]">
                      {p.bottiglie_chiuse}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBottiglieChiuse(p.id, 1);
                      }}
                      className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-[#3A2C22] text-[#A69686]"
                      aria-label="Aggiungi una bottiglia chiusa"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
