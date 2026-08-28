"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Loader2,
  FileText,
  Trash2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
import { useToast } from "@/components/ui/ToastProvider";

type Prodotto = {
  id: string;
  name: string;
  capacita_standard_ml: number;
  bottiglie_chiuse: number;
  soglia_minima: number;
};

type ReviewRow = {
  id: string;
  productName: string;
  quantity: string;
  confidence: "high" | "medium" | "low";
  mappedId: string; // id prodotto esistente, oppure "__new__"
};

function findMatch(name: string, prodotti: Prodotto[]): Prodotto | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;

  const exact = prodotti.find((p) => p.name.trim().toLowerCase() === normalized);
  if (exact) return exact;

  const partial = prodotti.find(
    (p) =>
      normalized.includes(p.name.trim().toLowerCase()) ||
      p.name.trim().toLowerCase().includes(normalized)
  );
  return partial ?? null;
}

export default function FatturaImportPage() {
  const router = useRouter();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prodotti, setProdotti] = useState<Prodotto[]>([]);
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  async function ensureProdotti() {
    if (restaurantId && prodotti.length > 0) return { restaurantId, prodotti };

    const staffRow = await getMyStaffRow();
    if (!staffRow) return null;

    const supabase = createClient();
    const { data } = await supabase
      .from("magazzino_prodotti")
      .select("id, name, capacita_standard_ml, bottiglie_chiuse, soglia_minima")
      .eq("restaurant_id", staffRow.restaurantId)
      .order("name", { ascending: true });

    setRestaurantId(staffRow.restaurantId);
    setProdotti(data ?? []);
    return { restaurantId: staffRow.restaurantId, prodotti: data ?? [] };
  }

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setIsProcessing(true);

    try {
      const context = await ensureProdotti();
      if (!context) {
        setError("Sessione non valida, ricarica la pagina.");
        return;
      }

      const allDrafts: { productName: string; quantity: number | null; confidence: "high" | "medium" | "low" }[] = [];

      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/parse-fattura", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: file.type }),
        });

        if (!res.ok) throw new Error("Errore nella lettura di una delle foto");

        const { drafts } = await res.json();
        if (drafts) allDrafts.push(...drafts);
      }

      if (allDrafts.length === 0) {
        setError("Non ho trovato nessun prodotto leggibile in questa fattura.");
        return;
      }

      const reviewRows: ReviewRow[] = allDrafts.map((draft) => {
        const match = findMatch(draft.productName, context.prodotti);
        return {
          id: crypto.randomUUID(),
          productName: draft.productName,
          quantity: draft.quantity != null ? String(draft.quantity) : "1",
          confidence: draft.confidence,
          mappedId: match ? match.id : "__new__",
        };
      });

      setRows(reviewRows);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a leggere una o più foto. Riprova con foto più nitide.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }

  function updateRow(id: string, field: "productName" | "quantity" | "mappedId", value: string) {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)) : prev));
  }

  function removeRow(id: string) {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  async function handleConfirmAll() {
    if (!rows || !restaurantId) return;

    const validRows = rows.filter((r) => r.productName.trim() && Number(r.quantity) > 0);
    if (validRows.length === 0) {
      setError("Aggiungi almeno un prodotto con nome e quantità valide.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createClient();

      for (const row of validRows) {
        const qty = Number(row.quantity);

        if (row.mappedId === "__new__") {
          const { error: insertError } = await supabase.from("magazzino_prodotti").insert({
            restaurant_id: restaurantId,
            name: row.productName.trim(),
            capacita_standard_ml: 700,
            bottiglie_chiuse: qty,
            soglia_minima: 1,
          });
          if (insertError) throw insertError;
        } else {
          const current = prodotti.find((p) => p.id === row.mappedId);
          if (!current) continue;

          const { error: updateError } = await supabase
            .from("magazzino_prodotti")
            .update({ bottiglie_chiuse: current.bottiglie_chiuse + qty })
            .eq("id", row.mappedId);
          if (updateError) throw updateError;
        }
      }

      show("Fattura importata, magazzino aggiornato");
      router.push("/magazzino");
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare tutte le righe. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-4">
      <Link href="/magazzino" className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted">
        <ArrowLeft size={14} />
        Magazzino
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
          <FileText size={22} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">Leggi fattura</h1>
          <p className="text-xs text-ink-muted">Nulla si salva finché non confermi tu</p>
        </div>
      </div>

      {!rows && (
        <div className="rounded-xl border border-black/5 bg-white p-4">
          <p className="mb-3 text-sm text-ink-muted">
            Fai una foto o carica un'immagine della fattura o della bolla di consegna. Puoi selezionare
            più foto insieme se copre più pagine.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelected}
          />

          <div className="flex gap-2">
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessing}
              className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink-muted disabled:opacity-60"
            >
              <ImageIcon size={16} />
              Galleria
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Leggo...
                </>
              ) : (
                <>
                  <Camera size={16} />
                  Foto fattura
                </>
              )}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}
        </div>
      )}

      {rows && (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            Controlla ogni riga: nome, quantità e a quale prodotto del tuo magazzino corrisponde.
          </p>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={row.productName}
                    onChange={(e) => updateRow(row.id, "productName", e.target.value)}
                    placeholder="Nome prodotto"
                    className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                    placeholder="Qtà"
                    className="w-16 shrink-0 rounded-lg border border-black/10 px-2 py-2 text-center text-sm"
                  />
                  <button
                    onClick={() => removeRow(row.id)}
                    className="touch-target grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-muted"
                    aria-label="Rimuovi riga"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <select
                  value={row.mappedId}
                  onChange={(e) => updateRow(row.id, "mappedId", e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                >
                  <option value="__new__">+ Nuovo prodotto</option>
                  {prodotti.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (attualmente {p.bottiglie_chiuse})
                    </option>
                  ))}
                </select>

                {row.confidence === "low" && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
                    <AlertTriangle size={12} />
                    Lettura incerta, ricontrolla questa riga
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}

          <button
            onClick={handleConfirmAll}
            disabled={isSaving}
            className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isSaving ? "Salvo..." : `Conferma e aggiorna magazzino (${rows.length})`}
          </button>
        </>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
