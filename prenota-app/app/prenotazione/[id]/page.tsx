"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Clock,
  X,
  CalendarCheck,
  Users,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ReservationInfo {
  id: string;
  customerName: string;
  partySize: number;
  reservationTime: string;
  status: string;
}

interface RestaurantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
}

export default function BadgePrenotazionePage() {
  const params = useParams();
  const reservationId = params.id as string;

  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`);
      if (!res.ok) throw new Error("Prenotazione non trovata");
      const body = await res.json();
      setReservation(body.reservation);
      setRestaurant(body.restaurant);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a trovare questa prenotazione.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  async function handleCancel() {
    if (!confirm("Sei sicuro di voler disdire questa prenotazione?")) return;
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Errore disdetta");
      await load();
    } catch (err) {
      console.error(err);
      setCancelError("Non sono riuscito a disdire la prenotazione. Riprova.");
    } finally {
      setIsCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-status-danger">{error || "Prenotazione non trovata."}</p>
        </div>
      </div>
    );
  }

  const color = restaurant?.primary_color || "#4F46E5";
  const date = new Date(reservation.reservationTime);
  const dateLabel = date.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLabel = date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

  const isConfirmed = reservation.status === "confirmed";
  const isPending = reservation.status === "pending";
  const isCancelled = reservation.status === "cancelled";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          {restaurant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              <CalendarCheck size={22} />
            </div>
          )}
          <p className="text-sm font-medium text-ink-muted">{restaurant?.name}</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div
            className="flex flex-col items-center gap-2 py-6 text-center text-white"
            style={{ backgroundColor: isCancelled ? "#71717A" : isPending ? "#D97706" : color }}
          >
            {isConfirmed && <Check size={32} />}
            {isPending && <Clock size={32} />}
            {isCancelled && <X size={32} />}
            <p className="text-lg font-semibold">
              {isConfirmed && "Prenotazione confermata"}
              {isPending && "In attesa di conferma"}
              {isCancelled && "Prenotazione disdetta"}
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-black/10" />
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Nome</span>
              <span className="text-sm font-medium text-ink">{reservation.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Data</span>
              <span className="text-sm font-medium capitalize text-ink">{dateLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">Orario</span>
              <span className="num-tabular text-sm font-medium text-ink">{timeLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-ink-muted">
                <Users size={14} /> Persone
              </span>
              <span className="num-tabular text-sm font-medium text-ink">
                {reservation.partySize}
              </span>
            </div>
          </div>
        </div>

        {isConfirmed && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            Mostra questa pagina all'arrivo. Puoi anche salvarla o farne uno screenshot.
          </p>
        )}
        {isPending && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            Il ristorante deve ancora confermare. Torna su questo stesso link più tardi per
            controllare, oppure aggiorna ora.
          </p>
        )}

        {(isConfirmed || isPending) && (
          <div className="mt-4 space-y-2">
            <button
              onClick={load}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink-muted"
            >
              <RefreshCw size={15} />
              Aggiorna stato
            </button>
            {cancelError && (
              <p className="text-center text-xs text-status-danger">{cancelError}</p>
            )}
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-status-danger disabled:opacity-50"
            >
              {isCancelling && <Loader2 size={15} className="animate-spin" />}
              Disdici la prenotazione
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
