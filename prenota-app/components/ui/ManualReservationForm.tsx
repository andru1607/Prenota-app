"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

interface TableOption {
  id: string;
  number: string;
}

interface EditingReservation {
  customerName: string;
  reservationTime: string; // ISO
  partySize: number;
  notes?: string;
  tableId?: string;
}

interface ManualReservationFormProps {
  onSave: (data: {
    customerName: string;
    reservationTime: string;
    partySize: number;
    notes: string;
    date: string;
    tableId: string | null;
  }) => Promise<void>;
  onCancel: () => void;
  initialDate?: string;
  editingReservation?: EditingReservation;
  tables?: TableOption[];
}

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoToItalyDateAndTime(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const time = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return { date, time };
}

export function ManualReservationForm({
  onSave,
  onCancel,
  initialDate,
  editingReservation,
  tables,
}: ManualReservationFormProps) {
  const editingDefaults = editingReservation
    ? isoToItalyDateAndTime(editingReservation.reservationTime)
    : null;

  const [customerName, setCustomerName] = useState(editingReservation?.customerName ?? "");
  const [reservationTime, setReservationTime] = useState(editingDefaults?.time ?? "");
  const [partySize, setPartySize] = useState(
    editingReservation ? String(editingReservation.partySize) : ""
  );
  const [notes, setNotes] = useState(editingReservation?.notes ?? "");
  const [date, setDate] = useState(editingDefaults?.date ?? initialDate ?? todayDateString());
  const [tableId, setTableId] = useState(editingReservation?.tableId ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingReservation;

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
        tableId: tableId || null,
      });
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#F0E9E0]">
          {isEditing ? "Modifica prenotazione" : "Nuova prenotazione"}
        </h2>
        <button
          onClick={onCancel}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Chiudi"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <input
          className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Nome cliente"
          autoFocus
        />

        <input
          type="date"
          className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0]"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            className="num-tabular rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            value={reservationTime}
            onChange={(e) => setReservationTime(formatTimeInput(e.target.value))}
            placeholder="Orario (HH:MM)"
            inputMode="numeric"
            maxLength={5}
          />
          <input
            type="number"
            className="num-tabular rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder="Coperti"
          />
        </div>
        <input
          className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Note (allergie, richieste...)"
        />

        {tables && tables.length > 0 && (
          <select
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0]"
          >
            <option value="">Nessun tavolo assegnato</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                Tavolo {t.number}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-[#D97A63]">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="touch-target flex-1 rounded-xl border border-[#3A2C22] font-medium text-[#A69686] disabled:opacity-40"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSaving}
          className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] font-medium text-[#1A1310] disabled:opacity-40"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {isSaving ? "Salvo..." : isEditing ? "Salva modifiche" : "Salva"}
        </button>
      </div>
    </div>
  );
}
