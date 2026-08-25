"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2, ChevronRight, X, Check, Users, Phone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { LOYALTY_TIERS, getLoyaltyTier } from "@/lib/loyalty";
import type { Customer } from "@/types";

function mapCustomerRow(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    notes: row.notes ?? undefined,
    isRegular: row.is_regular,
    reservationCount: row.reservation_count,
  };
}

export default function ClientiPage() {
  const router = useRouter();
  const { show } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadCustomers = useCallback(async (searchTerm?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = searchTerm
        ? `/api/customers?search=${encodeURIComponent(searchTerm)}`
        : "/api/customers";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { customers: data } = await res.json();
      setCustomers((data ?? []).map(mapCustomerRow));
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare i clienti.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(search || undefined), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function handleAddCustomer() {
    if (!newName.trim()) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          notes: newNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Errore creazione cliente");
      setNewName("");
      setNewPhone("");
      setNewNotes("");
      setShowForm(false);
      show("Cliente aggiunto");
      loadCustomers(search || undefined);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiungere il cliente.", "error");
    } finally {
      setIsAdding(false);
    }
  }

  const visibleCustomers =
    tierFilter === "all"
      ? customers
      : customers.filter((c) => getLoyaltyTier(c.reservationCount).key === tierFilter);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Clienti</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={18} />
          Nuovo
        </button>
      </div>

      <div className="relative mb-3">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome o telefono"
          className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setTierFilter("all")}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
            tierFilter === "all" ? "bg-primary text-white" : "border border-black/10 text-ink-muted"
          }`}
        >
          Tutti
        </button>
        {LOYALTY_TIERS.map((tier) => (
          <button
            key={tier.key}
            onClick={() => setTierFilter(tier.key)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium"
            style={
              tierFilter === tier.key
                ? { backgroundColor: tier.color, color: "#fff" }
                : { backgroundColor: tier.bg, color: tier.color }
            }
          >
            {tier.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Nuovo cliente</p>
            <button
              onClick={() => setShowForm(false)}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome e cognome"
              autoFocus
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Telefono (facoltativo)"
              type="tel"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Note (allergie, preferenze...)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleAddCustomer}
            disabled={isAdding || !newName.trim()}
            className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Salva cliente
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : visibleCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || tierFilter !== "all" ? "Nessun cliente trovato" : "Nessun cliente ancora"}
          description={
            search || tierFilter !== "all"
              ? undefined
              : "I clienti che prenotano dal QR code con il loro telefono vengono aggiunti automaticamente."
          }
        />
      ) : (
        <div className="space-y-2">
          {visibleCustomers.map((customer) => {
            const tier = getLoyaltyTier(customer.reservationCount);
            return (
            <div
              key={customer.id}
              className="animate-fade-in flex w-full items-center justify-between rounded-xl border border-black/5 bg-white p-3"
            >
              <button
                onClick={() => router.push(`/clienti/${customer.id}`)}
                className="touch-target flex min-w-0 flex-1 items-center text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-ink">{customer.name}</p>
                    <span
                      className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: tier.bg, color: tier.color }}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {customer.phone || "Nessun telefono"}
                    {customer.reservationCount > 0 &&
                      ` · ${customer.reservationCount} prenotazion${customer.reservationCount === 1 ? "e" : "i"}`}
                  </p>
                </div>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="touch-target grid place-items-center rounded-lg text-primary hover:bg-primary-light"
                    aria-label={`Chiama ${customer.name}`}
                    title="Chiama"
                  >
                    <Phone size={18} />
                  </a>
                )}
                <button
                  onClick={() => router.push(`/clienti/${customer.id}`)}
                  className="touch-target grid place-items-center rounded-lg text-ink-muted"
                  aria-label="Apri scheda cliente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
