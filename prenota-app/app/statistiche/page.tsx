"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { Reservation } from "@/types";

type RangeOption = "7" | "30";

const DINNER_START_HOUR = 18;

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

function isDinner(reservationTime: string): boolean {
  return new Date(reservationTime).getHours() >= DINNER_START_HOUR;
}

interface DayStat {
  date: string;
  copertiPranzo: number;
  copertiCena: number;
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

    const pranzo = dayReservations.filter((r) => !isDinner(r.reservationTime));
    const cena = dayReservations.filter((r) => isDinner(r.reservationTime));

    dayStats.push({
      date: dateStr,
      copertiPranzo: pranzo.reduce((sum, r) => sum + r.partySize, 0),
      copertiCena: cena.reduce((sum, r) => sum + r.partySize, 0),
      prenotazioni: dayReservations.length,
    });
  }

  const totalPranzo = dayStats.reduce((sum, d) => sum + d.copertiPranzo, 0);
  const totalCena = dayStats.reduce((sum, d) => sum + d.copertiCena, 0);
  const totalCoperti = totalPranzo + totalCena;
  const totalPrenotazioni = dayStats.reduce((sum, d) => sum + d.prenotazioni, 0);
  const mediaPranzo = days > 0 ? Math.round(totalPranzo / days) : 0;
  const mediaCena = days > 0 ? Math.round(totalCena / days) : 0;

  const maxCoperti = Math.max(1, ...dayStats.map((d) => d.copertiPranzo + d.copertiCena));
  const bestDay = dayStats.reduce(
    (best, d) => (d.copertiPranzo + d.copertiCena > best.copertiPranzo + best.copertiCena ? d : best),
    dayStats[0]
  );

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

      <div className="mb-3 grid grid-cols-3 gap-3 rounded-xl border border-black/5 bg-white p-4">
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{totalCoperti}</p>
          <p className="text-xs text-ink-muted">Coperti totali</p>
        </div>
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">
            {Math.round(totalCoperti / days)}
          </p>
          <p className="text-xs text-ink-muted">Media al giorno</p>
        </div>
        <div className="text-center">
          <p className="num-tabular text-2xl font-bold text-ink">{totalPrenotazioni}</p>
          <p className="text-xs text-ink-muted">Prenotazioni</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-black/5 bg-white p-4 text-center">
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-primary/40" />
            Pranzo
          </p>
          <p className="num-tabular text-xl font-bold text-ink">{totalPranzo}</p>
          <p className="text-xs text-ink-muted">coperti · media {mediaPranzo}/giorno</p>
        </div>
        <div className="rounded-xl border border-black/5 bg-white p-4 text-center">
          <p className="mb-1 flex items-center justify-center gap-1.5 text-xs font-medium uppercase text-ink-muted">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Cena
          </p>
          <p className="num-tabular text-xl font-bold text-ink">{totalCena}</p>
          <p className="text-xs text-ink-muted">coperti · media {mediaCena}/giorno</p>
        </div>
      </div>

      {bestDay && bestDay.copertiPranzo + bestDay.copertiCena > 0 && (
        <p className="mb-4 text-sm text-ink-muted">
          Giorno più pieno: <span className="font-medium text-ink">{formatDayLabel(bestDay.date)}</span>{" "}
          con <span className="font-medium text-ink">{bestDay.copertiPranzo + bestDay.copertiCena}</span> coperti.
        </p>
      )}

      <div className="mb-2 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary/40" />
          Pranzo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Cena
        </span>
      </div>

      <div className="space-y-2">
        {dayStats.map((d) => {
          const total = d.copertiPranzo + d.copertiCena;
          return (
            <div key={d.date} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-ink-muted">{formatDayLabel(d.date)}</span>
              <div className="flex h-6 flex-1 overflow-hidden rounded-md bg-bg-subtle">
                {d.copertiPranzo > 0 && (
                  <div
                    className="h-full bg-primary/40 transition-all"
                    style={{ width: `${(d.copertiPranzo / maxCoperti) * 100}%` }}
                  />
                )}
                {d.copertiCena > 0 && (
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(d.copertiCena / maxCoperti) * 100}%` }}
                  />
                )}
              </div>
              <span className="num-tabular w-8 shrink-0 text-right text-xs font-medium text-ink">
                {total}
              </span>
            </div>
          );
        })}
      </div>

      {totalCoperti === 0 && !isLoading && (
        <p className="mt-6 text-center text-sm text-ink-muted">
          Nessuna prenotazione trovata in questo periodo.
        </p>
      )}
    </div>
  );
}
