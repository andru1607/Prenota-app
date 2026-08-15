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
  high: "text-status-free",
  medium: "text-status-pending",
  low: "text-status-danger",
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
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">Controlla le prenotazioni lette</h2>
        <p className="text-sm text-ink-muted">
          {rows.length} prenotazion{rows.length === 1 ? "e" : "i"} trovate nella foto.
          {lowConfidenceCount > 0 && (
            <span className="text-status-pending">
              {" "}
              {lowConfidenceCount} da ricontrollare.
            </span>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-black/5 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`flex items-center gap-1 text-xs font-medium ${CONFIDENCE_COLOR[row.confidence]}`}
              >
                {row.confidence !== "high" && <AlertTriangle size={14} />}
                {CONFIDENCE_LABEL[row.confidence]}
              </span>
              <button
                onClick={() => removeRow(i)}
                className="touch-target grid place-items-center text-ink-muted hover:text-status-danger"
                aria-label="Rimuovi questa riga"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                className="col-span-2 rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={row.customerName}
                onChange={(e) => updateRow(i, { customerName: e.target.value })}
                placeholder="Nome cliente"
              />
              <input
                className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={row.reservationTime ?? ""}
                onChange={(e) => updateRow(i, { reservationTime: e.target.value })}
                placeholder="Orario (HH:MM)"
              />
              <input
                type="number"
                className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
                value={row.partySize ?? ""}
                onChange={(e) => updateRow(i, { partySize: Number(e.target.value) })}
                placeholder="Coperti"
              />
              <input
                className="col-span-2 rounded-lg border border-black/10 px-3 py-2 text-sm"
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
          className="touch-target flex-1 rounded-xl border border-black/10 font-medium text-ink-muted disabled:opacity-40"
        >
          Annulla
        </button>
        <button
          onClick={() => onConfirm(rows)}
          disabled={rows.length === 0 || isSaving}
          className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-white disabled:opacity-40"
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
