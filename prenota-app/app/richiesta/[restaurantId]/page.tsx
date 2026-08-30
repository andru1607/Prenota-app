"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Oswald, IBM_Plex_Mono } from "next/font/google";
import { CalendarCheck, Loader2, CalendarX, MapPin, Phone, Clock, UtensilsCrossed, Ticket } from "lucide-react";
import { isDateOpen, type ScheduleException } from "@/lib/schedule";
import { useLang } from "@/lib/hooks/useLang";
import { LOCALE_BY_LANG } from "@/lib/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

const PAGE_BG = "#1A1310";
const CARD_BG = "#251C17";

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

function TicketPerforation() {
  return (
    <div className="relative py-1">
      <div className="border-t-2 border-dashed border-[#F0E9E0]/15" />
      <span
        className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: PAGE_BG }}
      />
      <span
        className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: PAGE_BG }}
      />
    </div>
  );
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
  const [notes, setNotes] = useState("");
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
          notes: notes.trim(),
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
  const hasInfo = !!(
    branding?.description ||
    branding?.address ||
    branding?.contact_phone ||
    branding?.opening_hours_text
  );
  const hasMenu = menuGroups.length > 0;

  const today = new Date();
  const todayLabel = today
    .toLocaleDateString(LOCALE_BY_LANG[lang], { weekday: "short", day: "numeric", month: "short" })
    .toUpperCase();

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: PAGE_BG }}>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-3 flex justify-center">
          <LanguageSwitcher lang={lang} onChange={setLang} accentColor={color} />
        </div>

        <div
          className="rounded-2xl border border-[#3A2C22]"
          style={{ backgroundColor: CARD_BG, boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
        >
          <div
            className="flex flex-col items-center gap-2 rounded-t-2xl px-6 py-7 text-center"
            style={{ backgroundColor: color }}
          >
            <p className={`${mono.className} text-[11px] tracking-[0.2em] text-white/70`}>
              {todayLabel} · TAVOLO SU RICHIESTA
            </p>
            {branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={branding.logo_url}
                alt={branding.name}
                className="h-16 w-16 rounded-full border-2 border-white/60 object-cover"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-white/60 text-white">
                <Ticket size={24} />
              </div>
            )}
            <h1 className={`${display.className} text-2xl font-semibold uppercase tracking-wide text-white`}>
              {branding?.name || "Ristorante"}
            </h1>
          </div>

          <div className="px-5">
            <TicketPerforation />
          </div>

          {hasInfo && (
            <div className="space-y-3 px-6 py-5">
              {branding?.description && (
                <p className="text-sm leading-relaxed text-[#F0E9E0]">{branding.description}</p>
              )}

              <div className="space-y-2.5">
                {branding?.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(branding.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5"
                  >
                    <MapPin size={15} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className={`${mono.className} text-[10px] uppercase tracking-widest text-[#A69686]`}>
                        Indirizzo
                      </p>
                      <p className="text-sm text-[#F0E9E0] underline decoration-[#F0E9E0]/25 underline-offset-2">
                        {branding.address}
                      </p>
                    </div>
                  </a>
                )}
                {branding?.contact_phone && (
                  <a href={`tel:${branding.contact_phone}`} className="flex items-start gap-2.5">
                    <Phone size={15} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className={`${mono.className} text-[10px] uppercase tracking-widest text-[#A69686]`}>
                        Telefono
                      </p>
                      <p className="text-sm text-[#F0E9E0] underline decoration-[#F0E9E0]/25 underline-offset-2">
                        {branding.contact_phone}
                      </p>
                    </div>
                  </a>
                )}
                {branding?.opening_hours_text && (
                  <div className="flex items-start gap-2.5">
                    <Clock size={15} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className={`${mono.className} text-[10px] uppercase tracking-widest text-[#A69686]`}>
                        Orari
                      </p>
                      <p className="whitespace-pre-line text-sm text-[#F0E9E0]">{branding.opening_hours_text}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasInfo && hasMenu && (
            <div className="px-5">
              <TicketPerforation />
            </div>
          )}

          {hasMenu && (
            <div className="px-6 py-5">
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="touch-target flex w-full items-center justify-between"
              >
                <span className={`${display.className} flex items-center gap-2 text-sm uppercase tracking-wide text-[#F0E9E0]`}>
                  <UtensilsCrossed size={16} style={{ color }} />
                  {t("menu")}
                </span>
                <span
                  className={`${mono.className} text-[11px] font-medium uppercase tracking-widest`}
                  style={{ color }}
                >
                  {showMenu ? t("hideMenu") : t("viewMenu")}
                </span>
              </button>

              {showMenu && (
                <div className="mt-4 space-y-5">
                  {menuGroups.map((group) => (
                    <div key={group.category}>
                      <p
                        className={`${display.className} mb-2 text-xs uppercase tracking-[0.15em]`}
                        style={{ color }}
                      >
                        {group.category}
                      </p>
                      <div className="space-y-2.5">
                        {group.items.map((item) => (
                          <div key={item.id} className="flex items-baseline justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm text-[#F0E9E0]">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-[#A69686]">{item.description}</p>
                              )}
                            </div>
                            {item.price !== null && (
                              <p className={`${mono.className} shrink-0 text-sm text-[#F0E9E0]`}>
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

          <div className="px-5">
            <TicketPerforation />
          </div>

          <div className="px-6 pb-6 pt-5">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{ backgroundColor: color }}
                className={`${display.className} touch-target flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm uppercase tracking-widest text-white shadow-md`}
              >
                <CalendarCheck size={18} />
                {t("bookTable")}
              </button>
            )}

            {showForm && (
              <form onSubmit={handleSubmit}>
                <h2 className={`${display.className} mb-3 text-sm uppercase tracking-wide text-[#F0E9E0]`}>
                  {t("requestReservation")}
                </h2>

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
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("phone")}
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0]"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={time}
                      onChange={(e) => setTime(formatTimeInput(e.target.value))}
                      placeholder={t("timePlaceholder")}
                      inputMode="numeric"
                      maxLength={5}
                      className={`${mono.className} rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none`}
                    />
                    <input
                      type="number"
                      value={partySize}
                      onChange={(e) => setPartySize(e.target.value)}
                      placeholder={t("people")}
                      className={`${mono.className} rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none`}
                    />
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("specialRequests")}
                    rows={2}
                    maxLength={300}
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                </div>

                {!isRestaurantOpen && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-[#D97A63]">
                    <CalendarX size={15} />
                    {t("closedOnThisDate")}
                  </p>
                )}

                {error && <p className="mt-2 text-sm text-[#D97A63]">{error}</p>}

                <button
                  type="submit"
                  disabled={!isValid || isLoading}
                  style={{ backgroundColor: color }}
                  className={`${display.className} touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm uppercase tracking-widest text-white shadow-md disabled:opacity-40`}
                >
                  {isLoading && <Loader2 size={18} className="animate-spin" />}
                  {isLoading ? t("sending") : t("sendRequest")}
                </button>

                <p className="mt-3 text-center text-xs text-[#A69686]">{t("upToSixNote")}</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
