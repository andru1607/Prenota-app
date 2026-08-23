"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CalendarCheck, Loader2, CalendarX, MapPin, Phone, Clock, UtensilsCrossed } from "lucide-react";
import { isDateOpen, type ScheduleException } from "@/lib/schedule";
import { useLang } from "@/lib/hooks/useLang";
import { LOCALE_BY_LANG } from "@/lib/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface RestaurantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  closed_weekdays: number[];
  description: string | null;
  address: string | null;
  contact_phone: string | null;
  opening_hours_text: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
}

function todayDateString(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function groupMenuByCategory(items: MenuItem[]): { category: string; items: MenuItem[] }[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const key = item.category?.trim() || "Menu";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups.entries()).map(([category, items]) => ({ category, items }));
}

export default function RichiestaPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;
  const { lang, setLang, t } = useLang();

  const [branding, setBranding] = useState<RestaurantBranding | null>(null);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(todayDateString());
  const [time, setTime] = useState("");
  const [partySize, setPartySize] = useState("");
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/richiesta?restaurantId=${restaurantId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.restaurant) setBranding(body.restaurant);
        if (body?.exceptions) setExceptions(body.exceptions);
        if (body?.menuItems) setMenuItems(body.menuItems);
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
          website,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || t("genericError"));
        return;
      }

      router.push(`/prenotazione/${body.reservationId}`);
    } catch (err) {
      console.error(err);
      setError(t("genericError"));
    } finally {
      setIsLoading(false);
    }
  }

  const menuGroups = groupMenuByCategory(menuItems);

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-3">
          <LanguageSwitcher lang={lang} onChange={setLang} accentColor={color} />
        </div>

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
          <h1 className="text-lg font-semibold text-ink">{branding?.name || "Ristorante"}</h1>
        </div>

        {(branding?.description ||
          branding?.address ||
          branding?.contact_phone ||
          branding?.opening_hours_text) && (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            {branding.description && (
              <p className="mb-3 text-sm text-ink">{branding.description}</p>
            )}

            <div className="space-y-2">
              {branding.address && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(branding.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-sm text-ink-muted"
                >
                  <MapPin size={15} className="mt-0.5 shrink-0" style={{ color }} />
                  <span className="underline">{branding.address}</span>
                </a>
              )}
              {branding.contact_phone && (
                <a
                  href={`tel:${branding.contact_phone}`}
                  className="flex items-center gap-2 text-sm text-ink-muted"
                >
                  <Phone size={15} className="shrink-0" style={{ color }} />
                  <span className="underline">{branding.contact_phone}</span>
                </a>
              )}
              {branding.opening_hours_text && (
                <div className="flex items-start gap-2 text-sm text-ink-muted">
                  <Clock size={15} className="mt-0.5 shrink-0" style={{ color }} />
                  <span className="whitespace-pre-line">{branding.opening_hours_text}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {menuGroups.length > 0 && (
          <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="touch-target flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                <UtensilsCrossed size={16} style={{ color }} />
                {t("menu")}
              </span>
              <span className="text-xs font-medium" style={{ color }}>
                {showMenu ? t("hideMenu") : t("viewMenu")}
              </span>
            </button>

            {showMenu && (
              <div className="mt-3 space-y-4">
                {menuGroups.map((group) => (
                  <div key={group.category}>
                    <p className="mb-1.5 text-xs font-semibold uppercase text-ink-muted">
                      {group.category}
                    </p>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-ink">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-ink-muted">{item.description}</p>
                            )}
                          </div>
                          {item.price !== null && (
                            <p className="num-tabular shrink-0 text-sm font-medium text-ink">
                              €{Number(item.price).toFixed(2)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{ backgroundColor: color }}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white"
          >
            <CalendarCheck size={18} />
            {t("bookTable")}
          </button>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-ink">{t("requestReservation")}</h2>

            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
            />

            <div className="space-y-2">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t("fullName")}
                autoFocus
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phone")}
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
                  placeholder={t("timePlaceholder")}
                  inputMode="numeric"
                  maxLength={5}
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={partySize}
                  onChange={(e) => setPartySize(e.target.value)}
                  placeholder={t("people")}
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {!isRestaurantOpen && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-status-danger">
                <CalendarX size={15} />
                {t("closedOnThisDate")}
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
              {isLoading ? t("sending") : t("sendRequest")}
            </button>

            <p className="mt-3 text-center text-xs text-ink-muted">{t("upToSixNote")}</p>
          </form>
        )}
      </div>
    </div>
  );
}
