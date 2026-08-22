"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Plus, Trash2, ChevronLeft, ChevronRight, CalendarX } from "lucide-react";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { ManualReservationForm } from "@/components/ui/ManualReservationForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReservationCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import type { Reservation } from "@/types";

interface TableOption {
  id: string;
  number: string;
}

function mapRow(row: any): Reservation {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone ?? undefined,
    partySize: row.party_size,
    reservationTime: row.reservation_time,
    status: row.status,
    tableId: row.table_id ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source,
    createdAt: row.created_at,
    customerConfirmedAt: row.customer_confirmed_at ?? undefined,
  };
}

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayDateString(): string {
  return toDateString(new Date());
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return toDateString(d);
}

function formatDateLabel(dateStr: string): string {
  const isToday = dateStr === todayDateString();
  const d = new Date(dateStr + "T12:00:00");
  const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  return isToday ? `Oggi, ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}` : capitalized;
}

function sortTablesByNumber(tables: TableOption[]): TableOption[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

export default function PrenotazioniPage() {
  const { show } = useToast();
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations?date=${selectedDate}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { reservations: data } = await res.json();
      setReservations((data ?? []).map(mapRow));
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare le prenotazioni.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  const loadTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (!res.ok) return;
      const { tables: data } = await res.json();
      setTables(sortTablesByNumber((data ?? []).map((t: any) => ({ id: t.id, number: t.number }))));
    } catch (err) {
      console.error("Errore caricamento tavoli:", err);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const tableNumberById = new Map(tables.map((t) => [t.id, t.number]));

  async function updateStatus(id: string, status: Reservation["status"], toastMessage?: string) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento");
      if (toastMessage) show(toastMessage);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiornare la prenotazione.", "error");
      loadReservations();
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Eliminare definitivamente questa prenotazione?")) return;
    setReservations((prev) => prev.filter((r) => r.id !== id));
    try {
      const res = await fetch(`/api/reservations?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      show("Prenotazione eliminata");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare.", "error");
      loadReservations();
    }
  }

  async function deleteAll() {
    if (
      !confirm(
        `Eliminare TUTTE le prenotazioni di questo giorno (${formatDateLabel(selectedDate)})? Questa azione non si può annullare.`
      )
    )
      return;
    setIsDeletingAll(true);
    try {
      const ids = reservations.map((r) => r.id);
      await Promise.all(ids.map((id) => fetch(`/api/reservations?id=${id}`, { method: "DELETE" })));
      setReservations([]);
      show("Tutte le prenotazioni del giorno sono state eliminate");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare tutte le prenotazioni.", "error");
      loadReservations();
    } finally {
      setIsDeletingAll(false);
    }
  }

  function openNewForm() {
    setEditingReservation(null);
    setShowForm((v) => !v);
  }

  function openEditForm(reservation: Reservation) {
    setEditingReservation(reservation);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingReservation(null);
  }

  async function handleFormSave(data: {
    customerName: string;
    reservationTime: string;
    partySize: number;
    notes: string;
    date: string;
    tableId: string | null;
  }) {
    if (editingReservation) {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingReservation.id,
          customerName: data.customerName,
          reservationTime: data.reservationTime,
          partySize: data.partySize,
          notes: data.notes,
          date: data.date,
          tableId: data.tableId,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error("Errore nel salvataggio: " + body);
      }

      closeForm();
      show("Modifiche salvate");

      if (data.date === selectedDate) {
        loadReservations();
      } else {
        setSelectedDate(data.date);
      }
      return;
    }

    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drafts: [
          {
            customerName: data.customerName,
            reservationTime: data.reservationTime,
            partySize: data.partySize,
            notes: data.notes || undefined,
            confidence: "high",
          },
        ],
        source: "manual",
        date: data.date,
        tableId: data.tableId,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error("Errore nel salvataggio: " + body);
    }

    closeForm();
    show("Prenotazione aggiunta");

    if (data.date === selectedDate) {
      loadReservations();
    } else {
      setSelectedDate(data.date);
    }
  }

  const upcoming = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed" && r.status !== "no_show"
  );
  const done = reservations.filter(
    (r) => r.status === "cancelled" || r.status === "completed" || r.status === "no_show"
  );

  const isToday = selectedDate === todayDateString();
  const showInitialSkeleton = isLoading && reservations.length === 0;

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Prenotazioni</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={loadReservations}
            className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
            aria-label="Aggiorna"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          {reservations.length > 0 && (
            <button
              onClick={deleteAll}
              disabled={isDeletingAll}
              className="touch-target grid place-items-center rounded-lg text-status-danger hover:bg-status-dangerBg disabled:opacity-40"
              aria-label="Elimina tutte"
              title="Elimina tutte le prenotazioni di questo giorno"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={openNewForm}
            className="touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={18} />
            Nuova
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/5 bg-white p-2">
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Giorno precedente"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="relative flex-1">
          <p className="pointer-events-none text-center text-sm font-medium text-ink">
            {formatDateLabel(selectedDate)}
          </p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Scegli data"
          />
        </div>

        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Giorno successivo"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isToday && (
        <button
          onClick={() => setSelectedDate(todayDateString())}
          className="mb-4 text-sm font-medium text-primary"
        >
          Torna a oggi
        </button>
      )}

      {showForm && (
        <div className="mb-4">
          <ManualReservationForm
            onSave={handleFormSave}
            onCancel={closeForm}
            initialDate={selectedDate}
            tables={tables}
            editingReservation={
              editingReservation
                ? {
                    customerName: editingReservation.customerName,
                    reservationTime: editingReservation.reservationTime,
                    partySize: editingReservation.partySize,
                    notes: editingReservation.notes,
                    tableId: editingReservation.tableId,
                  }
                : undefined
            }
          />
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {showInitialSkeleton && (
        <div className="space-y-2">
          <ReservationCardSkeleton />
          <ReservationCardSkeleton />
          <ReservationCardSkeleton />
        </div>
      )}

      {!isLoading && reservations.length === 0 && !error && !showForm && (
        <EmptyState
          icon={CalendarX}
          title="Nessuna prenotazione per questo giorno"
          description='Usa "Nuova" qui sopra per aggiungerne una.'
        />
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onCheckIn={() => updateStatus(r.id, "completed", "Cliente segnato come presente")}
              onNoShow={() => updateStatus(r.id, "no_show", "Segnato come assente")}
              onCancel={() => updateStatus(r.id, "cancelled", "Prenotazione cancellata")}
              onDelete={() => deleteOne(r.id)}
              onAccept={() => updateStatus(r.id, "confirmed", "Richiesta accettata")}
              onReject={() => updateStatus(r.id, "cancelled", "Richiesta rifiutata")}
              onEdit={() => openEditForm(r)}
              tableNumber={r.tableId ? tableNumberById.get(r.tableId) : undefined}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase text-ink-muted">Concluse</p>
          <div className="space-y-2 opacity-70">
            {done.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onDelete={() => deleteOne(r.id)}
                onRestore={() => updateStatus(r.id, "confirmed", "Prenotazione ripristinata")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
