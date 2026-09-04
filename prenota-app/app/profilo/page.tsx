"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, User, Store, Mail, Lock, ShieldAlert, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { RestaurantSwitcher } from "@/components/ui/RestaurantSwitcher";
import Link from "next/link";

export default function ProfiloPage() {
  const router = useRouter();
  const { show } = useToast();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentEmail(user.email ?? "");

      const { data: adminRow } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsPlatformAdmin(!!adminRow);

      const activeStaffRow = await getMyStaffRow();
      if (!activeStaffRow) {
        setIsLoading(false);
        return;
      }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("id, full_name, role, restaurant_id")
        .eq("auth_user_id", user.id)
        .eq("restaurant_id", activeStaffRow.restaurantId)
        .single();

      if (staffRow) {
        setStaffId(staffRow.id);
        setFullName(staffRow.full_name ?? "");
        setRole(staffRow.role ?? "");
        setRestaurantId(staffRow.restaurant_id);

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("name")
          .eq("id", staffRow.restaurant_id)
          .single();

        if (restaurant) setRestaurantName(restaurant.name ?? "");
      }

      setIsLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile() {
    if (!staffId || !restaurantId) return;
    setIsSavingProfile(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: staffError } = await supabase
        .from("staff")
        .update({ full_name: fullName })
        .eq("id", staffId);
      if (staffError) throw staffError;

      if (role === "admin") {
        const { error: restaurantError } = await supabase
          .from("restaurants")
          .update({ name: restaurantName })
          .eq("id", restaurantId);
        if (restaurantError) throw restaurantError;
      }

      show("Profilo salvato");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare il profilo.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return;
    setIsSavingEmail(true);
    setEmailMessage(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (updateError) throw updateError;

      setEmailMessage(
        "Controlla la posta: ti abbiamo inviato un'email di conferma al nuovo indirizzo. Il cambio sarà effettivo solo dopo la conferma."
      );
      setNewEmail("");
    } catch (err) {
      console.error(err);
      setEmailMessage("Non sono riuscito ad avviare il cambio email. Riprova.");
    } finally {
      setIsSavingEmail(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      setPasswordMessage("La password deve avere almeno 6 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("Le due password non coincidono.");
      return;
    }

    setIsSavingPassword(true);
    setPasswordMessage(null);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      show("Password aggiornata");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err) {
      console.error(err);
      setPasswordMessage("Non sono riuscito ad aggiornare la password. Riprova.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleDeleteRestaurant() {
    if (!restaurantId || deleteConfirmText.trim() !== restaurantName.trim()) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase.from("restaurants").delete().eq("id", restaurantId);
      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare il locale. Riprova.", "error");
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1310] p-4">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="mb-3 h-44 w-full" />
        <Skeleton className="mb-3 h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
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
        <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Profilo</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">{error}</p>
      )}

      {isPlatformAdmin && (
        <Link
          href="/admin"
          className="touch-target mb-3 flex items-center gap-3 rounded-xl border border-[#E3A857]/30 bg-[#E3A857]/10 p-4"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[#E3A857]/40 bg-[#1A1310] text-[#E3A857]">
            <ShieldAlert size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#F0E9E0]">Pannello admin</p>
            <p className="text-xs text-[#A69686]">Visibile solo a te — tutti i locali iscritti</p>
          </div>
        </Link>
      )}

      <RestaurantSwitcher />

      <div className="animate-fade-in mb-3 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-3 flex items-center gap-2">
          <User size={16} className="text-[#A69686]" />
          <p className="text-sm font-medium text-[#F0E9E0]">Il tuo nome</p>
          {role && (
            <span className="ml-auto rounded-full border border-[#C17F45]/30 bg-[#C17F45]/15 px-2 py-0.5 text-[11px] font-medium text-[#C17F45]">
              {role === "admin" ? "Titolare" : role}
            </span>
          )}
        </div>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome e cognome"
          className="mb-4 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
        />

        <div className="mb-3 flex items-center gap-2">
          <Store size={16} className="text-[#A69686]" />
          <p className="text-sm font-medium text-[#F0E9E0]">Nome del ristorante</p>
        </div>
        {role === "admin" ? (
          <input
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Nome del ristorante"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
        ) : (
          <p className="rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#A69686]">
            {restaurantName}
          </p>
        )}

        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-50"
        >
          {isSavingProfile && <Loader2 size={16} className="animate-spin" />}
          Salva
        </button>
      </div>

      <div className="animate-fade-in mb-3 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Mail size={16} className="text-[#A69686]" />
          <p className="text-sm font-medium text-[#F0E9E0]">Email di accesso</p>
        </div>
        <p className="mb-2 text-sm text-[#A69686]">{currentEmail}</p>

        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="touch-target rounded-lg border border-[#3A2C22] px-3 py-2 text-xs font-medium text-[#A69686]"
          >
            Cambia email
          </button>
        ) : (
          <div>
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Nuova email"
              type="email"
              autoCapitalize="none"
              className="mb-2 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            {emailMessage && <p className="mb-2 text-xs text-[#A69686]">{emailMessage}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                  setEmailMessage(null);
                }}
                className="touch-target flex-1 rounded-xl border border-[#3A2C22] py-2 text-sm font-medium text-[#A69686]"
              >
                Annulla
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={isSavingEmail || !newEmail.trim()}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-40"
              >
                {isSavingEmail && <Loader2 size={16} className="animate-spin" />}
                Conferma
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="animate-fade-in mb-3 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lock size={16} className="text-[#A69686]" />
          <p className="text-sm font-medium text-[#F0E9E0]">Password</p>
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="touch-target rounded-lg border border-[#3A2C22] px-3 py-2 text-xs font-medium text-[#A69686]"
          >
            Cambia password
          </button>
        ) : (
          <div>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nuova password"
              type="password"
              className="mb-2 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Conferma password"
              type="password"
              className="mb-2 w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            {passwordMessage && <p className="mb-2 text-xs text-[#D97A63]">{passwordMessage}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordMessage(null);
                }}
                className="touch-target flex-1 rounded-xl border border-[#3A2C22] py-2 text-sm font-medium text-[#A69686]"
              >
                Annulla
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-40"
              >
                {isSavingPassword && <Loader2 size={16} className="animate-spin" />}
                <Check size={16} />
                Salva
              </button>
            </div>
          </div>
        )}
      </div>

      {role === "admin" && restaurantId && (
        <div className="animate-fade-in rounded-2xl border border-[#C0503D]/40 bg-[#2A1B14] p-4">
          <div className="mb-2 flex items-center gap-2">
            <Trash2 size={16} className="text-[#D97A63]" />
            <p className="text-sm font-medium text-[#D97A63]">Zona pericolosa</p>
          </div>
          <p className="mb-3 text-xs text-[#A69686]">
            Elimina per sempre "{restaurantName}" e tutti i suoi dati — prenotazioni, clienti, staff, tavoli,
            tutto quanto. Non si può annullare.
          </p>

          {!showDeleteForm ? (
            <button
              onClick={() => setShowDeleteForm(true)}
              className="touch-target rounded-lg border border-[#C0503D]/40 px-3 py-2 text-xs font-medium text-[#D97A63]"
            >
              Elimina locale e tutti i dati
            </button>
          ) : (
            <div>
              <p className="mb-2 text-xs text-[#A69686]">
                Per confermare, scrivi esattamente il nome del locale:{" "}
                <span className="font-medium text-[#F0E9E0]">{restaurantName}</span>
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={restaurantName}
                autoFocus
                className="mb-2 w-full rounded-lg border border-[#C0503D]/40 bg-[#1A1310] px-3 py-2 text-base text-[#F0E9E0] placeholder:text-[#7A6E63] focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteForm(false);
                    setDeleteConfirmText("");
                  }}
                  disabled={isDeleting}
                  className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#3A2C22] py-2 text-sm font-medium text-[#A69686] disabled:opacity-40"
                >
                  <X size={15} />
                  Annulla
                </button>
                <button
                  onClick={handleDeleteRestaurant}
                  disabled={isDeleting || deleteConfirmText.trim() !== restaurantName.trim()}
                  className="touch-target flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C0503D] py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  {isDeleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  Elimina per sempre
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
