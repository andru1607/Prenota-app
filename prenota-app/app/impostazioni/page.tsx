"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, ChevronRight, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ImpostazioniPage() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-ink">Impostazioni</h1>

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

      <p className="mt-4 text-sm text-ink-muted">
        Orari, turni, gestione staff da implementare.
      </p>
    </div>
  );
}
