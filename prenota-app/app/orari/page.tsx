"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, CalendarX, CalendarCheck } from "lucide-react";

interface ScheduleException {
  id: string;
  date: string;
  is_open: boolean;
}

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Gio" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sab" },
  { value: 0, label: "Dom" },
];

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

export default function OrariPage() {
  const router = useRouter();
  const [closedWeekdays, setClosedWeekdays] = useState<number[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingWeekdays, setIsSavingWeekdays] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showExceptionForm, setShowExceptionForm] = useState(false);
  const [exceptionType, setExceptionType] = useState<"close" | "open">("close");
  const [exceptionFrom, setExceptionFrom] = useState(todayDateString());
  const [exceptionTo, setExceptionTo] = useState("");
  const [isSavingException, setIsSavingException] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { closedWeekdays: cw, exceptions: ex } = await res.json();
      setClosedWeekdays(cw ?? []);
      setExceptions(ex ?? []);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare gli orari.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleWeekday(day: number) {
    const next = closedWeekdays.includes(day)
      ? closedWeekdays.filter((d) => d !== day)
      : [...closedWeekdays, day];

    setClosedWeekdays(next);
    setIsSavingWeekdays(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closedWeekdays: next }),
      });
      if (!res.ok) throw new Error("Errore salvataggio");
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare. Riprova.");
      load();
    } finally {
      setIsSavingWeekdays(false);
    }
  }

  async function handleAddException() {
    if (!exceptionFrom) return;
    setIsSavingException(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: exceptionFrom,
          to: exceptionTo || undefined,
          isOpen: exceptionType === "open",
        }),
      });
      if (!res.ok) throw new Error("Errore creazione eccezione");
      setExceptionFrom(todayDateString());
      setExceptionTo("");
      setShowExceptionForm(false);
      load();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare l'eccezione.");
    } finally {
      setIsSavingException(false);
    }
  }

  async function handleDeleteException(id: string) {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
    } catch (err) {
      console.error(err);
      load();
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink">Orari e chiusure</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-1 text-sm font-medium text-ink">Giorni di chiusura settimanali</p>
        <p className="mb-3 text-xs text-ink-muted">
          Nei giorni selezionati, i clienti non potranno prenotare dal QR code.
        </p>

        {isLoading ? (
          <p className="py-4 text-center text-sm text-ink-muted">Carico...</p>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {WEEKDAYS.map((day) => {
              const isClosed = closedWeekdays.includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => toggleWeekday(day.value)}
                  disabled={isSavingWeekdays}
                  className={`touch-target rounded-xl border text-sm font-medium disabled:opacity-60 ${
                    isClosed
                      ? "border-status-danger bg-status-dangerBg text-status-danger"
                      : "border-black/10 text-ink-muted"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Eccezioni</p>
          <button
            onClick={() => setShowExceptionForm((v) => !v)}
            className="touch-target flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Chiudi per ferie un periodo normalmente aperto, oppure apri eccezionalmente un
          giorno di solito chiuso (es. un evento speciale di lunedì).
        </p>

        {showExceptionForm && (
          <div className="mb-3 rounded-lg bg-bg-subtle p-3">
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setExceptionType("close")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  exceptionType === "close"
                    ? "bg-status-danger text-white"
                    : "border border-black/10 text-ink-muted"
                }`}
              >
                <CalendarX size={14} />
                Chiudi
              </button>
              <button
                onClick={() => setExceptionType("open")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  exceptionType === "open"
                    ? "bg-status-free text-white"
                    : "border border-black/10 text-ink-muted"
                }`}
              >
                <CalendarCheck size={14} />
                Apri
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={exceptionFrom}
                onChange={(e) => setExceptionFrom(e.target.value)}
                className="flex-1 rounded-lg border border-black/10 px-2 py-2 text-sm"
              />
              <span className="text-xs text-ink-muted">a</span>
              <input
                type="date"
                value={exceptionTo}
                onChange={(e) => setExceptionTo(e.target.value)}
                placeholder="Facoltativo"
                className="flex-1 rounded-lg border border-black/10 px-2 py-2 text-sm"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Lascia vuoto il secondo campo per un solo giorno.
            </p>

            <button
              onClick={handleAddException}
              disabled={isSavingException}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isSavingException && <Loader2 size={16} className="animate-spin" />}
              Salva eccezione
            </button>
          </div>
        )}

        {exceptions.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-muted">Nessuna eccezione programmata.</p>
        ) : (
          <div className="space-y-1.5">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between rounded-lg bg-bg-subtle px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {ex.is_open ? (
                    <CalendarCheck size={15} className="text-status-free" />
                  ) : (
                    <CalendarX size={15} className="text-status-danger" />
                  )}
                  <div>
                    <p className="text-sm text-ink">{formatDate(ex.date)}</p>
                    <p className="text-[11px] text-ink-muted">
                      {ex.is_open ? "Eccezionalmente aperto" : "Eccezionalmente chiuso"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteException(ex.id)}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                  aria-label="Rimuovi eccezione"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
