export interface ScheduleException {
  date: string; // YYYY-MM-DD
  is_open: boolean;
}

// Dice se il ristorante è aperto in un giorno specifico, considerando sia
// la chiusura settimanale ricorrente sia le eccezioni puntuali (che hanno
// sempre la precedenza sulla regola generale, in entrambe le direzioni:
// possono chiudere un giorno normalmente aperto o aprirne uno normalmente chiuso).
export function isDateOpen(
  dateStr: string,
  closedWeekdays: number[],
  exceptions: ScheduleException[]
): boolean {
  const exception = exceptions.find((e) => e.date === dateStr);
  if (exception) return exception.is_open;

  const weekday = new Date(dateStr + "T12:00:00").getDay();
  return !closedWeekdays.includes(weekday);
}
