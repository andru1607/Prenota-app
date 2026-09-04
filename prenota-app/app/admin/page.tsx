"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface RestaurantRow {
  id: string;
  name: string;
  business_type: string | null;
  subscription_tier: string;
  trial_ends_at: string | null;
  created_at: string;
}

const TIER_OPTIONS = ["trial", "base", "premium", "expired"] as const;

const TIER_LABEL: Record<string, string> = {
  trial: "Prova",
  base: "Base",
  premium: "Premium",
  expired: "Scaduto",
};

const TIER_COLOR: Record<string, string> = {
  trial: "border-[#E3A857]/40 bg-[#E3A857]/15 text-[#E3A857]",
  base: "border-[#3A2C22] bg-[#1A1310] text-[#A69686]",
  premium: "border-[#7C9473]/40 bg-[#7C9473]/15 text-[#7C9473]",
  expired: "border-[#C0503D]/40 bg-[#C0503D]/15 text-[#D97A63]",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setStatus("denied");
        return;
      }

      const { data: adminRow } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminRow) {
        setStatus("denied");
        return;
      }

      setStatus("ok");

      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, business_type, subscription_tier, trial_ends_at, created_at")
        .order("created_at", { ascending: false });

      if (!error && data) setRestaurants(data);
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleTierChange(id: string, tier: string) {
    setSavingId(id);
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, subscription_tier: tier, trial_ends_at: tier === "trial" ? r.trial_ends_at : null } : r))
    );
    try {
      const supabase = createClient();
      await supabase
        .from("restaurants")
        .update({
          subscription_tier: tier,
          trial_ends_at: tier === "trial" ? undefined : null,
          subscription_updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  }

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1310] text-[#C17F45]">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1310] p-4 text-center">
        <p className="text-sm text-[#A69686]">Questa pagina non è disponibile.</p>
      </div>
    );
  }

  const visible = restaurants.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/profilo")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-[#E3A857]" />
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Pannello admin</h1>
        </div>
      </div>

      <p className="mb-3 text-xs text-[#A69686]">
        {restaurants.length} local{restaurants.length === 1 ? "e" : "i"} iscritt
        {restaurants.length === 1 ? "o" : "i"}. Cambia il livello direttamente da qui — utile per sbloccare
        qualcuno a mano prima che Stripe sia collegato.
      </p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca per nome..."
        className="mb-4 w-full rounded-xl border border-[#3A2C22] bg-[#251C17] px-3 py-2.5 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[#A69686]">Carico...</p>
      ) : visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#A69686]">Nessun locale trovato.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#3A2C22] bg-[#251C17] p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#F0E9E0]">{r.name}</p>
                  <p className="text-xs text-[#A69686]">
                    {r.business_type === "bar" ? "Bar" : "Ristorante"} · iscritto {formatDate(r.created_at)}
                    {r.subscription_tier === "trial" && ` · prova fino al ${formatDate(r.trial_ends_at)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${TIER_COLOR[r.subscription_tier] ?? TIER_COLOR.base}`}
                >
                  {TIER_LABEL[r.subscription_tier] ?? r.subscription_tier}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={r.subscription_tier}
                  onChange={(e) => handleTierChange(r.id, e.target.value)}
                  disabled={savingId === r.id}
                  className="flex-1 rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] disabled:opacity-50"
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {TIER_LABEL[t]}
                    </option>
                  ))}
                </select>
                {savingId === r.id && <Loader2 size={16} className="animate-spin text-[#C17F45]" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
