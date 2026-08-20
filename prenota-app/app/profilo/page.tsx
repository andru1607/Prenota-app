"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Check, User, Store, Mail, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ProfiloPage() {
  const router = useRouter();

  const [staffId, setStaffId] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentEmail(user.email ?? "");

      const { data: staffRow } = await supabase
        .from("staff")
        .select("id, full_name, role, restaurant_id")
        .eq("auth_user_id", user.id)
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
    setProfileSaved(false);

    try {
      const supabase = createClient();

      const { error: staffError } = await supabase
        .from("staff")
        .update({ full_name: fullName })
        .eq("id", staffId);
      if (staffError) throw staffError;

      const { error: restaurantError } = await supabase
        .from("restaurants")
        .update({ name: restaurantName })
        .eq("id", restaurantId);
      if (restaurantError) throw restaurantError;

      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare il profilo. Riprova.");
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

      setPasswordMessage("Password aggiornata con successo.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage(null);
      }, 2000);
    } catch (err) {
      console.error(err);
      setPasswordMessage("Non sono riuscito ad aggiornare la password. Riprova.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return <p className="p-4 text-center text-sm text-ink-muted">Carico...</p>;
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
        <h1 className="text-lg font-semibold text-ink">Profilo</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <User size={16} className="text-ink-muted" />
          <p className="text-sm font-medium text-ink">Il tuo nome</p>
          {role && (
            <span className="ml-auto rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-medium text-primary">
              {role === "admin" ? "Titolare" : role}
            </span>
          )}
        </div>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Nome e cognome"
          className="mb-4 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <div className="mb-3 flex items-center gap-2">
          <Store size={16} className="text-ink-muted" />
          <p className="text-sm font-medium text-ink">Nome del ristorante</p>
        </div>
        <input
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="Nome del ristorante"
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
        />

        <button
          onClick={handleSaveProfile}
          disabled={isSavingProfile}
          className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSavingProfile && <Loader2 size={16} className="animate-spin" />}
          {profileSaved ? "Salvato!" : "Salva"}
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Mail size={16} className="text-ink-muted" />
          <p className="text-sm font-medium text-ink">Email di accesso</p>
        </div>
        <p className="mb-2 text-sm text-ink-muted">{currentEmail}</p>

        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            className="touch-target rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink-muted"
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
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            {emailMessage && (
              <p className="mb-2 text-xs text-ink-muted">{emailMessage}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                  setEmailMessage(null);
                }}
                className="touch-target flex-1 rounded-xl border border-black/10 py-2 text-sm font-medium text-ink-muted"
              >
                Annulla
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={isSavingEmail || !newEmail.trim()}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {isSavingEmail && <Loader2 size={16} className="animate-spin" />}
                Conferma
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Lock size={16} className="text-ink-muted" />
          <p className="text-sm font-medium text-ink">Password</p>
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            className="touch-target rounded-lg border border-black/10 px-3 py-2 text-xs font-medium text-ink-muted"
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
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Conferma password"
              type="password"
              className="mb-2 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            {passwordMessage && (
              <p
                className={`mb-2 text-xs ${
                  passwordMessage.includes("successo") ? "text-status-free" : "text-status-danger"
                }`}
              >
                {passwordMessage}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordMessage(null);
                }}
                className="touch-target flex-1 rounded-xl border border-black/10 py-2 text-sm font-medium text-ink-muted"
              >
                Annulla
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isSavingPassword || !newPassword || !confirmPassword}
                className="touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {isSavingPassword && <Loader2 size={16} className="animate-spin" />}
                <Check size={16} />
                Salva
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
