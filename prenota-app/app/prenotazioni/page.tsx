"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Plus } from "lucide-react";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { ManualReservationForm } from "@/components/ui/ManualReservationForm";
import type { Reservation } from "@/types";

// Converte una riga del database (snake_case) nel tipo usato dall'interfaccia (camelCase)
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
  };
}

export default function PrenotazioniPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { reservations: data } = await res.json();
      setReservations((data ?? []).map(mapRow));
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare le prenotazioni.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  async function updateStatus(id: string, status: Reservation["status"]) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento");
    } catch (err) {
      console.error(err);
      loadReservations();
    }
  }

  async function handleManualSave(data: {
    customerName: string;
    reservationTime: string;
    partySize: number;
    notes: string;
  }) {
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
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error("Errore nel salvataggio: " + body);
    }

    setShowForm(false);
    loadReservations();
  }

  const upcoming = reservations.filter(
    (r) => r.status !== "cancelled" && r.status !== "completed" && r.status !== "no_show"
  );
  const done = reservations.filter(
    (r) => r.status === "cancelled" || r.status === "completed" || r.status === "no_show"
  );

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Prenotazioni</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={loadReservations}
            className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
            aria-label="Aggiorna"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            <Plus size={18} />
            Nuova
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-4">
          <ManualReservationForm onSave={handleManualSave} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {!isLoading && reservations.length === 0 && !error && !showForm && (
        <p className="py-8 text-center text-sm text-ink-muted">
          Nessuna prenotazione ancora. Usa "Nuova" qui sopra o "Foto agenda" nella Dashboard.
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((r) => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onCheckIn={() => updateStatus(r.id, "completed")}
              onNoShow={() => updateStatus(r.id, "no_show")}
              onCancel={() => updateStatus(r.id, "cancelled")}
            />
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium uppercase text-ink-muted">Concluse</p>
          <div className="space-y-2 opacity-70">
            {done.map((r) => (
              <ReservationCard key={r.id} reservation={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
