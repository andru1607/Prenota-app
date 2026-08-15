// Stato di una prenotazione — la codifica colori nell'UI si basa SEMPRE su questi valori
export type ReservationStatus =
  | "confirmed"   // verde — confermata
  | "pending"     // ambra — da confermare / in attesa
  | "late"        // ambra/rosso — in ritardo rispetto all'orario
  | "cancelled";  // rosso — cancellata

export type TableStatus = "free" | "occupied" | "reserved" | "closed";

export interface RestaurantTable {
  id: string;
  number: string;       // es. "12" o "T12"
  capacity: number;      // numero coperti max
  status: TableStatus;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  notes?: string;        // es. allergie, preferenze
  isRegular: boolean;    // cliente abituale
  reservationCount: number;
}

export interface Reservation {
  id: string;
  customerName: string;
  phone?: string;
  partySize: number;
  reservationTime: string; // ISO datetime
  status: ReservationStatus;
  tableId?: string;
  notes?: string;
  source: "manual" | "photo"; // "photo" = importata da foto agenda
  createdAt: string;
}

// Risultato grezzo estratto da una foto dell'agenda, PRIMA della conferma dello staff
export interface ParsedReservationDraft {
  customerName: string;
  partySize: number | null;
  reservationTime: string | null; // orario letto, es. "20:30" — da normalizzare
  notes?: string;
  confidence: "high" | "medium" | "low"; // quanto il modello è sicuro della lettura
}
