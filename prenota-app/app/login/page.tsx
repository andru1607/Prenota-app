"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        setError("Password errata. Riprova.");
        return;
      }

      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Qualcosa è andato storto. Riprova.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-light text-primary">
            <Lock size={22} />
          </div>
          <h1 className="text-lg font-semibold text-ink">Prenota</h1>
          <p className="text-sm text-ink-muted">Inserisci la password per accedere</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
        />

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

        <button
          type="submit"
          disabled={isLoading || password.length === 0}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? "Verifico..." : "Entra"}
        </button>
      </form>
    </div>
  );
}
