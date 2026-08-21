"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Layers,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import type { RestaurantTable } from "@/types";
import { getMyRole } from "@/lib/roles";

interface Room {
  id: string;
  name: string;
}

function mapTableRow(row: any): RestaurantTable & { roomId: string | null } {
  return {
    id: row.id,
    number: row.number,
    capacity: row.capacity,
    status: row.status,
    notes: row.notes ?? undefined,
    roomId: row.room_id ?? null,
  };
}

function sortTablesByNumber<T extends { number: string }>(tables: T[]): T[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

export default function TavoliPage() {
  const router = useRouter();
  const [tables, setTables] = useState<(RestaurantTable & { roomId: string | null })[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showRooms, setShowRooms] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState("");

  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [newRoomId, setNewRoomId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFrom, setBulkFrom] = useState("");
  const [bulkTo, setBulkTo] = useState("");
  const [bulkCapacity, setBulkCapacity] = useState("4");
  const [bulkRoomId, setBulkRoomId] = useState("");
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

  const loadRooms = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms");
      if (!res.ok) return;
      const { rooms: data } = await res.json();
      setRooms(data ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadTables();
    loadRooms();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [loadTables, loadRooms]);

  async function handleAddRoom() {
    if (!newRoomName.trim()) return;
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoomName.trim() }),
      });
      if (!res.ok) throw new Error("Errore creazione sala");
      setNewRoomName("");
      loadRooms();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a creare la sala.");
    }
  }

  function startEditRoom(room: Room) {
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  }

  async function handleSaveRoomName() {
    if (!editingRoomId || !editingRoomName.trim()) return;
    try {
      await fetch("/api/rooms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingRoomId, name: editingRoomName.trim() }),
      });
      setEditingRoomId(null);
      loadRooms();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteRoom(id: string, name: string) {
    if (!confirm(`Eliminare la sala "${name}"? I suoi tavoli resteranno, ma senza sala.`)) return;
    try {
      await fetch(`/api/rooms?id=${id}`, { method: "DELETE" });
      loadRooms();
      loadTables();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddTable() {
    if (!newNumber.trim() || !newCapacity) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables: [
            {
              number: newNumber.trim(),
              capacity: Number(newCapacity),
              roomId: newRoomId || undefined,
            },
          ],
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
        newTables.push({
          number: String(n),
          capacity: Number(bulkCapacity),
          roomId: bulkRoomId || undefined,
        });
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

  async function handleRoomChange(id: string, roomId: string) {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, roomId: roomId || null } : t)));
    try {
      await fetch("/api/tables", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, roomId: roomId || null }),
      });
    } catch (err) {
      console.error(err);
      loadTables();
    }
  }

  const roomGroups: { room: Room | null; tables: typeof tables }[] = [
    ...rooms.map((room) => ({
      room,
      tables: tables.filter((t) => t.roomId === room.id),
    })),
    {
      room: null,
      tables: tables.filter((t) => !t.roomId || !rooms.some((r) => r.id === t.roomId)),
    },
  ].filter((group) => group.tables.length > 0 || group.room !== null);

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/strumenti")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-semibold text-ink">Tavoli</h1>
        <span className="text-sm text-ink-muted">{tables.length} totali</span>
      </div>

      <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
        <button
          onClick={() => setShowRooms((v) => !v)}
          className="touch-target flex w-full items-center justify-between"
        >
          <span className="text-sm font-medium text-ink">
            Sale {rooms.length > 0 && `(${rooms.length})`}
          </span>
          {showRooms ? (
            <ChevronDown size={18} className="text-ink-muted" />
          ) : (
            <ChevronRightIcon size={18} className="text-ink-muted" />
          )}
        </button>

        {showRooms && (
          <div className="mt-3">
            {isAdmin && (
              <div className="mb-3 flex gap-2">
                <input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Es. Piazza, Interno, Veranda"
                  className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
                <button
                  onClick={handleAddRoom}
                  disabled={!newRoomName.trim()}
                  className="touch-target rounded-lg bg-primary px-3 text-white disabled:opacity-40"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            {rooms.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Nessuna sala ancora. I tavoli senza sala compaiono tutti insieme qui sotto.
              </p>
            ) : (
              <div className="space-y-1.5">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-bg-subtle p-2.5"
                  >
                    {editingRoomId === room.id ? (
                      <>
                        <input
                          value={editingRoomName}
                          onChange={(e) => setEditingRoomName(e.target.value)}
                          autoFocus
                          className="flex-1 rounded-lg border border-black/10 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={handleSaveRoomName}
                          className="touch-target grid place-items-center rounded-lg text-primary"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingRoomId(null)}
                          className="touch-target grid place-items-center rounded-lg text-ink-muted"
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-ink">{room.name}</span>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditRoom(room)}
                              className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-white"
                              aria-label="Rinomina sala"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.name)}
                              className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                              aria-label="Elimina sala"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-ink">Aggiungi un tavolo</p>
          <div className="mb-2 flex gap-2">
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
          {rooms.length > 0 && (
            <select
              value={newRoomId}
              onChange={(e) => setNewRoomId(e.target.value)}
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-ink"
            >
              <option value="">Nessuna sala</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}

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
                Es. dal tavolo 1 al 38, tutti da 4 coperti, tutti nella stessa sala.
              </p>
              <div className="mb-2 flex items-center gap-2">
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
              {rooms.length > 0 && (
                <select
                  value={bulkRoomId}
                  onChange={(e) => setBulkRoomId(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-ink"
                >
                  <option value="">Nessuna sala</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={handleBulkAdd}
                disabled={isBulkAdding || !bulkFrom || !bulkTo}
                className="touch-target flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-white disabled:opacity-40"
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
        <div className="space-y-5">
          {roomGroups.map((group) => (
            <div key={group.room?.id ?? "senza-sala"}>
              <p className="mb-2 text-xs font-semibold uppercase text-ink-muted">
                {group.room?.name ?? "Senza sala"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {group.tables.map((table) => (
                  <div
                    key={table.id}
                    className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
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
                      {isAdmin && rooms.length > 0 && (
                        <select
                          value={table.roomId ?? ""}
                          onChange={(e) => handleRoomChange(table.id, e.target.value)}
                          className="mt-1 w-full rounded border border-black/10 px-1 py-0.5 text-[11px] text-ink-muted"
                        >
                          <option value="">Nessuna sala</option>
                          {rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(table.id, table.number)}
                        className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                        aria-label="Elimina tavolo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
