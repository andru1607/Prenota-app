"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, Layers } from "lucide-react";
import type { RestaurantTable } from "@/types";
import { getMyRole } from "@/lib/roles";

function mapTableRow(row: any): RestaurantTable {
  return {
    id: row.id,
    number: row.number,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes ?? undefined,
  };
}

function sortTablesByNumber(tables: RestaurantTable[]): RestaurantTable[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

export default function TavoliPage() {
  const router = useRouter();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [isAdding, setIsAdding] = useState(false);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFrom, setBulkFrom] = useState("");
  const [bulkTo, setBulkTo] = useState("");
  const [bulkCapacity, setBulkCapacity] = useState("4");
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const loadTables = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tables");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { tables: data } = await res.json();
      setTables(sortTablesByNumber((data ?? []).map(mapTableRow)));
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare i tavoli.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [loadTables]);

  async function handleAddTable() {
    if (!newNumber.trim() || !newCapacity) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables: [{ number: newNumber.trim(), capacity: Number(newCapacity) }],
        }),
      });
      if (!res.ok) throw new Error("Errore creazione tavolo");
      setNewNumber("");
      setNewCapacity("4");
      loadTables();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito ad aggiungere il tavolo.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleBulkAdd() {
    const from = Number(bulkFrom);
    const to = Number(bulkTo);
    if (!from || !to || to < from || !bulkCapacity) return;

    if (to - from > 200) {
      setError("Intervallo troppo grande. Prova con un intervallo più piccolo.");
      return;
    }

    setIsBulkAdding(true);
    setError(null);
    try {
      const newTables = [];
      for (let n = from; n <= to; n++) {
        newTables.push({ number: String(n), capacity: Number(bulkCapacity) });
      }

      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: newTables }),
      });
      if (!res.ok) throw new Error("Errore creazione tavoli");

      setBulkFrom("");
      setBulkTo("");
      setShowBulk(false);
      loadTables();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a creare i tavoli.");
    } finally {
      setIsBulkAdding(false);
    }
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`Eliminare il tavolo ${number}?`)) return;
    setTables((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tables?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
    } catch (err) {
      console.error(err);
      loadTables();
    }
  }

  async function handleCapacityChange(id: string, capacity: number) {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, capacity } : t)));
    try {
      await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, capacity }),
      });
    } catch (err) {
      console.error(err);
      loadTables();
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-ink">Tavoli</h1>
        <span className="text-sm text-ink-muted">{tables.length} totali</span>
      </div>

      {isAdmin && (
      <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-2 text-sm font-medium text-ink">Aggiungi un tavolo</p>
        <div className="flex gap-2">
          <input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="Numero"
            className="w-20 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            type="number"
            value={newCapacity}
            onChange={(e) => setNewCapacity(e.target.value)}
            placeholder="Coperti"
            className="w-20 rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddTable}
            disabled={isAdding || !newNumber.trim()}
            className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-white disabled:opacity-40"
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Aggiungi
          </button>
        </div>

        <button
          onClick={() => setShowBulk((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary"
        >
          <Layers size={14} />
          {showBulk ? "Nascondi creazione in serie" : "Crea tanti tavoli insieme"}
        </button>

        {showBulk && (
          <div className="mt-3 rounded-lg bg-bg-subtle p-3">
            <p className="mb-2 text-xs text-ink-muted">
              Es. dal tavolo 1 al 38, tutti da 4 coperti — utile per una sala grande o una
              piazza esterna.
            </p>
            <div className="flex items-center gap-2">
              <input
                value={bulkFrom}
                onChange={(e) => setBulkFrom(e.target.value)}
                placeholder="Da"
                type="number"
                className="w-16 rounded-lg border border-black/10 px-2 py-2 text-sm"
              />
              <span className="text-ink-muted">–</span>
              <input
                value={bulkTo}
                onChange={(e) => setBulkTo(e.target.value)}
                placeholder="A"
                type="number"
                className="w-16 rounded-lg border border-black/10 px-2 py-2 text-sm"
              />
              <input
                value={bulkCapacity}
                onChange={(e) => setBulkCapacity(e.target.value)}
                placeholder="Coperti"
                type="number"
                className="w-20 rounded-lg border border-black/10 px-2 py-2 text-sm"
              />
            </div>
            <button
              onClick={handleBulkAdd}
              disabled={isBulkAdding || !bulkFrom || !bulkTo}
              className="touch-target mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-white disabled:opacity-40"
            >
              {isBulkAdding && <Loader2 size={16} className="animate-spin" />}
              Crea tavoli
            </button>
          </div>
        )}
      </div>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-ink-muted">Carico i tavoli...</p>
      ) : tables.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          Nessun tavolo ancora. Aggiungine uno qui sopra.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-3"
            >
              <div>
                <p className="font-semibold text-ink">Tavolo {table.number}</p>
                <div className="mt-1 flex items-center gap-1">
                  {isAdmin ? (
                    <input
                      type="number"
                      value={table.capacity}
                      onChange={(e) => handleCapacityChange(table.id, Number(e.target.value))}
                      className="num-tabular w-14 rounded border border-black/10 px-1.5 py-1 text-xs"
                    />
                  ) : (
                    <span className="num-tabular text-xs text-ink">{table.capacity}</span>
                  )}
                  <span className="text-xs text-ink-muted">coperti</span>
                </div>
              </div>
              {isAdmin && (
              <button
                onClick={() => handleDelete(table.id, table.number)}
                className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                aria-label="Elimina tavolo"
              >
                <Trash2 size={16} />
              </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
