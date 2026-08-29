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
  mappedId: string;
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
    <div className="min-h-screen bg-[#1A1310] p-4">
      <Link href="/magazzino" className="mb-3 flex items-center gap-1 text-xs font-medium text-[#A69686]">
        <ArrowLeft size={14} />
        Magazzino
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center">
          <div className="absolute inset-0 rounded-full bg-[#E3A857] opacity-20 blur-md" />
          <div className="relative grid h-12 w-12 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
            <FileText size={20} />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Leggi fattura</h1>
          <p className="text-xs text-[#A69686]">Nulla si salva finché non confermi tu</p>
        </div>
      </div>

      {!rows && (
        <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
          <p className="mb-3 text-sm text-[#A69686]">
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
              className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#3A2C22] py-2.5 text-sm font-medium text-[#A69686] disabled:opacity-60"
            >
              <ImageIcon size={16} />
              Galleria
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-60"
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

          {error && <p className="mt-3 text-sm text-[#D97A63]">{error}</p>}
        </div>
      )}

      {rows && (
        <>
          <p className="mb-3 text-sm text-[#A69686]">
            Controlla ogni riga: nome, quantità e a quale prodotto del tuo magazzino corrisponde.
          </p>

          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-[#3A2C22] bg-[#251C17] p-3">
                <div className="mb-2 flex items-center gap-2">
                  <input
                    value={row.productName}
                    onChange={(e) => updateRow(row.id, "productName", e.target.value)}
                    placeholder="Nome prodotto"
                    className="min-w-0 flex-1 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                    placeholder="Qtà"
                    className="num-tabular w-16 shrink-0 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-2 py-2 text-center text-sm text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <button
                    onClick={() => removeRow(row.id)}
                    className="touch-target grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[#A69686]"
                    aria-label="Rimuovi riga"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <select
                  value={row.mappedId}
                  onChange={(e) => updateRow(row.id, "mappedId", e.target.value)}
                  className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0]"
                >
                  <option value="__new__">+ Nuovo prodotto</option>
                  {prodotti.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (attualmente {p.bottiglie_chiuse})
                    </option>
                  ))}
                </select>

                {row.confidence === "low" && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-[#E3A857]">
                    <AlertTriangle size={12} />
                    Lettura incerta, ricontrolla questa riga
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm text-[#D97A63]">{error}</p>}

          <button
            onClick={handleConfirmAll}
            disabled={isSaving}
            className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)] disabled:opacity-50"
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
