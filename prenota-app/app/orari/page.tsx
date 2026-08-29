"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2, CalendarX, CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

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
  const { show } = useToast();
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
      show("Non sono riuscito a salvare. Riprova.", "error");
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
      show("Eccezione salvata");
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare l'eccezione.", "error");
    } finally {
      setIsSavingException(false);
    }
  }

  async function handleDeleteException(id: string) {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    try {
      const res = await fetch(`/api/schedule?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      show("Eccezione eliminata");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare.", "error");
      load();
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Orari e chiusure</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-1 text-sm font-medium text-[#F0E9E0]">Giorni di chiusura settimanali</p>
        <p className="mb-3 text-xs text-[#A69686]">
          Nei giorni selezionati, i clienti non potranno prenotare dal QR code.
        </p>

        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
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
                      ? "border-[#C0503D]/50 bg-[#C0503D]/15 text-[#D97A63]"
                      : "border-[#3A2C22] text-[#A69686]"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-[#F0E9E0]">Eccezioni</p>
          <button
            onClick={() => setShowExceptionForm((v) => !v)}
            className="touch-target flex items-center gap-1 text-xs font-medium text-[#C17F45]"
          >
            <Plus size={14} />
            Aggiungi
          </button>
        </div>
        <p className="mb-3 text-xs text-[#A69686]">
          Chiudi per ferie un periodo normalmente aperto, oppure apri eccezionalmente un
          giorno di solito chiuso (es. un evento speciale di lunedì).
        </p>

        {showExceptionForm && (
          <div className="mb-3 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
            <div className="mb-2 flex gap-2">
              <button
                onClick={() => setExceptionType("close")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  exceptionType === "close"
                    ? "bg-[#C0503D] text-white"
                    : "border border-[#3A2C22] text-[#A69686]"
                }`}
              >
                <CalendarX size={14} />
                Chiudi
              </button>
              <button
                onClick={() => setExceptionType("open")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  exceptionType === "open"
                    ? "bg-[#7C9473] text-[#1A1310]"
                    : "border border-[#3A2C22] text-[#A69686]"
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
                className="flex-1 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2 py-2 text-sm text-[#F0E9E0]"
              />
              <span className="text-xs text-[#A69686]">a</span>
              <input
                type="date"
                value={exceptionTo}
                onChange={(e) => setExceptionTo(e.target.value)}
                placeholder="Facoltativo"
                className="flex-1 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2 py-2 text-sm text-[#F0E9E0]"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#A69686]">
              Lascia vuoto il secondo campo per un solo giorno.
            </p>

            <button
              onClick={handleAddException}
              disabled={isSavingException}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-50"
            >
              {isSavingException && <Loader2 size={16} className="animate-spin" />}
              Salva eccezione
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : exceptions.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="Nessuna eccezione programmata" />
        ) : (
          <div className="space-y-1.5">
            {exceptions.map((ex) => (
              <div
                key={ex.id}
                className="animate-fade-in flex items-center justify-between rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {ex.is_open ? (
                    <CalendarCheck size={15} className="text-[#7C9473]" />
                  ) : (
                    <CalendarX size={15} className="text-[#D97A63]" />
                  )}
                  <div>
                    <p className="text-sm text-[#F0E9E0]">{formatDate(ex.date)}</p>
                    <p className="text-[11px] text-[#A69686]">
                      {ex.is_open ? "Eccezionalmente aperto" : "Eccezionalmente chiuso"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteException(ex.id)}
                  className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#C0503D]/15 hover:text-[#D97A63]"
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
