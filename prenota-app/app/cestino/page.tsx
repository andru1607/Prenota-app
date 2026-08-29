"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

interface TrashedReservation {
  id: string;
  customer_name: string;
  party_size: number;
  reservation_time: string;
  deleted_at: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CestinoPage() {
  const router = useRouter();
  const { show } = useToast();
  const [items, setItems] = useState<TrashedReservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reservations?trash=true");
      if (!res.ok) throw new Error("Errore");
      const { reservations } = await res.json();
      setItems(reservations ?? []);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare il cestino.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRestore(item: TrashedReservation) {
    setBusyId(item.id);
    try {
      const res = await fetch("/api/reservations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, restore: true }),
      });
      if (!res.ok) throw new Error("Errore");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      show(`"${item.customer_name}" ripristinata`);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a ripristinare la prenotazione.", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePermanentDelete(item: TrashedReservation) {
    if (!confirm(`Eliminare per sempre la prenotazione di "${item.customer_name}"? Non si torna più indietro.`))
      return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/reservations?id=${item.id}&permanent=true`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      show("Eliminata per sempre");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare la prenotazione.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/prenotazioni")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-ink">Cestino</h1>
          <p className="text-xs text-ink-muted">Prenotazioni cancellate — recuperabili per 30 giorni</p>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : items.length === 0 ? (
        <EmptyState icon={Trash2} title="Il cestino è vuoto" description="Nessuna prenotazione cancellata di recente." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-black/5 bg-white p-3">
              <p className="text-sm font-semibold text-ink">{item.customer_name}</p>
              <p className="text-xs text-ink-muted">
                {formatDateTime(item.reservation_time)} · {item.party_size} coperti
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                Cancellata il {formatDateTime(item.deleted_at)}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleRestore(item)}
                  disabled={busyId === item.id}
                  className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-medium text-white disabled:opacity-50"
                >
                  {busyId === item.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  Ripristina
                </button>
                <button
                  onClick={() => handlePermanentDelete(item)}
                  disabled={busyId === item.id}
                  className="touch-target flex items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-status-danger disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Elimina per sempre
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
