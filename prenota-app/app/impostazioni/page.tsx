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
  Share,
  PlusSquare,
  UtensilsCrossed,
  CalendarX,
  User,
  Users,
  MessageCircleQuestion,
  Martini,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyRole, getMyStaffRow } from "@/lib/roles";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 mt-1 text-xs font-semibold uppercase tracking-wide text-[#A69686]">{children}</p>;
}

export default function ImpostazioniPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<"ristorante" | "bar">("ristorante");
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
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const isBar = businessType === "bar";

  useEffect(() => {
    const ua = navigator.userAgent;
    const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && "ontouchend" in document);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsIOS(iOS);
    setIsStandalone(standalone);

    async function checkPushStatus() {
      // Su iPhone/iPad, il Push API non esiste proprio finché l'app non è
      // aperta dall'icona sulla schermata Home: mostriamo le istruzioni
      // invece di provare ad attivarlo.
      if (iOS && !standalone) return;
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
      const staffRow = await getMyStaffRow();
      if (!staffRow) return;

      setRestaurantId(staffRow.restaurantId);
      setLink(`${window.location.origin}/richiesta/${staffRow.restaurantId}`);

      const supabase = createClient();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, logo_url, primary_color, business_type")
        .eq("id", staffRow.restaurantId)
        .single();

      if (restaurant) {
        setName(restaurant.name ?? "");
        setLogoUrl(restaurant.logo_url ?? null);
        setPrimaryColor(restaurant.primary_color ?? "#4F46E5");
        setBusinessType(restaurant.business_type === "bar" ? "bar" : "ristorante");
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
    <div className="min-h-screen bg-[#1A1310] p-4">
      <h1 className="mb-4 text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Impostazioni</h1>

      <SectionLabel>Account</SectionLabel>
      <Link
        href="/profilo"
        className="touch-target mb-2 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
            <User size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#F0E9E0]">Profilo</p>
            <p className="text-xs text-[#A69686]">Nome, ristorante, email e password</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-[#A69686]" />
      </Link>

      {isAdmin && (
        <Link
          href="/staff"
          className="touch-target mb-4 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
              <Users size={18} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#F0E9E0]">Team</p>
              <p className="text-xs text-[#A69686]">Aggiungi collaboratori con accesso al ristorante</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#A69686]" />
        </Link>
      )}

      {isAdmin && (
        <>
          <SectionLabel>Il tuo locale</SectionLabel>

          <div className="mb-2 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
            <p className="mb-3 text-sm font-medium text-[#F0E9E0]">
              {isBar ? "Personalizza il tuo locale" : "Personalizza la pagina prenotazioni"}
            </p>

            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => logoInputRef.current?.click()}
                className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-[#3A2C22] bg-[#1A1310]"
              >
                {logoPreview || logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview ?? logoUrl ?? ""} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={22} className="text-[#A69686]" />
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
                  className="touch-target rounded-lg border border-[#3A2C22] px-3 py-2 text-xs font-medium text-[#A69686]"
                >
                  Scegli foto del logo
                </button>
              </div>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isBar ? "Nome del bar" : "Nome del ristorante"}
              className="mb-2 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />

            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm text-[#A69686]">Colore principale</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded-lg border border-[#3A2C22]"
              />
            </div>

            {error && <p className="mb-2 text-sm text-[#D97A63]">{error}</p>}

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-50"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {saved ? "Salvato!" : isSaving ? "Salvo..." : "Salva personalizzazione"}
            </button>
          </div>

          {isBar && (
            <Link
              href="/impostazioni/dosatore"
              className="touch-target mb-2 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                  <Martini size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0E9E0]">Dosatore</p>
                  <p className="text-xs text-[#A69686]">Misure del lato piccolo e del lato grande</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#A69686]" />
            </Link>
          )}

          {link && !isBar && (
            <div className="mb-2 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
              <div className="mb-2 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                  <QrCode size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0E9E0]">Link prenotazioni clienti</p>
                  <p className="text-xs text-[#A69686]">
                    Genera un QR code da questo link e stampalo per il locale
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-2">
                <p className="min-w-0 flex-1 truncate text-xs text-[#A69686]">{link}</p>
                <button
                  onClick={handleCopy}
                  className="touch-target grid shrink-0 place-items-center rounded-lg text-[#C17F45]"
                  aria-label="Copia link"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button
                onClick={() => router.push("/qr")}
                className="mt-2 block w-full text-center text-xs font-medium text-[#C17F45]"
              >
                Vedi e stampa il QR code
              </button>
            </div>
          )}

          {!isBar && (
            <Link
              href="/vetrina"
              className="touch-target mb-2 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                  <UtensilsCrossed size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0E9E0]">Vetrina pubblica</p>
                  <p className="text-xs text-[#A69686]">Descrizione, indirizzo, orari e menu per i clienti</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#A69686]" />
            </Link>
          )}

          <Link
            href="/orari"
            className="touch-target mb-4 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                <CalendarX size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#F0E9E0]">Orari e chiusure</p>
                <p className="text-xs text-[#A69686]">Giorni di chiusura settimanali ed eccezioni</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#A69686]" />
          </Link>
        </>
      )}

      {!isBar && isIOS && !isStandalone && (
        <>
          <SectionLabel>Notifiche</SectionLabel>
          <div className="mb-4 rounded-2xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-[#E3A857]/40 bg-[#1A1310] text-[#E3A857]">
                <BellOff size={18} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#F0E9E0]">Notifiche push</p>
                <p className="text-xs text-[#A69686]">
                  Su iPhone vanno prima attivate aggiungendo l'app alla schermata Home
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[#F0E9E0]">
              <p className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#3A2C22] bg-[#1A1310] text-xs text-[#A69686]">
                  1
                </span>
                Tocca <Share size={14} className="inline text-[#C17F45]" /> Condividi in Safari
              </p>
              <p className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#3A2C22] bg-[#1A1310] text-xs text-[#A69686]">
                  2
                </span>
                Scegli <PlusSquare size={14} className="inline text-[#C17F45]" /> "Aggiungi alla schermata Home"
              </p>
              <p className="flex items-center gap-2">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-[#3A2C22] bg-[#1A1310] text-xs text-[#A69686]">
                  3
                </span>
                Apri Prenota dall'icona appena creata, poi torna qui
              </p>
            </div>
          </div>
        </>
      )}

      {pushSupported && !isBar && (
        <>
          {!(isIOS && !isStandalone) && <SectionLabel>Notifiche</SectionLabel>}
          <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
            <div className="mb-2 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                {pushEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#F0E9E0]">Notifiche push</p>
                <p className="text-xs text-[#A69686]">
                  Ricevi un avviso sul telefono quando arriva una nuova richiesta di prenotazione
                </p>
              </div>
            </div>

            {pushError && <p className="mb-2 text-sm text-[#D97A63]">{pushError}</p>}

            <button
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`touch-target flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium disabled:opacity-50 ${
                pushEnabled
                  ? "border border-[#3A2C22] text-[#A69686]"
                  : "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
              }`}
            >
              {pushLoading && <Loader2 size={16} className="animate-spin" />}
              {pushEnabled ? "Disattiva notifiche" : "Attiva notifiche"}
            </button>
          </div>
        </>
      )}

      {isAdmin && (
        <>
          <SectionLabel>Dati e supporto</SectionLabel>
          {!isBar && (
            <Link
              href="/statistiche"
              className="touch-target mb-2 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                  <BarChart3 size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#F0E9E0]">Statistiche</p>
                  <p className="text-xs text-[#A69686]">Coperti nel tempo, giorni più pieni</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#A69686]" />
            </Link>
          )}

          <Link
            href="/assistente"
            className="touch-target mb-4 flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
                <MessageCircleQuestion size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#F0E9E0]">Assistente</p>
                <p className="text-xs text-[#A69686]">Cosa chiede lo staff, per migliorare le risposte</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#A69686]" />
          </Link>
        </>
      )}

      <button
        onClick={handleLogout}
        className="touch-target flex w-full items-center gap-3 rounded-xl border border-[#3A2C22] bg-[#251C17] p-4"
      >
        <div className="grid h-9 w-9 place-items-center rounded-full border border-[#C0503D]/40 bg-[#C0503D]/15 text-[#D97A63]">
          <LogOut size={18} />
        </div>
        <p className="text-sm font-medium text-[#D97A63]">Esci</p>
      </button>
    </div>
  );
}
