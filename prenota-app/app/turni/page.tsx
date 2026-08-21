"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  Trash2,
  UserPlus,
} from "lucide-react";
import { getMyRole } from "@/lib/roles";

interface RosterMember {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  roster_member_id: string;
  start_time: string;
  end_time: string;
}

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

function formatTimeInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + ":" + digits.slice(2);
}

export default function TurniPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayDateString());
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");

  const [addingShiftFor, setAddingShiftFor] = useState<string | null>(null);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/roster");
      if (!res.ok) return;
      const { members: data } = await res.json();
      setMembers(data ?? []);
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
    loadMembers();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [loadMembers]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  function shiftsFor(memberId: string): Shift[] {
    return shifts.filter((s) => s.roster_member_id === memberId);
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return;
    try {
      const res = await fetch("/api/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMemberName.trim() }),
      });
      if (!res.ok) throw new Error("Errore creazione");
      setNewMemberName("");
      setShowAddMember(false);
      loadMembers();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito ad aggiungere la persona.");
    }
  }

  async function handleRemoveMember(id: string, name: string) {
    if (!confirm(`Rimuovere ${name} dall'elenco? Verranno eliminati anche i suoi turni.`)) return;
    try {
      await fetch(`/api/roster?id=${id}`, { method: "DELETE" });
      loadMembers();
      loadShifts();
    } catch (err) {
      console.error(err);
    }
  }

  function startAddShift(memberId: string) {
    setAddingShiftFor(memberId);
    setNewStart("");
    setNewEnd("");
  }

  async function handleAddShift(memberId: string) {
    if (!/^\d{1,2}:\d{2}$/.test(newStart) || !/^\d{1,2}:\d{2}$/.test(newEnd)) return;
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rosterMemberId: memberId,
          date: selectedDate,
          startTime: newStart,
          endTime: newEnd,
        }),
      });
      if (!res.ok) throw new Error("Errore assegnazione");
      setAddingShiftFor(null);
      setNewStart("");
      setNewEnd("");
      loadShifts();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito ad assegnare il turno.");
    }
  }

  async function handleDeleteShift(id: string) {
    setShifts((prev) => prev.filter((s) => s.id !== id));
    try {
      await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      loadShifts();
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
        <h1 className="flex-1 text-lg font-semibold text-ink">Turni</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAddMember((v) => !v)}
            className="touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
          >
            <UserPlus size={16} />
            Persona
          </button>
        )}
      </div>

      {showAddMember && (
        <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Nuova persona</p>
            <button
              onClick={() => setShowAddMember(false)}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Chiudi"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Nome e cognome"
              autoFocus
              className="flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <button
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="touch-target rounded-lg bg-primary px-4 text-sm font-medium text-white disabled:opacity-40"
            >
              <Check size={16} />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-ink-muted">
            Va bene anche chi non ha un account nell'app.
          </p>
        </div>
      )}

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
      ) : members.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">
          Nessuna persona ancora. {isAdmin && 'Tocca "Persona" qui sopra per aggiungerne una.'}
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const memberShifts = shiftsFor(member.id);
            return (
              <div key={member.id} className="rounded-xl border border-black/5 bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink">{member.name}</p>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name)}
                      className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                      aria-label="Rimuovi persona"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {memberShifts.length === 0 && (
                    <span className="text-xs text-ink-muted">Nessun turno</span>
                  )}
                  {memberShifts.map((shift) => (
                    <span
                      key={shift.id}
                      className="num-tabular flex items-center gap-1.5 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary"
                    >
                      {shift.start_time}–{shift.end_time}
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteShift(shift.id)}
                          aria-label="Rimuovi turno"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </span>
                  ))}

                  {isAdmin && addingShiftFor !== member.id && (
                    <button
                      onClick={() => startAddShift(member.id)}
                      className="touch-target flex items-center gap-1 rounded-full border border-dashed border-black/20 px-3 py-1.5 text-xs font-medium text-ink-muted"
                    >
                      <Plus size={13} />
                      Turno
                    </button>
                  )}
                </div>

                {addingShiftFor === member.id && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      value={newStart}
                      onChange={(e) => setNewStart(formatTimeInput(e.target.value))}
                      placeholder="Da (09:00)"
                      inputMode="numeric"
                      maxLength={5}
                      autoFocus
                      className="num-tabular w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                    />
                    <span className="text-ink-muted">–</span>
                    <input
                      value={newEnd}
                      onChange={(e) => setNewEnd(formatTimeInput(e.target.value))}
                      placeholder="A (15:00)"
                      inputMode="numeric"
                      maxLength={5}
                      className="num-tabular w-24 rounded-lg border border-black/10 px-2 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleAddShift(member.id)}
                      className="touch-target rounded-lg bg-primary px-3 text-white"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setAddingShiftFor(null)}
                      className="touch-target rounded-lg border border-black/10 px-3 text-ink-muted"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
