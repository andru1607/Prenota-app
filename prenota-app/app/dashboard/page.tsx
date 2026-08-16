"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { TableCard } from "@/components/ui/TableCard";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { PhotoImportReview } from "@/components/ui/PhotoImportReview";
import type { ParsedReservationDraft, Reservation, RestaurantTable, TableStatus } from "@/types";

const DEFAULT_TABLES = [
  { number: "1", capacity: 2 },
  { number: "2", capacity: 2 },
  { number: "3", capacity: 4 },
  { number: "4", capacity: 4 },
  { number: "5", capacity: 6 },
  { number: "6", capacity: 8 },
];

const STATUS_CYCLE: TableStatus[] = ["free", "occupied", "reserved"];
const REFRESH_INTERVAL_MS = 60_000;
const SHOW_TABLES_KEY = "prenota-app:showTables";
const MAX_PREVIEW_ITEMS = 8;

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

function mapTableRow(row: any): RestaurantTable {
  return {
    id: row.id,
    number: row.number,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<ParsedReservationDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedInfo, setSkippedInfo] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [showTables, setShowTables] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SHOW_TABLES_KEY);
    if (saved === "true") setShowTables(true);
  }, []);

  function toggleShowTables() {
    setShowTables((prev) => {
      const next = !prev;
      window.localStorage.setItem(SHOW_TABLES_KEY, String(next));
      return next;
    });
  }

  const loadReservations = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) return;
      const { reservations: data } = await res.json();
      setReservations((data ?? []).map(mapReservationRow));
    } catch (err) {
      console.error("Errore caricamento numeri servizio:", err);
    }
  }, []);

  const loadTables = useCallback(async () => {
    try {
      const res = await fetch("/api/tables");
      if (!res.ok) return;
      const { tables: data } = await res.json();

      if (!data || data.length === 0) {
        const seedRes = await fetch("/api/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tables: DEFAULT_TABLES }),
        });
        if (seedRes.ok) {
          const { tables: seeded } = await seedRes.json();
          setTables((seeded ?? []).map(mapTableRow));
        }
        return;
      }

      setTables(data.map(mapTableRow));
    } catch (err) {
      console.error("Errore caricamento tavoli:", err);
    }
  }, []);

  useEffect(() => {
    loadReservations();
    loadTables();
    const interval = setInterval(loadReservations, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadReservations, loadTables]);

  async function handleTableTap(table: RestaurantTable) {
    const currentIndex = STATUS_CYCLE.indexOf(table.status);
    const nextStatus = STATUS_CYCLE[(currentIndex + 1) % STATUS_CYCLE.length];

    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, status: nextStatus } : t)));

    try {
      const res = await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: table.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento tavolo");
    } catch (err) {
      console.error(err);
      loadTables();
    }
  }

  const today = new Date();
  const todayReservations = reservations.filter(
    (r) => new Date(r.reservationTime).toDateString() === today.toDateString()
  );

  const coperti = todayReservations
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + r.partySize, 0);

  const now = new Date();
  const activeToday = todayReservations
    .filter((r) => r.status !== "cancelled" && r.status !== "completed" && r.status !== "no_show")
    .sort((a, b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());

  const nextArrival = activeToday.find((r) => new Date(r.reservationTime).getTime() >= now.getTime());

  const prossimoArrivo = nextArrival
    ? new Date(nextArrival.reservationTime).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  const tavoliLiberi = tables.filter((t) => t.status === "free").length;
  const previewList = activeToday.slice(0, MAX_PREVIEW_ITEMS);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSkippedInfo(null);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/parse-agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });

      if (!res.ok) throw new Error("Errore nella lettura della foto");

      const { drafts, skipped } = await res.json();

      if (skipped && skipped.length > 0) {
        setSkippedInfo(
          `${skipped.length} già presenti, escluse automaticamente: ${skipped.join(", ")}`
        );
      }

      if (drafts && drafts.length > 0) {
        setDrafts(drafts);
      } else if (skipped && skipped.length > 0) {
        setError(null);
      } else {
        setError("Non ho trovato nessuna prenotazione leggibile in questa foto.");
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a leggere l'agenda. Riprova con una foto più nitida.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }

  async function handleConfirmImport(confirmed: ParsedReservationDraft[]) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drafts: confirmed, source: "photo" }),
      });
      if (!res.ok) throw new Error("Errore nel salvataggio");

      setDrafts(null);
      router.push("/prenotazioni");
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare le prenotazioni. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  if (drafts) {
    return (
      <PhotoImportReview
        drafts={drafts}
        onConfirm={handleConfirmImport}
        onCancel={() => setDrafts(null)}
        isSaving={isSaving}
      />
    );
  }

  return (
    <div>
      <StatusBar totalCoperti={coperti} tavoliLiberi={tavoliLiberi} prossimoArrivo={prossimoArrivo} />

      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-ink">Sala</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleShowTables}
              className="touch-target flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-ink-muted"
              title={showTables ? "Nascondi tavoli" : "Mostra tavoli"}
            >
              {showTables ? <EyeOff size={16} /> : <Eye size={16} />}
              {showTables ? "Nascondi tavoli" : "Mostra tavoli"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelected}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="touch-target flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Leggo...
                </>
              ) : (
                <>
                  <Camera size={18} />
                  Foto agenda
                </>
              )}
            </button>
          </div>
        </div>

        {skippedInfo && (
          <p className="mb-3 rounded-lg bg-status-pendingBg p-3 text-sm text-status-pending">
            {skippedInfo}
          </p>
        )}

        {error && (
          <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">
            {error}
          </p>
        )}

        {showTables ? (
          <>
            <p className="mb-3 text-xs text-ink-muted">
              Tocca un tavolo per cambiarne lo stato (libero → occupato → riservato).
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {tables.map((table) => (
                <TableCard key={table.id} table={table} onClick={() => handleTableTap(table)} />
              ))}
            </div>
          </>
        ) : (
          <div>
            <p className="mb-3 text-xs text-ink-muted">Prossimi arrivi di oggi.</p>

            {previewList.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">
                Nessuna prenotazione attiva per oggi.
              </p>
            ) : (
              <div className="space-y-2">
                {previewList.map((r) => (
                  <ReservationCard key={r.id} reservation={r} />
                ))}
              </div>
            )}

            <button
              onClick={() => router.push("/prenotazioni")}
              className="touch-target mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-primary"
            >
              Vedi tutte le prenotazioni
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
