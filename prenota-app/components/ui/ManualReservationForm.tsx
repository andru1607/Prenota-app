"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

interface ManualReservationFormProps {
  onSave: (data: {
    customerName: string;
    reservationTime: string;
    partySize: number;
    notes: string;
    date: string;
  }) => Promise<void>;
  onCancel: () => void;
}

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ManualReservationForm({ onSave, onCancel }: ManualReservationFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [partySize, setPartySize] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    customerName.trim().length > 0 &&
    /^\d{1,2}:\d{2}$/.test(reservationTime) &&
    Number(partySize) > 0 &&
    date.length > 0;

  function formatTimeInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2);
  }

  async function handleSubmit() {
    if (!isValid) return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        customerName: customerName.trim(),
        reservationTime,
        partySize: Number(partySize),
        notes: notes.trim(),
        date,
      });
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/5 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Nuova prenotazione</h2>
        <button
          onClick={onCancel}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nome cliente"
          autoFocus
        />

        <input
          type="date"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-ink"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={reservationTime}
            onChange={(e) => setReservationTime(formatTimeInput(e.target.value))}
            placeholder="Orario (HH:MM)"
            inputMode="numeric"
            maxLength={5}
          />
          <input
            type="number"
            className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder="Coperti"
          />
        </div>
        <input
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (allergie, richieste...)"
        />
      </div>

      {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="touch-target flex-1 rounded-xl border border-black/10 font-medium text-ink-muted disabled:opacity-40"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSaving}
          className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-white disabled:opacity-40"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {isSaving ? "Salvo..." : "Salva"}
        </button>
      </div>
    </div>
  );
}
