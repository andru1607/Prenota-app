"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { Reservation } from "@/types";

type RangeOption = "7" | "30";

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

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface DayStat {
  date: string;
  coperti: number;
  prenotazioni: number;
}

export default function StatistichePage() {
  const router = useRouter();
  const [range, setRange] = useState<RangeOption>("7");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = Number(range);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - (days - 1));

      const res = await fetch(
        `/api/reservations?from=${toDateString(from)}&to=${toDateString(today)}`
      );
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { reservations: data } = await res.json();
      setReservations((data ?? []).map(mapRow));
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare le statistiche.");
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const dayStats: DayStat[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = toDateString(d);

    const dayReservations = reservations.filter(
      (r) => toDateString(new Date(r.reservationTime)) === dateStr && r.status !== "cancelled"
    );

    dayStats.push({
      date: dateStr,
      coperti: dayReservations.reduce((sum, r) => sum + r.partySize, 0),
      prenotazioni: dayReservations.length,
    });
  }

  const totalCoperti = dayStats.reduce((sum, d) => sum + d.coperti, 0);
  const totalPrenotazioni = dayStats.reduce((sum, d) => sum + d.prenotazioni, 0);
  const media = days > 0 ? Math.round(totalCoperti / days) : 0;
  const maxCoperti = Math.max(1, ...dayStats.map((d) => d.coperti));
  const bestDay = dayStats.reduce((best, d) => (d.coperti > best.coperti ? d : best), dayStats[0]);

  function formatDayLabel(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    const isToday = dateStr === toDateString(today);
    if (isToday) return "Oggi";
    return d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
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
        <h1 className="flex-1 text-lg font-semibold text-ink">Statistiche</h1>
        <button
          onClick={load}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Aggiorna"
        >
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setRange("7")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
            range === "7" ? "bg-primary text-white" : "border border-black/10 text-ink-muted"
          }`}
        >
          Ultimi 7 giorni
        </button>
        <button
          onClick={() => setRange("30")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
            range === "30" ? "bg-primary text-white" : "border border-black/10 text-ink-muted"
          }`}
        >
          Ultimi 30 giorni
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-5 grid grid-cols-3 gap-3 rounded-xl border border-black/5 bg-white p-4">
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{totalCoperti}</p>
          <p className="text-xs text-ink-muted">Coperti totali</p>
        </div>
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{media}</p>
          <p className="text-xs text-ink-muted">Media al giorno</p>
        </div>
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{totalPrenotazioni}</p>
          <p className="text-xs text-ink-muted">Prenotazioni</p>
        </div>
      </div>

      {bestDay && bestDay.coperti > 0 && (
        <p className="mb-4 text-sm text-ink-muted">
          Giorno più pieno: <span className="font-medium text-ink">{formatDayLabel(bestDay.date)}</span>{" "}
          con <span className="font-medium text-ink">{bestDay.coperti}</span> coperti.
        </p>
      )}

      <div className="space-y-2">
        {dayStats.map((d) => (
          <div key={d.date} className="flex items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-ink-muted">{formatDayLabel(d.date)}</span>
            <div className="h-6 flex-1 overflow-hidden rounded-md bg-bg-subtle">
              <div
                className="h-full rounded-md bg-primary transition-all"
                style={{ width: `${(d.coperti / maxCoperti) * 100}%` }}
              />
            </div>
            <span className="num-tabular w-8 shrink-0 text-right text-xs font-medium text-ink">
              {d.coperti}
            </span>
          </div>
        ))}
      </div>

      {totalCoperti === 0 && !isLoading && (
        <p className="mt-6 text-center text-sm text-ink-muted">
          Nessuna prenotazione trovata in questo periodo.
        </p>
      )}
    </div>
  );
}
