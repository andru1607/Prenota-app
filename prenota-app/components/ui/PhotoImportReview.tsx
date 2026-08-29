"use client";

import { useState } from "react";
import { AlertTriangle, Check, Trash2, Loader2 } from "lucide-react";
import type { ParsedReservationDraft } from "@/types";

interface PhotoImportReviewProps {
  drafts: ParsedReservationDraft[];
  onConfirm: (confirmed: ParsedReservationDraft[]) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const CONFIDENCE_LABEL: Record<ParsedReservationDraft["confidence"], string> = {
  high: "Lettura sicura",
  medium: "Da ricontrollare",
  low: "Poco leggibile",
};

const CONFIDENCE_COLOR: Record<ParsedReservationDraft["confidence"], string> = {
  high: "text-[#7C9473]",
  medium: "text-[#E3A857]",
  low: "text-[#D97A63]",
};

// Schermata di conferma OBBLIGATORIA dopo la lettura della foto dell'agenda.
// La scrittura a mano può essere letta male: nessuna prenotazione viene salvata
// finché lo staff non conferma (o corregge) ogni riga qui.
export function PhotoImportReview({ drafts, onConfirm, onCancel, isSaving }: PhotoImportReviewProps) {
  const [rows, setRows] = useState(drafts);

  function updateRow(index: number, patch: Partial<ParsedReservationDraft>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  const lowConfidenceCount = rows.filter((r) => r.confidence !== "high").length;

  return (
    <div className="min-h-screen space-y-4 bg-[#1A1310] p-4">
      <div>
        <h2 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Controlla le prenotazioni lette</h2>
        <p className="text-sm text-[#A69686]">
          {rows.length} prenotazion{rows.length === 1 ? "e" : "i"} trovate nella foto.
          {lowConfidenceCount > 0 && (
            <span className="text-[#E3A857]">
              {" "}
              {lowConfidenceCount} da ricontrollare.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-[#3A2C22] bg-[#251C17] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`flex items-center gap-1 text-xs font-medium ${CONFIDENCE_COLOR[row.confidence]}`}
              >
                {row.confidence !== "high" && <AlertTriangle size={14} />}
                {CONFIDENCE_LABEL[row.confidence]}
              </span>
              <button
                onClick={() => removeRow(i)}
                className="touch-target grid place-items-center text-[#A69686] hover:text-[#D97A63]"
                aria-label="Rimuovi questa riga"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                className="col-span-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                value={row.customerName}
                onChange={(e) => updateRow(i, { customerName: e.target.value })}
                placeholder="Nome cliente"
              />
              <input
                className="num-tabular rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                value={row.reservationTime ?? ""}
                onChange={(e) => updateRow(i, { reservationTime: e.target.value })}
                placeholder="Orario (HH:MM)"
              />
              <input
                type="number"
                className="num-tabular rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                value={row.partySize ?? ""}
                onChange={(e) => updateRow(i, { partySize: Number(e.target.value) })}
                placeholder="Coperti"
              />
              <input
                className="col-span-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                value={row.notes ?? ""}
                onChange={(e) => updateRow(i, { notes: e.target.value })}
                placeholder="Note (allergie, richieste...)"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="touch-target flex-1 rounded-xl border border-[#3A2C22] font-medium text-[#A69686] disabled:opacity-40"
        >
          Annulla
        </button>
        <button
          onClick={() => onConfirm(rows)}
          disabled={rows.length === 0 || isSaving}
          className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] font-medium text-[#1A1310] disabled:opacity-40"
        >
          {isSaving ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Check size={18} />
          )}
          {isSaving ? "Salvo..." : `Conferma e salva (${rows.length})`}
        </button>
      </div>
    </div>
  );
}
