"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Sunset, Moon, Coffee } from "lucide-react";
import { getMyRole } from "@/lib/roles";

interface StaffMember {
  id: string;
  full_name: string;
}

interface Shift {
  id: string;
  staff_id: string;
  slot: "mattina" | "pomeriggio" | "sera" | "riposo";
}

const SLOTS = [
  { value: "mattina", label: "Mattina", icon: Coffee },
  { value: "pomeriggio", label: "Pomeriggio", icon: Sun },
  { value: "sera", label: "Sera", icon: Sunset },
  { value: "riposo", label: "Riposo", icon: Moon },
] as const;

function toDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayDateString(): string {
  return toDateString(new Date());
}

function shiftDate(dateStr: string, deltaDays: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + deltaDays);
  return toDateString(d);
}

function formatDateLabel(dateStr: string): string {
  const isToday = dateStr === todayDateString();
  const d = new Date(dateStr + "T12:00:00");
  const label = d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  return isToday ? `Oggi, ${d.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}` : capitalized;
}

export default function TurniPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) return;
      const { staff } = await res.json();
      setStaffList((staff ?? []).map((s: any) => ({ id: s.id, full_name: s.full_name })));
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadShifts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shifts?date=${selectedDate}`);
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { shifts: data } = await res.json();
      setShifts(data ?? []);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare i turni.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadStaff();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [loadStaff]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  function shiftsFor(staffId: string): Shift[] {
    return shifts.filter((s) => s.staff_id === staffId);
  }

  async function toggleSlot(staffId: string, slot: string) {
    if (!isAdmin) return;

    const existing = shifts.find((s) => s.staff_id === staffId && s.slot === slot);

    if (existing) {
      setShifts((prev) => prev.filter((s) => s.id !== existing.id));
      try {
        const res = await fetch(`/api/shifts?id=${existing.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Errore rimozione");
      } catch (err) {
        console.error(err);
        loadShifts();
      }
    } else {
      try {
        const res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ staffId, date: selectedDate, slot }),
        });
        if (!res.ok) throw new Error("Errore assegnazione");
        loadShifts();
      } catch (err) {
        console.error(err);
        setError("Non sono riuscito ad assegnare il turno.");
      }
    }
  }

  const isToday = selectedDate === todayDateString();

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
        <h1 className="text-lg font-semibold text-ink">Turni</h1>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-black/5 bg-white p-2">
        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Giorno precedente"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="relative flex-1">
          <p className="pointer-events-none text-center text-sm font-medium text-ink">
            {formatDateLabel(selectedDate)}
          </p>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Scegli data"
          />
        </div>

        <button
          onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Giorno successivo"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {!isToday && (
        <button
          onClick={() => setSelectedDate(todayDateString())}
          className="mb-4 text-sm font-medium text-primary"
        >
          Torna a oggi
        </button>
      )}

      {!isAdmin && (
        <p className="mb-3 rounded-lg bg-status-pendingBg p-3 text-sm text-status-pending">
          Solo un amministratore può modificare i turni.
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-ink-muted">Carico...</p>
      ) : staffList.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Nessun membro del team trovato.</p>
      ) : (
        <div className="space-y-2">
          {staffList.map((member) => {
            const memberShifts = shiftsFor(member.id);
            return (
              <div key={member.id} className="rounded-xl border border-black/5 bg-white p-3">
                <p className="mb-2 text-sm font-semibold text-ink">{member.full_name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SLOTS.map((slot) => {
                    const isActive = memberShifts.some((s) => s.slot === slot.value);
                    const Icon = slot.icon;
                    return (
                      <button
                        key={slot.value}
                        onClick={() => toggleSlot(member.id, slot.value)}
                        disabled={!isAdmin}
                        className={`touch-target flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-100 ${
                          isActive
                            ? slot.value === "riposo"
                              ? "bg-status-closed text-white"
                              : "bg-primary text-white"
                            : "border border-black/10 text-ink-muted"
                        }`}
                      >
                        <Icon size={13} />
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
