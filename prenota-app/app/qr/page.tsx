"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Oswald, IBM_Plex_Mono } from "next/font/google";
import { ArrowLeft, Printer, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const display = Oswald({ subsets: ["latin"], weight: ["500", "600", "700"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"] });

const PAGE_BG = "#EEEEE9";

interface Branding {
  name: string;
  logo_url: string | null;
  primary_color: string;
}

function TicketPerforation() {
  return (
    <div className="relative py-1">
      <div className="border-t-2 border-dashed border-black/15" />
      <span
        className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full print:hidden"
        style={{ backgroundColor: PAGE_BG }}
      />
      <span
        className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full print:hidden"
        style={{ backgroundColor: PAGE_BG }}
      />
    </div>
  );
}

export default function QrPage() {
  const router = useRouter();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
      setLink(`${window.location.origin}/richiesta/${staffRow.restaurant_id}`);

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("name, logo_url, primary_color")
        .eq("id", staffRow.restaurant_id)
        .single();

      if (restaurant) setBranding(restaurant);
      setIsLoading(false);
    }
    load();
  }, []);

  const color = branding?.primary_color || "#4F46E5";
  const qrImageUrl = link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(link)}`
    : null;

  return (
    <div className="min-h-screen p-4 print:p-0" style={{ backgroundColor: PAGE_BG }}>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-4 flex items-center gap-2 print:hidden">
          <button
            onClick={() => router.push("/impostazioni")}
            className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-black/5"
            aria-label="Indietro"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-ink">QR per i clienti</h1>
          {link && (
            <button
              onClick={() => window.print()}
              className="touch-target flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: color }}
            >
              <Printer size={16} />
              Stampa
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="animate-pulse rounded-2xl bg-white/60" style={{ height: 520 }} />
        ) : !link ? (
          <p className="text-center text-sm text-ink-muted">Non sono riuscito a caricare il QR.</p>
        ) : (
          <div
            className="rounded-2xl bg-white shadow-lg print:shadow-none"
            style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.08)" }}
          >
            <div
              className="flex flex-col items-center gap-2 rounded-t-2xl px-6 py-7 text-center print:rounded-none"
              style={{ backgroundColor: color }}
            >
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

            <div className="flex flex-col items-center gap-4 px-6 py-8">
              <p className={`${display.className} text-center text-base uppercase tracking-wide text-ink`}>
                Scansiona per prenotare
              </p>

              <div
                className="rounded-2xl border-4 p-3"
                style={{ borderColor: color }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl!} alt="QR code prenotazioni" className="h-56 w-56" />
              </div>

              <p className={`${mono.className} text-center text-[11px] uppercase tracking-widest text-ink-muted`}>
                oppure vai su
              </p>
              <p className={`${mono.className} break-all text-center text-xs text-ink`}>{link}</p>
            </div>

            <div className="px-5">
              <TicketPerforation />
            </div>

            <div className="px-6 pb-6 pt-4 text-center">
              <p className="text-xs text-ink-muted">
                Stampa questa pagina e mettila bene in vista sui tavoli o all'ingresso.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
