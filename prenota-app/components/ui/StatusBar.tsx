interface StatusBarProps {
  totalCoperti: number;
  tavoliLiberi: number;
  prossimoArrivo?: string; // orario, es. "20:15"
}

// "Termometro" della serata: 3 numeri enormi, zero frasi da leggere.
// Sempre visibile in cima alla Dashboard/Servizio.
export function StatusBar({ totalCoperti, tavoliLiberi, prossimoArrivo }: StatusBarProps) {
  return (
    <div className="grid grid-cols-3 gap-3 border-b border-black/5 bg-white p-4">
      <Stat label="Coperti oggi" value={totalCoperti} />
      <Stat label="Tavoli liberi" value={tavoliLiberi} valueClass="text-status-free" />
      <Stat label="Prossimo arrivo" value={prossimoArrivo ?? "—"} />
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass = "text-ink",
}: {
  label: string;
  value: string | number;
  valueClass?: string;
}) {
  return (
    <div className="text-center">
      <p className={`num-tabular text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}
