"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ReservationCard } from "@/components/ui/ReservationCard";
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
    // Aggiornamento ottimistico: cambia subito la UI, poi conferma sul server
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
      // In caso di errore, ricarica per tornare allo stato reale
      loadReservations();
    }
  }

  // Le prenotazioni arrivano già ordinate per orario dall'API (reservation_time crescente)
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
        <button
          onClick={loadReservations}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Aggiorna"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {!isLoading && reservations.length === 0 && !error && (
        <p className="py-8 text-center text-sm text-ink-muted">
          Nessuna prenotazione ancora. Usa "Foto agenda" nella Dashboard per importarle.
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
