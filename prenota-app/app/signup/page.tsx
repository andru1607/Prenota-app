"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, Loader2, MailCheck } from "lucide-react";

export default function SignupPage() {
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
        body: JSON.stringify({ email, password, fullName, restaurantName, website }),
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

        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
            <Store size={22} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Crea il tuo ristorante</h1>
          <p className="text-sm text-ink-muted">Registrati per iniziare a usare Prenota</p>
        </div>

        <div className="space-y-2">
          <input
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Nome del ristorante"
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
