"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Trash2, Check, Loader2, CalendarClock } from "lucide-react";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
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
  const { show } = useToast();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [history, setHistory] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

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
      show("Note salvate");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare le note.", "error");
    } finally {
      setIsSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!customer || !confirm(`Eliminare la scheda di ${customer.name}?`)) return;
    try {
      await fetch(`/api/customers?id=${customer.id}`, { method: "DELETE" });
      show("Cliente eliminato");
      router.push("/clienti");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare il cliente.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1310] p-4">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="mb-4 h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-[#1A1310] p-4">
        <p className="text-center text-sm text-[#D97A63]">{error || "Cliente non trovato."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/clienti")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">{customer.name}</h1>
            {customer.isRegular && (
              <Star size={15} className="fill-[#E3A857] text-[#E3A857]" />
            )}
          </div>
          <p className="text-sm text-[#A69686]">{customer.phone || "Nessun telefono"}</p>
        </div>
        {isAdmin && (
        <button
          onClick={handleDelete}
          className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#C0503D]/15 hover:text-[#D97A63]"
          aria-label="Elimina cliente"
        >
          <Trash2 size={18} />
        </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-[#F0E9E0]">{customer.reservationCount}</p>
          <p className="text-xs text-[#A69686]">Prenotazioni</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-[#F0E9E0]">{customer.isRegular ? "Sì" : "No"}</p>
          <p className="text-xs text-[#A69686]">Cliente abituale</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-2 text-sm font-medium text-[#F0E9E0]">Note (allergie, preferenze...)</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          placeholder="Es. allergia ai crostacei, preferisce tavoli vicino alla finestra..."
        />
        <button
          onClick={handleSaveNotes}
          disabled={isSavingNotes}
          className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-50"
        >
          {isSavingNotes && <Loader2 size={16} className="animate-spin" />}
          Salva note
        </button>
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#A69686]">Storico prenotazioni</p>
      {!customer.phone ? (
        <EmptyState
          icon={CalendarClock}
          title="Nessun telefono associato"
          description="Aggiungi un telefono per vedere lo storico delle prenotazioni collegate."
        />
      ) : history.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nessuna prenotazione trovata" />
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
