"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Eye, EyeOff, ChevronRight, CalendarClock, Image as ImageIcon } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { TableCard } from "@/components/ui/TableCard";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { PhotoImportReview } from "@/components/ui/PhotoImportReview";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableCardSkeleton, ReservationCardSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
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
const ROOM_FILTER_KEY = "prenota-app:roomFilter";
const MAX_PREVIEW_ITEMS = 8;

function formatPreviewDayLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toDateString();
  const d = new Date(dateStr);

  if (d.toDateString() === todayStr) return "Oggi";

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Domani";

  const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
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
    customerConfirmedAt: row.customer_confirmed_at ?? undefined,
  };
}

function mapTableRow(row: any): RestaurantTable & { roomId: string | null } {
  return {
    id: row.id,
    number: row.number,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes ?? undefined,
    roomId: row.room_id ?? null,
  };
}

function sortTablesByNumber<T extends { number: string }>(tables: T[]): T[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const { show } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<ParsedReservationDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedInfo, setSkippedInfo] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [tables, setTables] = useState<(RestaurantTable & { roomId: string | null })[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [showTables, setShowTables] = useState(false);
  const [checkingLocale, setCheckingLocale] = useState(true);

  useEffect(() => {
    async function checkBusinessType() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setCheckingLocale(false);
        return;
      }

      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("business_type")
        .eq("id", staffRow.restaurantId)
        .single();

      if (data?.business_type === "bar") {
        router.replace("/cocktail");
        return;
      }

      setCheckingLocale(false);
    }
    checkBusinessType();
  }, [router]);

  useEffect(() => {
    const saved = window.localStorage.getItem(SHOW_TABLES_KEY);
    if (saved === "true") setShowTables(true);

    const savedRoom = window.localStorage.getItem(ROOM_FILTER_KEY);
    if (savedRoom) setRoomFilter(savedRoom);
  }, []);

  function handleRoomFilterChange(value: string) {
    setRoomFilter(value);
    window.localStorage.setItem(ROOM_FILTER_KEY, value);
  }

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
          setTables(sortTablesByNumber((seeded ?? []).map(mapTableRow)));
        }
        return;
      }

      setTables(sortTablesByNumber(data.map(mapTableRow)));
    } catch (err) {
      console.error("Errore caricamento tavoli:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadReservations(), loadTables()]).finally(() => setIsLoadingData(false));
    fetch("/api/rooms")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setRooms(body?.rooms ?? []))
      .catch(() => {});
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

  async function updateReservationStatus(id: string, status: Reservation["status"], toastMessage: string) {
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento");
      show(toastMessage);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiornare la prenotazione.", "error");
      loadReservations();
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

  const allActive = reservations
    .filter((r) => r.status !== "cancelled" && r.status !== "completed" && r.status !== "no_show")
    .sort((a, b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());

  const previewList = allActive.slice(0, MAX_PREVIEW_ITEMS);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setSkippedInfo(null);
    setIsProcessing(true);

    try {
      const allDrafts: ParsedReservationDraft[] = [];
      const allSkipped: string[] = [];

      for (const file of Array.from(files)) {
        const base64 = await fileToBase64(file);
        const res = await fetch("/api/parse-agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: file.type }),
        });

        if (!res.ok) throw new Error("Errore nella lettura di una delle foto");

        const { drafts, skipped } = await res.json();
        if (drafts) allDrafts.push(...drafts);
        if (skipped) allSkipped.push(...skipped);
      }

      if (allSkipped.length > 0) {
        setSkippedInfo(
          `${allSkipped.length} già presenti, escluse automaticamente: ${allSkipped.join(", ")}`
        );
      }

      if (allDrafts.length > 0) {
        setDrafts(allDrafts);
      } else if (allSkipped.length > 0) {
        setError(null);
      } else {
        setError("Non ho trovato nessuna prenotazione leggibile in queste foto.");
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a leggere una o più foto. Riprova con foto più nitide.");
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
      show(`${confirmed.length} prenotazion${confirmed.length === 1 ? "e" : "i"} salvat${confirmed.length === 1 ? "a" : "e"}`);
      router.push("/prenotazioni");
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare le prenotazioni. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  if (checkingLocale) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
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
      <OnboardingGuide />
      <StatusBar totalCoperti={coperti} tavoliLiberi={tavoliLiberi} prossimoArrivo={prossimoArrivo} />

      <div className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-ink">Sala</h1>

          <div className="flex flex-wrap items-center gap-2">
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
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelected}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoSelected}
            />
            <button
              onClick={() => galleryInputRef.current?.click()}
              disabled={isProcessing}
              className="touch-target flex items-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm font-medium text-ink-muted disabled:opacity-60"
            >
              <ImageIcon size={16} />
              Galleria
            </button>
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

            {rooms.length > 0 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => handleRoomFilterChange("all")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                    roomFilter === "all"
                      ? "bg-primary text-white"
                      : "border border-black/10 text-ink-muted"
                  }`}
                >
                  Tutte
                </button>
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomFilterChange(room.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      roomFilter === room.id
                        ? "bg-primary text-white"
                        : "border border-black/10 text-ink-muted"
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
                {tables.some((t) => !t.roomId || !rooms.some((r) => r.id === t.roomId)) && (
                  <button
                    onClick={() => handleRoomFilterChange("none")}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      roomFilter === "none"
                        ? "bg-primary text-white"
                        : "border border-black/10 text-ink-muted"
                    }`}
                  >
                    Senza sala
                  </button>
                )}
              </div>
            )}

            {(() => {
              if (isLoadingData) {
                return (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableCardSkeleton key={i} />
                    ))}
                  </div>
                );
              }

              const filteredTables =
                roomFilter === "all"
                  ? tables
                  : roomFilter === "none"
                  ? tables.filter((t) => !t.roomId || !rooms.some((r) => r.id === t.roomId))
                  : tables.filter((t) => t.roomId === roomFilter);

              if (filteredTables.length === 0) {
                return (
                  <p className="py-8 text-center text-sm text-ink-muted">
                    Nessun tavolo in questa sala.
                  </p>
                );
              }

              return (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {filteredTables.map((table) => (
                    <TableCard key={table.id} table={table} onClick={() => handleTableTap(table)} />
                  ))}
                </div>
              );
            })()}
          </>
        ) : (
          <div>
            <p className="mb-3 text-xs text-ink-muted">Prossime prenotazioni.</p>

            {isLoadingData ? (
              <div className="space-y-2">
                <ReservationCardSkeleton />
                <ReservationCardSkeleton />
                <ReservationCardSkeleton />
              </div>
            ) : previewList.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Nessuna prenotazione attiva al momento"
                description="Le prossime prenotazioni appariranno qui."
              />
            ) : (
              <div className="space-y-2">
                {previewList.map((r, index) => {
                  const dayLabel = formatPreviewDayLabel(r.reservationTime);
                  const previousDayLabel =
                    index > 0 ? formatPreviewDayLabel(previewList[index - 1].reservationTime) : null;
                  const showSeparator = dayLabel !== previousDayLabel;

                  return (
                    <div key={r.id}>
                      {showSeparator && (
                        <p className="mb-2 mt-4 text-xs font-semibold uppercase text-ink-muted first:mt-0">
                          {dayLabel}
                        </p>
                      )}
                      <ReservationCard
                        reservation={r}
                        onCheckIn={() =>
                          updateReservationStatus(r.id, "completed", "Cliente segnato come presente")
                        }
                        onNoShow={() =>
                          updateReservationStatus(r.id, "no_show", "Segnato come assente")
                        }
                      />
                    </div>
                  );
                })}
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
