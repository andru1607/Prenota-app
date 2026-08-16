"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { TableCard } from "@/components/ui/TableCard";
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
  const nextArrival = todayReservations
    .filter(
      (r) =>
        (r.status === "confirmed" || r.status === "pending") &&
        new Date(r.reservationTime).getTime() >= now.getTime()
    )
    .sort((a, b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime())[0];

  const prossimoArrivo = nextArrival
    ? new Date(nextArrival.reservationTime).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  const tavoliLiberi = tables.filter((t) => t.status === "free").length;

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
                Leggo l'agenda...
              </>
            ) : (
              <>
                <Camera size={18} />
                Foto agenda
              </>
            )}
          </button>
        </div>

        <p className="mb-3 text-xs text-ink-muted">
          Tocca un tavolo per cambiarne lo stato (libero → occupato → riservato).
        </p>

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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tables.map((table) => (
            <TableCard key={table.id} table={table} onClick={() => handleTableTap(table)} />
          ))}
        </div>
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
