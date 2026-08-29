"use client";

import { Users, Check, UserX, StickyNote, X, Trash2, Pencil, Phone, RotateCcw, CheckCheck } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/types";

const STATUS_BAR_COLOR: Record<ReservationStatus, string> = {
  confirmed: "bg-[#7C9473]",
  pending: "bg-[#E3A857]",
  late: "bg-[#C0503D]",
  cancelled: "bg-[#5C4E42]",
  completed: "bg-[#7C9473]",
  no_show: "bg-[#C0503D]",
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
    <div className="animate-fade-in overflow-hidden rounded-xl border border-[#3A2C22] bg-[#251C17]">
      <div className="flex">
        <div className={`w-1.5 ${STATUS_BAR_COLOR[reservation.status]}`} />

        <div className="flex flex-1 items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-[#F0E9E0]">{reservation.customerName}</p>
              {reservation.source === "public" && (
                <span className="shrink-0 rounded-full border border-[#C17F45]/30 bg-[#C17F45]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#C17F45]">
                  Richiesta cliente
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-sm text-[#A69686]">
              <span className="num-tabular font-medium text-[#F0E9E0]">{time}</span>
              <span className="flex items-center gap-1">
                <Users size={14} /> {reservation.partySize}
              </span>
              {tableNumber && (
                <span className="rounded border border-[#3A2C22] bg-[#1A1310] px-1.5 py-0.5 text-xs font-medium text-[#A69686]">
                  Tavolo {tableNumber}
                </span>
              )}
              {reservation.source === "public" &&
                reservation.status === "confirmed" &&
                (reservation.customerConfirmedAt ? (
                  <span className="flex items-center gap-1 rounded-full border border-[#7C9473]/30 bg-[#7C9473]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#7C9473]">
                    <CheckCheck size={11} />
                    Confermata dal cliente
                  </span>
                ) : (
                  <span className="rounded-full border border-[#3A2C22] bg-[#1A1310] px-1.5 py-0.5 text-[10px] font-medium text-[#A69686]">
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
                className="touch-target grid place-items-center rounded-lg text-[#C17F45] hover:bg-[#C17F45]/15"
                aria-label={`Chiama ${reservation.customerName}`}
                title="Chiama"
              >
                <Phone size={18} />
              </a>
            )}
            {isPending && onAccept && (
              <button
                onClick={onAccept}
                className="touch-target grid place-items-center rounded-lg text-[#7C9473] hover:bg-[#7C9473]/15"
                aria-label="Accetta richiesta"
                title="Accetta"
              >
                <Check size={20} />
              </button>
            )}
            {isPending && onReject && (
              <button
                onClick={onReject}
                className="touch-target grid place-items-center rounded-lg text-[#D97A63] hover:bg-[#C0503D]/15"
                aria-label="Rifiuta richiesta"
                title="Rifiuta"
              >
                <X size={20} />
              </button>
            )}

            {!isFinal && !isPending && onCheckIn && (
              <button
                onClick={onCheckIn}
                className="touch-target grid place-items-center rounded-lg text-[#7C9473] hover:bg-[#7C9473]/15"
                aria-label="Presente"
                title="Segna come presente"
              >
                <Check size={20} />
              </button>
            )}
            {!isFinal && !isPending && onNoShow && (
              <button
                onClick={onNoShow}
                className="touch-target grid place-items-center rounded-lg text-[#D97A63] hover:bg-[#C0503D]/15"
                aria-label="Assente"
                title="Segna come mancata presenza"
              >
                <UserX size={20} />
              </button>
            )}

            {!isFinal && onEdit && (
              <button
                onClick={onEdit}
                className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#1A1310]"
                aria-label="Modifica prenotazione"
                title="Modifica"
              >
                <Pencil size={16} />
              </button>
            )}

            {!isFinal && !isPending && onCancel && (
              <button
                onClick={onCancel}
                className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#1A1310]"
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
                  className="touch-target grid place-items-center rounded-lg text-[#C17F45] hover:bg-[#C17F45]/15"
                  aria-label="Ripristina prenotazione"
                  title="Segnato per errore? Riporta a confermata"
                >
                  <RotateCcw size={17} />
                </button>
              )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#C0503D]/15 hover:text-[#D97A63]"
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
        <div className="flex items-start gap-1.5 border-t border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-xs text-[#A69686]">
          <StickyNote size={13} className="mt-0.5 shrink-0" />
          <span>{reservation.notes}</span>
        </div>
      )}
    </div>
  );
}
