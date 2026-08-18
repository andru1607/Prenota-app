export type ReservationStatus =
  | "confirmed"
  | "pending"
  | "late"
  | "cancelled"
  | "completed"
  | "no_show";

export type TableStatus = "free" | "occupied" | "reserved" | "closed";

export interface RestaurantTable {
  id: string;
  number: string;
  capacity: number;
  status: TableStatus;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  isRegular: boolean;
  reservationCount: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone?: string;
  partySize: number;
  reservationTime: string;
  status: ReservationStatus;
  tableId?: string;
  notes?: string;
  source: "manual" | "photo" | "public";
  createdAt: string;
}

export interface ParsedReservationDraft {
  customerName: string;
  partySize: number | null;
  reservationTime: string | null;
  notes?: string;
  confidence: "high" | "medium" | "low";
}
