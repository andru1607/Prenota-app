"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, Plus, Trash2, X, Shield, User as UserIcon, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  auth_user_id: string;
}

export default function StaffPage() {
  const router = useRouter();
  const { show } = useToast();
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [isSaving, setIsSaving] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { staff } = await res.json();
      setMembers(staff ?? []);

      if (user) {
        const me = (staff ?? []).find((m: StaffMember) => m.auth_user_id === user.id);
        if (me) {
          setMyStaffId(me.id);
          setIsAdmin(me.role === "admin");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare il team.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleAddMember() {
    if (!fullName.trim() || !email.trim() || password.length < 6) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Non sono riuscito ad aggiungere il collaboratore.");
        return;
      }

      const addedName = fullName;
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("staff");
      setShowForm(false);
      show(`${addedName} aggiunto al team`);
      loadMembers();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito ad aggiungere il collaboratore.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Rimuovere ${name} dal team? Perderà l'accesso a questo ristorante.`)) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Errore rimozione");
      }
      show(`${name} rimosso dal team`);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a rimuovere il collaboratore.", "error");
      loadMembers();
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Team</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="touch-target flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] px-3 py-2 text-sm font-medium text-[#1A1310]"
          >
            <Plus size={18} />
            Nuovo
          </button>
        )}
      </div>

      {!isAdmin && !isLoading && (
        <p className="mb-3 rounded-lg border border-[#E3A857]/40 bg-[#2A2115] p-3 text-sm text-[#E3A857]">
          Solo un amministratore può aggiungere o rimuovere collaboratori.
        </p>
      )}

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">
          {error}
        </p>
      )}

      {showForm && (
        <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-[#F0E9E0]">Nuovo collaboratore</p>
            <button
              onClick={() => setShowForm(false)}
              className="touch-target grid place-items-center rounded-lg text-[#A69686]"
              aria-label="Chiudi"
            >
              <X size={18} />
            </button>
          </div>
          <div className="space-y-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome e cognome"
              autoFocus
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email di accesso"
              type="email"
              autoCapitalize="none"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (almeno 6 caratteri)"
              type="password"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRole("staff")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  role === "staff"
                    ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                    : "border border-[#3A2C22] text-[#A69686]"
                }`}
              >
                <UserIcon size={14} />
                Staff
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`touch-target flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium ${
                  role === "admin"
                    ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                    : "border border-[#3A2C22] text-[#A69686]"
                }`}
              >
                <Shield size={14} />
                Amministratore
              </button>
            </div>
          </div>

          <button
            onClick={handleAddMember}
            disabled={isSaving || !fullName.trim() || !email.trim() || password.length < 6}
            className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-40"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Crea account
          </button>
          <p className="mt-2 text-xs text-[#A69686]">
            L'account viene creato subito, pronto all'uso. Comunica tu email e password al
            collaboratore.
          </p>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : members.length === 0 ? (
        <EmptyState icon={Users} title="Nessun membro trovato" />
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="animate-fade-in flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-[#F0E9E0]">{member.full_name}</p>
                  {member.id === myStaffId && (
                    <span className="rounded-full border border-[#3A2C22] bg-[#1A1310] px-1.5 py-0.5 text-[10px] text-[#A69686]">
                      Tu
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-[#A69686]">{member.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    member.role === "admin"
                      ? "border border-[#C17F45]/30 bg-[#C17F45]/15 text-[#C17F45]"
                      : "border border-[#3A2C22] bg-[#1A1310] text-[#A69686]"
                  }`}
                >
                  {member.role === "admin" ? <Shield size={11} /> : <UserIcon size={11} />}
                  {member.role === "admin" ? "Admin" : "Staff"}
                </span>
                {isAdmin && member.id !== myStaffId && (
                  <button
                    onClick={() => handleRemove(member.id, member.full_name)}
                    className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#C0503D]/15 hover:text-[#D97A63]"
                    aria-label="Rimuovi collaboratore"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
