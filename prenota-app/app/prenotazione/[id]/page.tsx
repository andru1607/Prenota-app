"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Check,
  Clock,
  X,
  CalendarCheck,
  CalendarPlus,
  Users,
  MapPin,
  Phone,
  Loader2,
  RefreshCw,
  Pencil,
  CheckCheck,
} from "lucide-react";
import { useLang } from "@/lib/hooks/useLang";
import { LOCALE_BY_LANG } from "@/lib/i18n/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";

interface ReservationInfo {
  id: string;
  customerName: string;
  partySize: number;
  reservationTime: string;
  status: string;
  customerConfirmedAt: string | null;
}

interface RestaurantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  address: string | null;
  contact_phone: string | null;
}

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export default function BadgePrenotazionePage() {
  const params = useParams();
  const reservationId = params.id as string;
  const { lang, setLang, t } = useLang();

  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [showEditForm, setShowEditForm] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPartySize, setEditPartySize] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`);
      if (!res.ok) throw new Error("Prenotazione non trovata");
      const body = await res.json();
      setReservation(body.reservation);
      setRestaurant(body.restaurant);
    } catch (err) {
      console.error(err);
      setError(t("errorLoadReservation"));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  function openEditForm() {
    if (!reservation) return;
    const d = new Date(reservation.reservationTime);
    setEditDate(toDateString(d));
    setEditTime(
      d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    );
    setEditPartySize(String(reservation.partySize));
    setActionError(null);
    setShowEditForm(true);
  }

  async function handleSaveEdit() {
    if (!editDate || !/^\d{1,2}:\d{2}$/.test(editTime) || Number(editPartySize) < 1) return;
    setIsSaving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "modify",
          date: editDate,
          time: editTime,
          partySize: Number(editPartySize),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setActionError(body.error || t("errorSaveEdit"));
        return;
      }
      setShowEditForm(false);
      await load();
    } catch (err) {
      console.error(err);
      setActionError(t("errorSaveEdit"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmAttendance() {
    setIsConfirmingAttendance(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (!res.ok) throw new Error("Errore conferma");
      await load();
    } catch (err) {
      console.error(err);
      setActionError(t("errorConfirm"));
    } finally {
      setIsConfirmingAttendance(false);
    }
  }

  async function handleCancel() {
    if (!confirm(t("confirmCancelPrompt"))) return;
    setIsCancelling(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/prenotazione/${reservationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Errore disdetta");
      await load();
    } catch (err) {
      console.error(err);
      setActionError(t("errorCancel"));
    } finally {
      setIsCancelling(false);
    }
  }

  function handleAddToCalendar() {
    if (!reservation || !restaurant) return;

    const start = new Date(reservation.reservationTime);
    const end = new Date(start.getTime() + 90 * 60000);

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Prenota App//IT",
      "BEGIN:VEVENT",
      `UID:${reservation.id}@prenota-app`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:Prenotazione da ${restaurant.name}`,
      restaurant.address ? `LOCATION:${restaurant.address.replace(/,/g, "\\,")}` : "",
      `DESCRIPTION:Prenotazione per ${reservation.partySize} persone a nome di ${reservation.customerName}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prenotazione.ics";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-status-danger">{error || t("reservationNotFound")}</p>
        </div>
      </div>
    );
  }

  const color = restaurant?.primary_color || "#4F46E5";
  const locale = LOCALE_BY_LANG[lang];
  const date = new Date(reservation.reservationTime);
  const dateLabel = date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timeLabel = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const isConfirmed = reservation.status === "confirmed";
  const isPending = reservation.status === "pending";
  const isCancelled = reservation.status === "cancelled";
  const canManage = isConfirmed || isPending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-3">
          <LanguageSwitcher lang={lang} onChange={setLang} accentColor={color} />
        </div>

        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          {restaurant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-full"
              style={{ backgroundColor: color + "20", color }}
            >
              <CalendarCheck size={22} />
            </div>
          )}
          <p className="text-sm font-medium text-ink-muted">{restaurant?.name}</p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div
            className="flex flex-col items-center gap-2 py-6 text-center text-white"
            style={{ backgroundColor: isCancelled ? "#71717A" : isPending ? "#D97706" : color }}
          >
            {isConfirmed && <Check size={32} />}
            {isPending && <Clock size={32} />}
            {isCancelled && <X size={32} />}
            <p className="text-lg font-semibold">
              {isConfirmed && t("statusConfirmed")}
              {isPending && t("statusPending")}
              {isCancelled && t("statusCancelled")}
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-0 right-0 top-0 border-t-2 border-dashed border-black/10" />
          </div>

          <div className="space-y-3 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("labelName")}</span>
              <span className="text-sm font-medium text-ink">{reservation.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("labelDate")}</span>
              <span className="text-sm font-medium capitalize text-ink">{dateLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-muted">{t("labelTime")}</span>
              <span className="num-tabular text-sm font-medium text-ink">{timeLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-sm text-ink-muted">
                <Users size={14} /> {t("labelPeople")}
              </span>
              <span className="num-tabular text-sm font-medium text-ink">
                {reservation.partySize}
              </span>
            </div>

            {(restaurant?.address || restaurant?.contact_phone) && (
              <div className="space-y-2 border-t border-black/5 pt-3">
                {restaurant.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-ink-muted">{t("labelAddress")}</p>
                      <p className="text-sm text-ink underline decoration-black/20 underline-offset-2">
                        {restaurant.address}
                      </p>
                    </div>
                  </a>
                )}
                {restaurant.contact_phone && (
                  <a href={`tel:${restaurant.contact_phone}`} className="flex items-start gap-2">
                    <Phone size={14} className="mt-0.5 shrink-0" style={{ color }} />
                    <div className="min-w-0">
                      <p className="text-[11px] text-ink-muted">{t("labelPhone")}</p>
                      <p className="text-sm text-ink underline decoration-black/20 underline-offset-2">
                        {restaurant.contact_phone}
                      </p>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {(isConfirmed || isPending) && !showEditForm && (
          <button
            onClick={handleAddToCalendar}
            className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink-muted"
          >
            <CalendarPlus size={15} />
            {t("addToCalendar")}
          </button>
        )}

        {isConfirmed && !showEditForm && (
          <>
            {reservation.customerConfirmedAt ? (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-status-freeBg px-4 py-3 text-sm font-medium text-status-free">
                <CheckCheck size={16} />
                {t("youConfirmedAttendance")}
              </div>
            ) : (
              <div className="mt-3">
                <button
                  onClick={handleConfirmAttendance}
                  disabled={isConfirmingAttendance}
                  className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-status-free py-3 text-sm font-medium text-white disabled:opacity-50"
                >
                  {isConfirmingAttendance ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCheck size={16} />
                  )}
                  {t("confirmAttendanceBtn")}
                </button>
                <p className="mt-2 text-center text-xs text-ink-muted">{t("letRestaurantKnow")}</p>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-ink-muted">{t("showAtArrival")}</p>
          </>
        )}
        {isPending && !showEditForm && (
          <p className="mt-3 text-center text-xs text-ink-muted">{t("pendingNote")}</p>
        )}

        {canManage && showEditForm && (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-semibold text-ink">{t("editReservation")}</p>
            <div className="space-y-2">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm text-ink"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editTime}
                  onChange={(e) => setEditTime(formatTimeInput(e.target.value))}
                  placeholder={t("timePlaceholder")}
                  inputMode="numeric"
                  maxLength={5}
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  value={editPartySize}
                  onChange={(e) => setEditPartySize(e.target.value)}
                  placeholder={t("people")}
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            {actionError && (
              <p className="mt-2 text-xs text-status-danger">{actionError}</p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setShowEditForm(false)}
                disabled={isSaving}
                className="touch-target flex-1 rounded-xl border border-black/10 text-sm font-medium text-ink-muted disabled:opacity-40"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                style={{ backgroundColor: color }}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl text-sm font-medium text-white disabled:opacity-50"
              >
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {t("save")}
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-ink-muted">{t("over6Note")}</p>
          </div>
        )}

        {canManage && !showEditForm && (
          <div className="mt-4 space-y-2">
            <button
              onClick={openEditForm}
              style={{ backgroundColor: color }}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white"
            >
              <Pencil size={15} />
              {t("editReservation")}
            </button>
            <button
              onClick={load}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-2.5 text-sm font-medium text-ink-muted"
            >
              <RefreshCw size={15} />
              {t("refreshStatus")}
            </button>
            {actionError && (
              <p className="text-center text-xs text-status-danger">{actionError}</p>
            )}
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-status-danger disabled:opacity-50"
            >
              {isCancelling && <Loader2 size={15} className="animate-spin" />}
              {t("cancelReservationBtn")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
