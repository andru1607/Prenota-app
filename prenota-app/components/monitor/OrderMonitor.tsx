"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Loader2, UtensilsCrossed, ChefHat, Wine } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { playAlertSound, unlockAlertSound } from "@/lib/alertSound";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "in_progress" | "ready" | "served";
  course: number;
  sent_at: string | null;
  destination: "kitchen" | "bar";
}

interface Order {
  id: string;
  table_id: string | null;
  tableNumber: string | null;
  status: "open" | "sent" | "ready" | "served";
  created_at: string;
  items: OrderItem[];
}

const POLL_INTERVAL_MS = 15_000;

const NEXT_STATUS: Record<OrderItem["status"], OrderItem["status"]> = {
  pending: "in_progress",
  in_progress: "ready",
  ready: "served",
  served: "served",
};

const STATUS_LABEL: Record<OrderItem["status"], string> = {
  pending: "In attesa",
  in_progress: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

const STATUS_COLOR: Record<OrderItem["status"], string> = {
  pending: "bg-[#251C17] border-[#3A2C22] text-[#F0E9E0]",
  in_progress: "bg-[#E3A857]/15 border-[#E3A857] text-[#E3A857]",
  ready: "bg-[#7C9473]/15 border-[#7C9473] text-[#7C9473]",
  served: "bg-[#1A1310] border-[#3A2C22] text-[#A69686]",
};

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export function OrderMonitor({ defaultView }: { defaultView: "kitchen" | "bar" }) {
  const [view, setView] = useState<"kitchen" | "bar">(defaultView);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updatingItemIds = useRef<Set<string>>(new Set());
  const knownItemIds = useRef<Set<string> | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Errore");
      const { orders: data } = await res.json();
      const activeOrders = (data ?? [])
        .filter((o: Order) => o.status !== "open")
        .map((o: Order) => ({
          ...o,
          items: o.items.filter((i) => i.sent_at && i.destination === viewRef.current),
        }))
        .filter((o: Order) => o.items.length > 0);

      const currentIds = new Set<string>(
        activeOrders.flatMap((o: Order) => o.items.map((i) => i.id))
      );
      if (knownItemIds.current) {
        const hasNewItem = [...currentIds].some((id) => !knownItemIds.current!.has(id));
        if (hasNewItem) playAlertSound();
      }
      knownItemIds.current = currentIds;

      setOrders(activeOrders);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito ad aggiornare le comande.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    knownItemIds.current = null;
    setIsLoading(true);
    load();
  }, [view, load]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (interval) return;
      interval = setInterval(load, POLL_INTERVAL_MS);
    }
    function stopPolling() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        load();
        startPolling();
      } else {
        stopPolling();
      }
    }

    startPolling();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [load]);

  async function handleItemTap(orderId: string, item: OrderItem) {
    unlockAlertSound();
    if (item.status === "served" || updatingItemIds.current.has(item.id)) return;
    const nextStatus = NEXT_STATUS[item.status];
    updatingItemIds.current.add(item.id);

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i)) }
          : o
      )
    );

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "item_status", orderId, itemId: item.id, status: nextStatus }),
      });
      if (!res.ok) throw new Error("Errore");
      await load();
    } catch (err) {
      console.error(err);
      load();
    } finally {
      updatingItemIds.current.delete(item.id);
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex rounded-xl border border-[#3A2C22] bg-[#251C17] p-1">
          <button
            onClick={() => setView("kitchen")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
              view === "kitchen" ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]" : "text-[#A69686]"
            }`}
          >
            <ChefHat size={16} />
            Cucina
          </button>
          <button
            onClick={() => setView("bar")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
              view === "bar" ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]" : "text-[#A69686]"
            }`}
          >
            <Wine size={16} />
            Bar
          </button>
        </div>
        <button
          onClick={() => {
            unlockAlertSound();
            load();
          }}
          className="touch-target grid place-items-center rounded-xl border border-[#3A2C22] bg-[#251C17] text-[#A69686]"
          aria-label="Aggiorna ora"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">{error}</p>
      )}

      {isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={28} className="animate-spin text-[#C17F45]" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Nessuna comanda in corso" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const allReady = order.items.every((i) => i.status === "ready" || i.status === "served");
            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 bg-[#251C17] p-4 ${
                  allReady ? "border-[#7C9473]" : "border-[#3A2C22]"
                }`}
              >
                <p className="mb-3 text-lg font-bold text-[#F0E9E0]">
                  {order.tableNumber ? `Tavolo ${order.tableNumber}` : "Senza tavolo"}
                </p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemTap(order.id, item)}
                      disabled={item.status === "served"}
                      className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left disabled:opacity-70 ${STATUS_COLOR[item.status]}`}
                    >
                      <div className="min-w-0">
                        <p className="text-base font-semibold">
                          {item.quantity}× {item.name}
                        </p>
                        {item.notes && <p className="text-sm opacity-80">{item.notes}</p>}
                      </div>
                      <span className="shrink-0 text-sm font-medium">{STATUS_LABEL[item.status]}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
