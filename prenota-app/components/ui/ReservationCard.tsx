"use client";

import { useState, useRef } from "react";
import { Users, Check, UserX, StickyNote, X, Trash2, Pencil, Phone } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/types";

const STATUS_BAR_COLOR: Record<ReservationStatus, string> = {
  confirmed: "bg-status-free",
  pending: "bg-status-pending",
  late: "bg-status-danger",
  cancelled: "bg-status-closed",
  completed: "bg-status-free",
  no_show: "bg-status-danger",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: "Confermata",
  pending: "Da confermare",
  late: "In ritardo",
  cancelled: "Cancellata",
  completed: "Presente",
  no_show: "Assente",
};

const SWIPE_THRESHOLD = 64;
const SWIPE_MAX = 96;

interface ReservationCardProps {
  reservation: Reservation;
  onCheckIn?: () => void;
  onNoShow?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  tableNumber?: string;
}

export function ReservationCard({
  reservation,
  onCheckIn,
  onNoShow,
  onCancel,
  onDelete,
  onAccept,
  onReject,
  onEdit,
  tableNumber,
}: ReservationCardProps) {
  const time = new Date(reservation.reservationTime).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFinal =
    reservation.status === "completed" ||
    reservation.status === "no_show" ||
    reservation.status === "cancelled";

  const isPending = reservation.status === "pending";
  const canSwipe = !isFinal && !isPending && !!(onCheckIn || onCancel);

  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);

  function handleTouchStart(e: React.TouchEvent) {
    if (!canSwipe) return;
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!canSwipe || !isDragging) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    setDragX(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, delta)));
  }

  function handleTouchEnd() {
    if (!canSwipe) return;
    setIsDragging(false);
    if (dragX > SWIPE_THRESHOLD && onCheckIn) {
      onCheckIn();
    } else if (dragX < -SWIPE_THRESHOLD && onCancel) {
      onCancel();
    }
    setDragX(0);
  }

  return (
    <div className="animate-fade-in relative overflow-hidden rounded-xl">
      {canSwipe && (
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <span
            className={`flex items-center gap-1.5 text-sm font-semibold text-status-free transition-opacity ${
              dragX > 16 ? "opacity-100" : "opacity-0"
            }`}
          >
            <Check size={18} />
            Presente
          </span>
          <span
            className={`flex items-center gap-1.5 text-sm font-semibold text-status-danger transition-opacity ${
              dragX < -16 ? "opacity-100" : "opacity-0"
            }`}
          >
            Cancella
            <X size={18} />
          </span>
        </div>
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease-out",
        }}
        className="relative overflow-hidden rounded-xl bg-white shadow-sm"
      >
        <div className="flex">
          <div className={`w-1.5 ${STATUS_BAR_COLOR[reservation.status]}`} />

          <div className="flex flex-1 items-center justify-between p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-ink">{reservation.customerName}</p>
                {reservation.source === "public" && (
                  <span className="shrink-0 rounded-full bg-primary-light px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Richiesta cliente
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-sm text-ink-muted">
                <span className="num-tabular font-medium text-ink">{time}</span>
                <span className="flex items-center gap-1">
                  <Users size={14} /> {reservation.partySize}
                </span>
                {tableNumber && (
                  <span className="rounded bg-bg-subtle px-1.5 py-0.5 text-xs font-medium text-ink-muted">
                    Tavolo {tableNumber}
                  </span>
                )}
                {isFinal && (
                  <span className="text-xs">{STATUS_LABEL[reservation.status]}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {reservation.phone && (
                <a
                  href={`tel:${reservation.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="touch-target grid place-items-center rounded-lg text-primary hover:bg-primary-light"
                  aria-label={`Chiama ${reservation.customerName}`}
                  title="Chiama"
                >
                  <Phone size={18} />
                </a>
              )}
              {isPending && onAccept && (
                <button
                  onClick={onAccept}
                  className="touch-target grid place-items-center rounded-lg text-status-free hover:bg-status-freeBg"
                  aria-label="Accetta richiesta"
                  title="Accetta"
                >
                  <Check size={20} />
                </button>
              )}
              {isPending && onReject && (
                <button
                  onClick={onReject}
                  className="touch-target grid place-items-center rounded-lg text-status-danger hover:bg-status-dangerBg"
                  aria-label="Rifiuta richiesta"
                  title="Rifiuta"
                >
                  <X size={20} />
                </button>
              )}

              {!isFinal && !isPending && onCheckIn && (
                <button
                  onClick={onCheckIn}
                  className="touch-target grid place-items-center rounded-lg text-status-free hover:bg-status-freeBg"
                  aria-label="Presente"
                  title="Segna come presente"
                >
                  <Check size={20} />
                </button>
              )}
              {!isFinal && !isPending && onNoShow && (
                <button
                  onClick={onNoShow}
                  className="touch-target grid place-items-center rounded-lg text-status-danger hover:bg-status-dangerBg"
                  aria-label="Assente"
                  title="Segna come mancata presenza"
                >
                  <UserX size={20} />
                </button>
              )}

              {!isFinal && onEdit && (
                <button
                  onClick={onEdit}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
                  aria-label="Modifica prenotazione"
                  title="Modifica"
                >
                  <Pencil size={16} />
                </button>
              )}

              {!isFinal && !isPending && onCancel && (
                <button
                  onClick={onCancel}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
                  aria-label="Cancella"
                  title="Cancella prenotazione"
                >
                  <X size={18} />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                  aria-label="Elimina definitivamente"
                  title="Elimina definitivamente"
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </div>
        </div>

        {reservation.notes && (
          <div className="flex items-start gap-1.5 border-t border-black/5 bg-bg-subtle px-3 py-2 text-xs text-ink-muted">
            <StickyNote size={13} className="mt-0.5 shrink-0" />
            <span>{reservation.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
