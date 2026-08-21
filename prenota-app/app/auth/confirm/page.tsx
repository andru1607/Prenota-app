"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking");

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1200);
      }
    });

    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "error" : current));
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
        {status === "checking" && (
          <>
            <Loader2 size={28} className="mx-auto mb-3 animate-spin text-primary" />
            <p className="text-sm text-ink-muted">Confermo il tuo account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-status-freeBg text-status-free">
              <Check size={24} />
            </div>
            <h1 className="text-lg font-semibold text-ink">Account confermato!</h1>
            <p className="mt-2 text-sm text-ink-muted">Ti porto alla tua Dashboard...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-status-dangerBg text-status-danger">
              <X size={24} />
            </div>
            <h1 className="text-lg font-semibold text-ink">Link non valido</h1>
            <p className="mt-2 text-sm text-ink-muted">
              Il link potrebbe essere scaduto o già usato. Prova ad accedere: se l'account
              non è ancora confermato te lo diremo lì.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-primary">
              Vai al login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
