"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { TableCard } from "@/components/ui/TableCard";
import { PhotoImportReview } from "@/components/ui/PhotoImportReview";
import type { ParsedReservationDraft, RestaurantTable } from "@/types";

// Dati di esempio — da sostituire con fetch reale da Supabase
const MOCK_TABLES: RestaurantTable[] = [
  { id: "1", number: "1", capacity: 2, status: "free" },
  { id: "2", number: "2", capacity: 2, status: "occupied" },
  { id: "3", number: "3", capacity: 4, status: "reserved" },
  { id: "4", number: "4", capacity: 4, status: "free" },
  { id: "5", number: "5", capacity: 6, status: "occupied" },
  { id: "6", number: "6", capacity: 8, status: "reserved" },
];

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<ParsedReservationDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/parse-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });

      if (!res.ok) throw new Error("Errore nella lettura della foto");

      const { drafts } = await res.json();
      setDrafts(drafts);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a leggere l'agenda. Riprova con una foto più nitida.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }

  async function handleConfirmImport(confirmed: ParsedReservationDraft[]) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: confirmed, source: "photo" }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error("Errore nel salvataggio: " + body);
      }

      setDrafts(null);
      router.push("/prenotazioni");
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare le prenotazioni. Riprova.");
      alert("ERRORE: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  }

  if (drafts) {
    return (
      <PhotoImportReview
        drafts={drafts}
        onConfirm={handleConfirmImport}
        onCancel={() => setDrafts(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div>
      <StatusBar totalCoperti={42} tavoliLiberi={2} prossimoArrivo="20:15" />

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">Sala</h1>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="touch-target flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Leggo l'agenda...
              </>
            ) : (
              <>
                <Camera size={18} />
                Foto agenda
              </>
            )}
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {MOCK_TABLES.map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      </div>
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
