"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Martini, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";

export default function DosatoreSettingsPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [latoPiccolo, setLatoPiccolo] = useState("");
  const [latoGrande, setLatoGrande] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) {
        setIsLoading(false);
        return;
      }
      setRestaurantId(staffRow.restaurantId);

      const supabase = createClient();
      const { data } = await supabase
        .from("restaurants")
        .select("dosatore_lato_piccolo_ml, dosatore_lato_grande_ml")
        .eq("id", staffRow.restaurantId)
        .single();

      setLatoPiccolo(data?.dosatore_lato_piccolo_ml != null ? String(data.dosatore_lato_piccolo_ml) : "");
      setLatoGrande(data?.dosatore_lato_grande_ml != null ? String(data.dosatore_lato_grande_ml) : "");
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!restaurantId) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          dosatore_lato_piccolo_ml: latoPiccolo === "" ? null : Number(latoPiccolo),
          dosatore_lato_grande_ml: latoGrande === "" ? null : Number(latoGrande),
        })
        .eq("id", restaurantId);

      if (updateError) throw updateError;
      setSaved(true);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16 text-ink-muted">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <Link href="/impostazioni" className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted">
        <ArrowLeft size={14} />
        Impostazioni
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
          <Martini size={22} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">Dosatore</h1>
          <p className="text-xs text-ink-muted">Il dosatore fisico a doppia misura del tuo bar</p>
        </div>
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 text-sm text-ink-muted">
          Inserisci quanti ml versa ciascun lato del tuo dosatore. Le dosi delle ricette verranno
          mostrate anche come numero di dosatori, oltre che in ml.
        </p>

        <div className="space-y-3">
          <label className="block text-xs text-ink-muted">
            Lato piccolo (ml)
            <input
              type="number"
              inputMode="decimal"
              value={latoPiccolo}
              onChange={(e) => setLatoPiccolo(e.target.value)}
              placeholder="es. 20"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm text-ink"
            />
          </label>
          <label className="block text-xs text-ink-muted">
            Lato grande (ml)
            <input
              type="number"
              inputMode="decimal"
              value={latoGrande}
              onChange={(e) => setLatoGrande(e.target.value)}
              placeholder="es. 40"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm text-ink"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-status-danger">{error}</p>}
        {saved && !error && <p className="mt-3 text-sm text-primary">Salvato.</p>}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Salva
        </button>
      </div>
    </div>
  );
}
