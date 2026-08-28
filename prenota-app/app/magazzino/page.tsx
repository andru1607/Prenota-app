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

    // Aggiorno subito l'interfaccia, poi salvo — così il tap sembra istantaneo
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
      <div className="mb-3 rounded-xl border border-primary bg-primary-light p-4">
        <div className="space-y-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nome prodotto (es. Gin Bombay Sapphire)"
            autoFocus
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            placeholder="Categoria (es. Gin)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-ink-muted">
              Capacità bottiglia (ml)
              <input
                type="number"
                value={form.capacita_standard_ml}
                onChange={(e) => setForm((f) => ({ ...f, capacita_standard_ml: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Soglia minima (bottiglie)
              <input
                type="number"
                value={form.soglia_minima}
                onChange={(e) => setForm((f) => ({ ...f, soglia_minima: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Bottiglie chiuse in stock
              <input
                type="number"
                value={form.bottiglie_chiuse}
                onChange={(e) => setForm((f) => ({ ...f, bottiglie_chiuse: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Bottiglia aperta (ml rimasti)
              <input
                type="number"
                value={form.ml_rimanenti_bottiglia_aperta}
                onChange={(e) => setForm((f) => ({ ...f, ml_rimanenti_bottiglia_aperta: e.target.value }))}
                placeholder="vuoto = nessuna aperta"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={cancelEdit}
            className="touch-target flex flex-1 items-center justify-center gap-1 rounded-xl border border-black/10 bg-white py-2 text-sm font-medium text-ink-muted"
          >
            <X size={14} />
            Annulla
          </button>
          {editingId !== "new" && editingId && (
            <button
              onClick={() => handleDelete(editingId)}
              disabled={isSaving}
              className="touch-target flex items-center justify-center gap-1 rounded-xl border border-status-danger px-3 py-2 text-sm font-medium text-status-danger"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="touch-target flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Magazzino</h1>
        {editingId === null && (
          <div className="flex items-center gap-2">
            <Link
              href="/magazzino/fattura"
              className="touch-target flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink-muted"
            >
              <FileText size={14} />
              Leggi fattura
            </Link>
            <button
              onClick={startNew}
              className="touch-target grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white"
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
              ? "bg-status-danger text-white"
              : "bg-status-dangerBg text-status-danger"
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
        <div className="flex justify-center py-10 text-ink-muted">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : listaOrdinata.length === 0 && editingId !== "new" ? (
        <p className="py-10 text-center text-sm text-ink-muted">
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
                className={`rounded-xl border bg-white p-3 ${
                  esaurito ? "border-status-danger/40" : scortaBassa ? "border-amber-300" : "border-black/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => startEdit(p)}
                    className="touch-target flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-light text-primary">
                      <Boxes size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                        {esaurito && (
                          <span className="shrink-0 rounded-full bg-status-dangerBg px-1.5 py-0.5 text-[10px] font-medium text-status-danger">
                            Esaurito
                          </span>
                        )}
                        {!esaurito && scortaBassa && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                            Scorta bassa
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-ink-muted">
                        {p.ml_rimanenti_bottiglia_aperta !== null
                          ? `aperta ${p.ml_rimanenti_bottiglia_aperta}/${p.capacita_standard_ml} ml`
                          : "nessuna bottiglia aperta"}
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle">
                          <div
                            className={`h-full rounded-full ${pct <= 20 ? "bg-amber-400" : "bg-primary"}`}
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
                      className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-ink-muted disabled:opacity-30"
                      aria-label="Togli una bottiglia chiusa"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-ink">{p.bottiglie_chiuse}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        adjustBottiglieChiuse(p.id, 1);
                      }}
                      className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-black/10 text-ink-muted"
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
