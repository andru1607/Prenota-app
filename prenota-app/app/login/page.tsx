"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendMessage(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("email not confirmed")) {
          setError("Devi prima confermare la tua email. Controlla la posta in arrivo.");
          setShowResend(true);
        } else {
          setError("Email o password errati.");
        }
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

  async function handleResendConfirmation() {
    setResendMessage(null);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (resendError) throw resendError;
      setResendMessage("Email di conferma inviata di nuovo. Controlla la posta.");
    } catch (err) {
      console.error(err);
      setResendMessage("Non sono riuscito a inviare di nuovo l'email. Riprova tra poco.");
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
          <p className="text-sm text-ink-muted">Accedi con il tuo account</p>
        </div>

        <div className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoFocus
            autoCapitalize="none"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-black/10 px-3 py-2.5 text-sm"
          />
        </div>

        {error && <p className="mt-2 text-sm text-status-danger">{error}</p>}

        {showResend && (
          <button
            type="button"
            onClick={handleResendConfirmation}
            className="mt-2 text-sm font-medium text-primary"
          >
            Invia di nuovo l'email di conferma
          </button>
        )}

        {resendMessage && <p className="mt-2 text-xs text-ink-muted">{resendMessage}</p>}

        <button
          type="submit"
          disabled={isLoading || email.length === 0 || password.length === 0}
          className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isLoading && <Loader2 size={18} className="animate-spin" />}
          {isLoading ? "Accedo..." : "Accedi"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Non hai un account?{" "}
          <Link href="/signup" className="font-medium text-primary">
            Registrati
          </Link>
        </p>
      </form>
    </div>
  );
}
