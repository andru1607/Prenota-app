import { Users, Check, Pencil, X, Camera } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/types";

const STATUS_BAR_COLOR: Record<ReservationStatus, string> = {
  confirmed: "bg-status-free",
  pending: "bg-status-pending",
  late: "bg-status-danger",
  cancelled: "bg-status-closed",
};

interface ReservationCardProps {
  reservation: Reservation;
  onCheckIn?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
}

// Card prenotazione: striscia colorata = stato (coerente con TableCard),
// azioni rapide sempre nella stessa posizione a destra.
export function ReservationCard({
  reservation,
  onCheckIn,
  onEdit,
  onCancel,
}: ReservationCardProps) {
  const time = new Date(reservation.reservationTime).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex overflow-hidden rounded-xl bg-white shadow-sm">
      <div className={`w-1.5 ${STATUS_BAR_COLOR[reservation.status]}`} />

      <div className="flex flex-1 items-center justify-between p-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-ink">{reservation.customerName}</p>
            {reservation.source === "photo" && (
              <span title="Importata da foto agenda">
                <Camera size={14} className="shrink-0 text-ink-muted" />
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-ink-muted">
            <span className="num-tabular">{time}</span>
            <span className="flex items-center gap-1">
              <Users size={14} /> {reservation.partySize}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onCheckIn && (
            <button
              onClick={onCheckIn}
              className="touch-target grid place-items-center rounded-lg text-status-free hover:bg-status-freeBg"
              aria-label="Check-in"
            >
              <Check size={20} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
              aria-label="Modifica"
            >
              <Pencil size={18} />
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="touch-target grid place-items-center rounded-lg text-status-danger hover:bg-status-dangerBg"
              aria-label="Cancella"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
