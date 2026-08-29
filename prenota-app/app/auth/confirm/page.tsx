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
    <div className="flex min-h-screen items-center justify-center bg-[#1A1310] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#3A2C22] bg-[#251C17] p-6 text-center">
        {status === "checking" && (
          <>
            <Loader2 size={28} className="mx-auto mb-3 animate-spin text-[#C17F45]" />
            <p className="text-sm text-[#A69686]">Confermo il tuo account...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-[#7C9473]/40 bg-[#7C9473]/15 text-[#7C9473]">
              <Check size={24} />
            </div>
            <h1 className="text-lg font-semibold text-[#F0E9E0]">Account confermato!</h1>
            <p className="mt-2 text-sm text-[#A69686]">Ti porto alla tua Dashboard...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-[#C0503D]/40 bg-[#C0503D]/15 text-[#D97A63]">
              <X size={24} />
            </div>
            <h1 className="text-lg font-semibold text-[#F0E9E0]">Link non valido</h1>
            <p className="mt-2 text-sm text-[#A69686]">
              Il link potrebbe essere scaduto o già usato. Prova ad accedere: se l'account
              non è ancora confermato te lo diremo lì.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-medium text-[#C17F45]">
              Vai al login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
