import { Clock, User, Bell } from "lucide-react";
import type { RestaurantTable, TableStatus } from "@/types";

const STATUS_STYLES: Record<
  TableStatus,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  free: {
    bg: "bg-[#7C9473]/15",
    border: "border-[#7C9473]/40",
    text: "text-[#7C9473]",
    icon: <User size={20} />,
  },
  occupied: {
    bg: "bg-[#C0503D]/15",
    border: "border-[#C0503D]/40",
    text: "text-[#D97A63]",
    icon: <Clock size={20} />,
  },
  reserved: {
    bg: "bg-[#E3A857]/15",
    border: "border-[#E3A857]/40",
    text: "text-[#E3A857]",
    icon: <Clock size={20} />,
  },
  closed: {
    bg: "bg-[#251C17]",
    border: "border-[#3A2C22]",
    text: "text-[#A69686]",
    icon: <Bell size={20} />,
  },
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
      className={`${sizeClass} ${style.bg} border ${style.border} touch-target rounded-xl p-4 text-left transition active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between">
        <span className={`num-tabular ${style.text} text-2xl font-bold`}>{table.number}</span>
        <span className={style.text}>{style.icon}</span>
      </div>
      <p className="mt-1 text-xs text-[#A69686]">{table.capacity} coperti</p>

      {reservationName && (
        <div className="mt-2 border-t border-[#3A2C22]/60 pt-2">
          <p className="truncate text-sm font-medium text-[#F0E9E0]">{reservationName}</p>
          {reservationTime && (
            <p className="num-tabular text-xs text-[#A69686]">{reservationTime}</p>
          )}
        </div>
      )}
    </button>
  );
}
