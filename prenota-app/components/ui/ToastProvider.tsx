"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Check, X, Info } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { show: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto flex max-w-[90vw] items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg ${
              t.type === "success"
                ? "bg-[#7C9473] text-[#1A1310]"
                : t.type === "error"
                ? "bg-[#C0503D] text-white"
                : "border border-[#C17F45]/30 bg-[#251C17] text-[#F0E9E0]"
            }`}
          >
            {t.type === "success" && <Check size={15} className="shrink-0" />}
            {t.type === "error" && <X size={15} className="shrink-0" />}
            {t.type === "info" && <Info size={15} className="shrink-0 text-[#C17F45]" />}
            <span className="truncate">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
