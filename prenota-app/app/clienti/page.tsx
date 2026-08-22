"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Star, Loader2, ChevronRight, X, Check, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
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
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "Nessun cliente trovato" : "Nessun cliente ancora"}
          description={
            search
              ? undefined
              : "I clienti che prenotano dal QR code con il loro telefono vengono aggiunti automaticamente."
          }
        />
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => router.push(`/clienti/${customer.id}`)}
              className="animate-fade-in touch-target flex w-full items-center justify-between rounded-xl border border-black/5 bg-white p-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-semibold text-ink">{customer.name}</p>
                  {customer.isRegular && (
                    <span title="Cliente abituale">
                      <Star size={13} className="shrink-0 fill-status-pending text-status-pending" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted">
                  {customer.phone || "Nessun telefono"}
                  {customer.reservationCount > 0 &&
                    ` · ${customer.reservationCount} prenotazion${customer.reservationCount === 1 ? "e" : "i"}`}
                </p>
              </div>
              <ChevronRight size={18} className="shrink-0 text-ink-muted" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
