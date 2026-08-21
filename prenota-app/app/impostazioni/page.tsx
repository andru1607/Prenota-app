"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  LogOut,
  QrCode,
  Copy,
  Check,
  Image as ImageIcon,
  Loader2,
  Bell,
  BellOff,
  UtensilsCrossed,
  CalendarX,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyRole } from "@/lib/roles";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function ImpostazioniPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    async function checkPushStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
      setPushSupported(true);

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setPushEnabled(!!existing);
    }
    checkPushStatus();
  }, []);

  async function handleTogglePush() {
    setPushError(null);
    setPushLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;

      if (pushEnabled) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushError("Permesso negato. Puoi attivarlo dalle impostazioni del telefono.");
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
          ),
        });

        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });

        if (!res.ok) throw new Error("Errore attivazione");
        setPushEnabled(true);
      }
    } catch (err) {
      console.error(err);
      setPushError("Non sono riuscito ad attivare le notifiche. Riprova.");
    } finally {
      setPushLoading(false);
    }
  }

  useEffect(() => {
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, []);

  useEffect(() => {
    async function loadRestaurant() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffRow } = await supabase
        .from("staff")
        .select("restaurant_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!staffRow?.restaurant_id) return;

      setRestaurantId(staffRow.restaurant_id);
      setLink(`${window.location.origin}/richiesta/${staffRow.restaurant_id}`);

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, logo_url, primary_color")
        .eq("id", staffRow.restaurant_id)
        .single();

      if (restaurant) {
        setName(restaurant.name ?? "");
        setLogoUrl(restaurant.logo_url ?? null);
        setPrimaryColor(restaurant.primary_color ?? "#4F46E5");
      }
    }
    loadRestaurant();
  }, []);

  function handleLogoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!restaurantId) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const supabase = createClient();
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const ext = logoFile.name.split(".").pop() || "jpg";
        const path = `${restaurantId}/logo.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("logos")
          .upload(path, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from("logos").getPublicUrl(path);
        finalLogoUrl = publicUrlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ name, primary_color: primaryColor, logo_url: finalLogoUrl })
        .eq("id", restaurantId);

      if (updateError) throw updateError;

      setLogoUrl(finalLogoUrl);
      setLogoFile(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare le modifiche. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-ink">Impostazioni</h1>

      <Link
        href="/profilo"
        className="touch-target mb-3 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
            <User size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Profilo</p>
            <p className="text-xs text-ink-muted">Nome, ristorante, email e password</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </Link>

      {isAdmin && (
      <Link
        href="/staff"
        className="touch-target mb-3 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
            <Users size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Team</p>
            <p className="text-xs text-ink-muted">Aggiungi collaboratori con accesso al ristorante</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </Link>
      )}

      {isAdmin && (
      <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-ink">Personalizza la pagina prenotazioni</p>

        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-black/20 bg-bg-subtle"
          >
            {logoPreview || logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview ?? logoUrl ?? ""} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={22} className="text-ink-muted" />
            )}
          </button>
          <div className="flex-1">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoSelected}
            />
            <button
              onClick={() => logoInputRef.current?.click()}
              className="touch-target rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink-muted"
            >
              Scegli foto del logo
            </button>
          </div>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome del ristorante"
          className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-ink-muted">Colore principale</span>
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-lg border border-black/10"
          />
        </div>

        {error && <p className="mb-2 text-sm text-status-danger">{error}</p>}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving && <Loader2 size={16} className="animate-spin" />}
          {saved ? "Salvato!" : isSaving ? "Salvo..." : "Salva personalizzazione"}
        </button>
      </div>
      )}

      {link && (
        <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
          <div className="mb-2 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
              <QrCode size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">Link prenotazioni clienti</p>
              <p className="text-xs text-ink-muted">
                Genera un QR code da questo link e stampalo per il locale
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-bg-subtle p-2">
            <p className="flex-1 truncate text-xs text-ink-muted">{link}</p>
            <button
              onClick={handleCopy}
              className="touch-target grid place-items-center rounded-lg text-primary"
              aria-label="Copia link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
              link
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center text-xs font-medium text-primary"
          >
            Genera QR code da stampare
          </a>
        </div>
      )}

      {pushSupported && (
        <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
          <div className="mb-2 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
              {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">Notifiche push</p>
              <p className="text-xs text-ink-muted">
                Ricevi un avviso sul telefono quando arriva una nuova richiesta di prenotazione
              </p>
            </div>
          </div>

          {pushError && <p className="mb-2 text-sm text-status-danger">{pushError}</p>}

          <button
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`touch-target flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 ${
              pushEnabled
                ? "border border-black/10 text-ink-muted"
                : "bg-primary text-white"
            }`}
          >
            {pushLoading && <Loader2 size={16} className="animate-spin" />}
            {pushEnabled ? "Disattiva notifiche" : "Attiva notifiche"}
          </button>
        </div>
      )}

      {isAdmin && (
      <>
      <Link
        href="/vetrina"
        className="touch-target mb-3 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
            <UtensilsCrossed size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Vetrina pubblica</p>
            <p className="text-xs text-ink-muted">Descrizione, indirizzo, orari e menu per i clienti</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </Link>

      <Link
        href="/orari"
        className="touch-target mb-3 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
            <CalendarX size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Orari e chiusure</p>
            <p className="text-xs text-ink-muted">Giorni di chiusura settimanali ed eccezioni</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </Link>
      </>
      )}

      {isAdmin && (
      <Link
        href="/statistiche"
        className="touch-target mb-3 flex items-center justify-between rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-light text-primary">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Statistiche</p>
            <p className="text-xs text-ink-muted">Coperti nel tempo, giorni più pieni</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-ink-muted" />
      </Link>
      )}

      <button
        onClick={handleLogout}
        className="touch-target flex w-full items-center gap-3 rounded-xl border border-black/5 bg-white p-4"
      >
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-status-dangerBg text-status-danger">
          <LogOut size={18} />
        </div>
        <p className="text-sm font-medium text-status-danger">Esci</p>
      </button>
    </div>
  );
}
