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
        headers: { "Content-Type": "
