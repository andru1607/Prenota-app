"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarCheck, Loader2, Check, CalendarX } from "lucide-react";
import { isDateOpen, type ScheduleException } from "@/lib/schedule";

interface RestaurantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  closed_weekdays: number[];
}

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function RichiestaPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;

  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"confirmed" | "pending" | null>(null);

  useEffect(() => {
    fetch(`/api/richiesta?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.restaurant) setBranding(body.restaurant);
        if (body?.exceptions) setExceptions(body.exceptions);
      })
      .catch(() => {});
  }, [restaurantId]);

  const color = branding?.primary_color || "#4F46E5";

  const isRestaurantOpen =
    date && branding
      ? isDateOpen(date, branding.closed_weekdays ?? [], exceptions)
      : true;

  function formatTimeInput(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2);
  }

  const isValid =
    customerName.trim().length > 0 &&
    /^\d{1,2}:\d{2}$/.test(time) &&
    Number(partySize) > 0 &&
    date.length > 0 &&
    isRestaurantOpen;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/richiesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          customerName: customerName.trim(),
          phone: phone.trim(),
          date,
          time,
          partySize: Number(partySize),
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Qualcosa è andato storto. Riprova.");
        return;
      }

      setResult(body.status);
    } catch (err) {
      console.error(err);
      setError("Qualcosa è andato storto. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-status-freeBg text-status-free">
            <Check size={24} />
          </div>
          {result === "confirmed" ? (
            <>
              <h1 className="text-lg font-semibold text-ink">Prenotazione confermata!</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Ti aspettiamo il {date} alle {time} per {partySize} persone.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-ink">Richiesta inviata!</h1>
              <p className="mt-2 text-sm text-ink-muted">
                Per gruppi numerosi il ristorante deve confermare la disponibilità.
                Ti contatteranno al più presto.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          {branding?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logo_url}
              alt={branding.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              <CalendarCheck size={22} />
            </div>
          )}
          <h1 className="text-lg font-semibold text-ink">
            {branding?.name || "Richiedi una prenotazione"}
          </h1>
          {branding?.name && <p className="text-sm text-ink-muted">Richiedi una prenotazione</p>}
        </div>

        <div className="space-y-2">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Nome e cognome"
            autoFocus
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefono"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm text-ink"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={time}
              onChange={(e) => setTime(formatTimeInput(e.target.value))}
              placeholder="Orario (HH:MM)"
              inputMode="numeric"
              maxLength={5}
              className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              placeholder="Persone"
              className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
            />
          </div>
        </div>

        {!isRestaurantOpen && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-status-danger">
            <CalendarX size={15} />
            Il ristorante è chiuso in questa data. Scegli un altro giorno.
          </p>
        )}

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={!isValid || isLoading}
          style={{ backgroundColor: color }}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? "Invio..." : "Invia richiesta"}
        </button>

        <p className="mt-3 text-center text-xs text-ink-muted">
          Fino a 6 persone la prenotazione viene confermata subito. Per gruppi più
          numerosi il ristorante ti contatterà per confermare.
        </p>
      </form>
    </div>
  );
}
