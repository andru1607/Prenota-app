import { Users, Check, UserX, StickyNote, X } from "lucide-react";
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
}

// Card prenotazione: striscia colorata = stato (coerente con TableCard),
// azioni rapide sempre nella stessa posizione a destra.
// Stati finali (completed/no_show/cancelled) nascondono le azioni: la decisione è già presa.
export function ReservationCard({
  reservation,
  onCheckIn,
  onNoShow,
  onCancel,
}: ReservationCardProps) {
  const time = new Date(reservation.reservationTime).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isFinal =
    reservation.status === "completed" ||
    reservation.status === "no_show" ||
    reservation.status === "cancelled";

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex">
        <div className={`w-1.5 ${STATUS_BAR_COLOR[reservation.status]}`} />

        <div className="flex flex-1 items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{reservation.customerName}</p>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-sm text-ink-muted">
              <span className="num-tabular font-medium text-ink">{time}</span>
              <span className="flex items-center gap-1">
                <Users size={14} /> {reservation.partySize}
              </span>
              {isFinal && (
                <span className="text-xs">{STATUS_LABEL[reservation.status]}</span>
              )}
            </div>
          </div>

          {!isFinal && (
            <div className="flex shrink-0 items-center gap-1">
              {onCheckIn && (
                <button
                  onClick={onCheckIn}
                  className="touch-target grid place-items-center rounded-lg text-status-free hover:bg-status-freeBg"
                  aria-label="Presente"
                  title="Segna come presente"
                >
                  <Check size={20} />
                </button>
              )}
              {onNoShow && (
                <button
                  onClick={onNoShow}
                  className="touch-target grid place-items-center rounded-lg text-status-danger hover:bg-status-dangerBg"
                  aria-label="Assente"
                  title="Segna come mancata presenza"
                >
                  <UserX size={20} />
                </button>
              )}
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
                  aria-label="Cancella"
                  title="Cancella prenotazione"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}
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
