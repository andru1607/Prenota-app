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
      <div className="flex min-h-screen items-center justify-center bg-[#1A1310] text-[#C17F45]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <Link href="/impostazioni" className="mb-3 flex items-center gap-1 text-xs font-medium text-[#A69686]">
        <ArrowLeft size={14} />
        Impostazioni
      </Link>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center">
          <div className="absolute inset-0 rounded-full bg-[#E3A857] opacity-20 blur-md" />
          <div className="relative grid h-12 w-12 place-items-center rounded-full border border-[#C17F45]/40 bg-[#1A1310] text-[#C17F45]">
            <Martini size={22} />
          </div>
        </div>
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Dosatore</h1>
          <p className="text-xs text-[#A69686]">Il dosatore fisico a doppia misura del tuo bar</p>
        </div>
      </div>

      <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-3 text-sm text-[#A69686]">
          Inserisci quanti ml versa ciascun lato del tuo dosatore. Le dosi delle ricette verranno
          mostrate anche come numero di dosatori, oltre che in ml.
        </p>

        <div className="space-y-3">
          <label className="block text-xs text-[#A69686]">
            Lato piccolo (ml)
            <input
              type="number"
              inputMode="decimal"
              value={latoPiccolo}
              onChange={(e) => setLatoPiccolo(e.target.value)}
              placeholder="es. 20"
              className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
          </label>
          <label className="block text-xs text-[#A69686]">
            Lato grande (ml)
            <input
              type="number"
              inputMode="decimal"
              value={latoGrande}
              onChange={(e) => setLatoGrande(e.target.value)}
              placeholder="es. 40"
              className="num-tabular mt-1 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2.5 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-[#D97A63]">{error}</p>}
        {saved && !error && <p className="mt-3 text-sm text-[#E3A857]">Salvato.</p>}

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)] disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Salva
        </button>
      </div>
    </div>
  );
}
