"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { StatusBar } from "@/components/ui/StatusBar";
import { TableCard } from "@/components/ui/TableCard";
import { ReservationCard } from "@/components/ui/ReservationCard";
import { PhotoImportReview } from "@/components/ui/PhotoImportReview";
import { OnboardingGuide } from "@/components/ui/OnboardingGuide";
import type { ParsedReservationDraft, Reservation, RestaurantTable, TableStatus } from "@/types";

const DEFAULT_TABLES = [
  { number: "1", capacity: 2 },
  { number: "2", capacity: 2 },
  { number: "3", capacity: 4 },
  { number: "4", capacity: 4 },
  { number: "5", capacity: 6 },
  { number: "6", capacity: 8 },
];

const STATUS_CYCLE: TableStatus[] = ["free", "occupied", "reserved"];
const REFRESH_INTERVAL_MS = 60_000;
const SHOW_TABLES_KEY = "prenota-app:showTables";
const ROOM_FILTER_KEY = "prenota-app:roomFilter";
const MAX_PREVIEW_ITEMS = 8;

function formatPreviewDayLabel(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toDateString();
  const d = new Date(dateStr);

  if (d.toDateString() === todayStr) return "Oggi";

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Domani";

  const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function mapReservationRow(row: any): Reservation {
  return {
    id: row.id,
    customerName: row.customer_name,
    phone: row.phone ?? undefined,
    partySize: row.party_size,
    reservationTime: row.reservation_time,
    status: row.status,
    tableId: row.table_id ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source,
    createdAt: row.created_at,
  };
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

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [drafts, setDrafts] = useState<ParsedReservationDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skippedInfo, setSkippedInfo] = useState<string | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<(RestaurantTable & { roomId: string | null })[]>([]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [roomFilter, setRoomFilter] = useState<string>("all"); // "all" | id sala | "none"
  const [showTables, setShowTables] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(SHOW_TABLES_KEY);
    if (saved === "true") setShowTables(true);

    const savedRoom = window.localStorage.getItem(ROOM_FILTER_KEY);
    if (savedRoom) setRoomFilter(savedRoom);
  }, []);

  function handleRoomFilterChange(value: string) {
    setRoomFilter(value);
    window.localStorage.setItem(ROOM_FILTER_KEY, value);
  }

  function toggleShowTables() {
    setShowTables((prev) => {
      const next = !prev;
      window.localStorage.setItem(SHOW_TABLES_KEY, String(next));
      return next;
    });
  }

  const loadReservations = useCallback(async () => {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) return;
      const { reservations: data } = await res.json();
      setReservations((data ?? []).map(m
