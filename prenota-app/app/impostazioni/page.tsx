"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronRight, LogOut, QrCode, Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ImpostazioniPage() {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadLink() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("staff")
        .select("restaurant_id")
        .eq("auth_user_id", user.id)
        .single();

      if (data?.restaurant_id) {
        setLink(`${window.location.origin}/richiesta/${data.restaurant_id}`);
      }
    }
    loadLink();
  }, []);

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
