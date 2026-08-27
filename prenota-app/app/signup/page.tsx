"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Martini, Loader2, MailCheck, ArrowLeft } from "lucide-react";

type BusinessType = "ristorante" | "bar";

const BUSINESS_TYPES: {
  value: BusinessType;
  label: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    value: "ristorante",
    label: "Ristorante",
    description: "Prenotazioni, sala e menu in un unico posto",
    icon: Store,
  },
  {
    value: "bar",
    label: "Bar",
    description: "Ricette cocktail, dosi e magazzino sotto controllo",
    icon: Martini,
  },
];

export default function SignupPage() {
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          restaurantName,
          website,
          businessType,
        }),
      });
      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Qualcosa è andato storto. Riprova.");
        return;
      }

      setRegisteredEmail(email);
    } catch (err) {
      console.error(err);
      setError("Qualcosa è andato storto. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
            <MailCheck size={24} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Controlla la tua email</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Ti abbiamo inviato un link di conferma a <strong>{registeredEmail}</strong>.
            Toccalo per attivare l'account e iniziare a usare Prenota.
          </p>
          <p className="mt-4 text-xs text-ink-muted">
            Non trovi l'email? Controlla anche nello spam.
          </p>
        </div>
      </div>
    );
  }

  if (!businessType) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 text-center">
            <h1 className="text-lg font-semibold text-ink">Che attività gestisci?</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Scegli il tipo di locale: l'app si adatta di conseguenza
            </p>
          </div>

          <div className="space-y-2">
            {BUSINESS_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setBusinessType(type.value)}
                  className="touch-target flex w-full items-center gap-3 rounded-xl border border-black/10 p-3 text-left active:bg-bg-subtle"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-light text-primary">
                    <Icon size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{type.label}</p>
                    <p className="text-xs text-ink-muted">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-sm text-ink-muted">
            Hai già un account?{" "}
            <Link href="/login" className="font-medium text-primary">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const isBar = businessType === "bar";

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px" }}
        />

        <button
          type="button"
          onClick={() => setBusinessType(null)}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted"
        >
          <ArrowLeft size={14} />
          Cambia tipo di attività
        </button>

        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
            {isBar ? <Martini size={22} /> : <Store size={22} />}
          </div>
          <h1 className="text-lg font-semibold text-ink">
            {isBar ? "Crea il tuo bar" : "Crea il tuo ristorante"}
          </h1>
          <p className="text-sm text-ink-muted">
            {isBar
              ? "Ricette, dosi e magazzino sempre sotto controllo"
              : "Prenotazioni, sala e menu in un unico posto — sempre allineati"}
          </p>
        </div>

        <div className="space-y-2">
          <input
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder={isBar ? "Nome del bar" : "Nome del ristorante"}
            autoFocus
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Il tuo nome"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoCapitalize="none"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (almeno 6 caratteri)"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
        </div>

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={isLoading || !restaurantName || !email || password.length < 6}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? "Creo l'account..." : "Registrati"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Hai già un account?{" "}
          <Link href="/login" className="font-medium text-primary">
            Accedi
          </Link>
        </p>
      </form>
    </div>
  );
}
