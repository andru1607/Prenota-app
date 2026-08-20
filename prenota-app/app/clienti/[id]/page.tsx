"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Trash2, Check, Loader2 } from "lucide-react";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { getMyRole } from "@/lib/roles";
import type { Customer, Reservation } from "@/types";

function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    isRegular: row.is_regular,
    reservationCount: row.reservation_count,
  };
}

function mapReservationRow(row: any): Reservation {
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

export default function ClienteDettaglioPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers?id=${customerId}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { customers: data } = await res.json();
      const found = (data ?? [])[0];
      if (!found) throw new Error("Cliente non trovato");

      const mapped = mapCustomerRow(found);
      setCustomer(mapped);
      setNotes(mapped.notes ?? "");

      if (mapped.phone) {
        const histRes = await fetch(`/api/reservations?phone=${encodeURIComponent(mapped.phone)}`);
        if (histRes.ok) {
          const { reservations: histData } = await histRes.json();
          setHistory(
            (histData ?? [])
              .map(mapReservationRow)
              .sort(
                (a: Reservation, b: Reservation) =>
                  new Date(b.reservationTime).getTime() - new Date(a.reservationTime).getTime()
              )
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare il cliente.");
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [load]);

  async function handleSaveNotes() {
    if (!customer) return;
    setIsSavingNotes(true);
    try {
      await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, notes }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!customer || !confirm(`Eliminare la scheda di ${customer.name}?`)) return;
    try {
      await fetch(`/api/customers?id=${customer.id}`, { method: "DELETE" });
      router.push("/clienti");
    } catch (err) {
      console.error(err);
    }
  }

  if (isLoading) {
    return <p className="p-4 text-center text-sm text-ink-muted">Carico...</p>;
  }

  if (error || !customer) {
    return <p className="p-4 text-center text-sm text-status-danger">{error || "Cliente non trovato."}</p>;
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/clienti")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-semibold text-ink">{customer.name}</h1>
            {customer.isRegular && (
              <Star size={15} className="fill-status-pending text-status-pending" />
            )}
          </div>
          <p className="text-sm text-ink-muted">{customer.phone || "Nessun telefono"}</p>
        </div>
        {isAdmin && (
        <button
          onClick={handleDelete}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
          aria-label="Elimina cliente"
        >
          <Trash2 size={18} />
        </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-black/5 bg-white p-4">
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{customer.reservationCount}</p>
          <p className="text-xs text-ink-muted">Prenotazioni</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-ink">{customer.isRegular ? "Sì" : "No"}</p>
          <p className="text-xs text-ink-muted">Cliente abituale</p>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-ink">Note (allergie, preferenze...)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          placeholder="Es. allergia ai crostacei, preferisce tavoli vicino alla finestra..."
        />
        <button
          onClick={handleSaveNotes}
          disabled={isSavingNotes}
          className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSavingNotes && <Loader2 size={16} className="animate-spin" />}
          {notesSaved ? "Salvato!" : "Salva note"}
        </button>
      </div>

      <p className="mb-2 text-xs font-medium uppercase text-ink-muted">Storico prenotazioni</p>
      {!customer.phone ? (
        <p className="py-6 text-center text-sm text-ink-muted">
          Aggiungi un telefono per vedere lo storico delle prenotazioni collegate.
        </p>
      ) : history.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">Nessuna prenotazione trovata.</p>
      ) : (
        <div className="space-y-2">
          {history.map((r) => (
            <ReservationCard key={r.id} reservation={r} />
          ))}
        </div>
      )}
    </div>
  );
}
