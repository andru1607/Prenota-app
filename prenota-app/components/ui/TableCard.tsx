import { Clock, User, Bell } from "lucide-react";
import type { RestaurantTable, TableStatus } from "@/types";

const STATUS_STYLES: Record<
  TableStatus,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  free: { bg: "bg-status-freeBg", text: "text-status-free", icon: <User size={20} /> },
  occupied: { bg: "bg-status-pendingBg", text: "text-status-pending", icon: <Clock size={20} /> },
  reserved: { bg: "bg-primary-light", text: "text-primary", icon: <Clock size={20} /> },
  closed: { bg: "bg-status-closedBg", text: "text-status-closed", icon: <Bell size={20} /> },
};

interface TableCardProps {
  table: RestaurantTable;
  reservationName?: string;
  reservationTime?: string;
  onClick?: () => void;
}

// Card tavolo: dimensione proporzionale alla capienza, colore pieno secondo stato.
// Obiettivo: leggibile a colpo d'occhio, zero lettura di testo necessaria per capire lo stato.
export function TableCard({ table, reservationName, reservationTime, onClick }: TableCardProps) {
  const style = STATUS_STYLES[table.status];
  // Card più larga per tavoli grandi (6-8 coperti), più compatta per tavoli piccoli (2)
  const sizeClass = table.capacity >= 6 ? "col-span-2" : "col-span-1";

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} ${style.bg} touch-target rounded-xl p-4 text-left transition active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between">
        <span className={`${style.text} text-2xl font-bold`}>{table.number}</span>
        <span className={style.text}>{style.icon}</span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">{table.capacity} coperti</p>

      {reservationName && (
        <div className="mt-2 border-t border-black/5 pt-2">
          <p className="truncate text-sm font-medium text-ink">{reservationName}</p>
          {reservationTime && (
            <p className="num-tabular text-xs text-ink-muted">{reservationTime}</p>
          )}
        </div>
      )}
    </button>
  );
}
