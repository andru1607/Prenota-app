"use client";

import { useEffect, useState } from "react";
import { Check, Plus, Store, Martini, Loader2, X } from "lucide-react";
import { getActiveRestaurantId, setActiveRestaurantId } from "@/lib/activeRestaurant";

type BusinessType = "ristorante" | "bar";

interface RestaurantOption {
  id: string;
  name: string;
  logoUrl: string | null;
  role: string;
  businessType: BusinessType;
}

function landingPathFor(type: BusinessType) {
  return type === "bar" ? "/cocktail" : "/dashboard";
}

export function RestaurantSwitcher() {
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBusinessType, setNewBusinessType] = useState<BusinessType>("ristorante");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants");
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(`Errore ${res.status}: ${body?.error || "sconosciuto"}`);
        setRestaurants([]);
        return;
      }

      const list: RestaurantOption[] = body?.restaurants ?? [];
      setRestaurants(list);
      const current = getActiveRestaurantId();
      setActiveIdState(current && list.some((r) => r.id === current) ? current : list[0]?.id ?? null);
    } catch (err) {
      console.error(err);
      setError("Errore di rete nel caricare i ristoranti.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleSwitch(id: string) {
    if (id === activeId || isSwitching) return;
    setIsSwitching(true);
    setActiveRestaurantId(id);
    const target = restaurants.find((r) => r.id === id);
    // Ricarico l'intera pagina (non solo un router.push) così tutti i componenti
    // che leggono il tipo di locale al mount (nav, dashboard, ecc.) ripartono da zero
    // con il locale corretto, senza bisogno di un refresh manuale.
    window.location.href = landingPathFor(target?.businessType ?? "ristorante");
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), businessType: newBusinessType }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");

      setActiveRestaurantId(body.restaurant.id);
      window.location.href = landingPathFor(newBusinessType);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a creare il locale. Riprova.");
      setIsCreating(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
        <Store size={16} className="text-ink-muted" />
        {restaurants.length > 1 ? "I tuoi locali" : "Il tuo locale"}
      </p>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-2.5 text-xs text-status-danger">{error}</p>
      )}

      {restaurants.length > 0 && (
        <div className="space-y-1.5">
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSwitch(r.id)}
              disabled={isSwitching}
              className={`touch-target flex w-full items-center gap-3 rounded-lg border p-2.5 text-left disabled:opacity-60 ${
                r.id === activeId ? "border-primary bg-primary-light" : "border-black/10"
              }`}
            >
              {r.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.logoUrl}
                  alt={r.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bg-subtle text-ink-muted">
                  {r.businessType === "bar" ? <Martini size={14} /> : <Store size={14} />}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                <p className="text-xs text-ink-muted">
                  {r.role === "admin" ? "Titolare" : "Staff"} ·{" "}
                  {r.businessType === "bar" ? "Bar" : "Ristorante"}
                </p>
              </div>
              {r.id === activeId && <Check size={18} className="shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {showNewForm ? (
        <div className="mt-3 rounded-lg bg-bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-ink">Nuovo locale</p>
            <button
              onClick={() => {
                setShowNewForm(false);
                setNewName("");
                setNewBusinessType("ristorante");
                setError(null);
              }}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Chiudi"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mb-2 flex gap-2">
            <button
              type="button"
              onClick={() => setNewBusinessType("ristorante")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium ${
                newBusinessType === "ristorante"
                  ? "border-primary bg-primary-light text-primary"
                  : "border-black/10 bg-white text-ink-muted"
              }`}
            >
              <Store size={14} />
              Ristorante
            </button>
            <button
              type="button"
              onClick={() => setNewBusinessType("bar")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-medium ${
                newBusinessType === "bar"
                  ? "border-primary bg-primary-light text-primary"
                  : "border-black/10 bg-white text-ink-muted"
              }`}
            >
              <Martini size={14} />
              Bar
            </button>
          </div>

          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={newBusinessType === "bar" ? "Nome del nuovo bar" : "Nome del nuovo ristorante"}
              autoFocus
              className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="touch-target rounded-lg bg-primary px-3 text-white disabled:opacity-40"
              aria-label="Crea locale"
            >
              {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Diventerai titolare anche di questo, con lo stesso account — dati e clienti
            restano completamente separati dagli altri tuoi locali.
          </p>
        </div>
      ) : (
        <button
          onClick={() => setShowNewForm(true)}
          className="touch-target mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/20 py-2 text-xs font-medium text-ink-muted"
        >
          <Plus size={14} />
          Aggiungi un altro locale
        </button>
      )}
    </div>
  );
}
