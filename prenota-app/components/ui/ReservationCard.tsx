"use client";

import { Users, Check, UserX, StickyNote, X, Trash2, Pencil, Phone, RotateCcw, CheckCheck } from "lucide-react";
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

interface ReservationCardProps {
  reservation: Reservation;
  onCheckIn?: () => void;
  onNoShow?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: () => void;
  onRestore?: () => void;
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
  onRestore,
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

  return (
    <div className="animate-fade-in overflow-hidden rounded-xl bg-white shadow-sm">
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
              {reservation.status === "confirmed" &&
                (reservation.customerConfirmedAt ? (
                  <span className="flex items-center gap-1 rounded-full bg-status-freeBg px-1.5 py-0.5 text-[10px] font-medium text-status-free">
                    <CheckCheck size={11} />
                    Confermata dal cliente
                  </span>
                ) : (
                  <span className="rounded-full bg-bg-subtle px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    Non confermata
                  </span>
                ))}
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
            {isFinal &&
              (reservation.status === "completed" || reservation.status === "no_show") &&
              onRestore && (
                <button
                  onClick={onRestore}
                  className="touch-target grid place-items-center rounded-lg text-primary hover:bg-primary-light"
                  aria-label="Ripristina prenotazione"
                  title="Segnato per errore? Riporta a confermata"
                >
                  <RotateCcw size={17} />
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
  );
}
