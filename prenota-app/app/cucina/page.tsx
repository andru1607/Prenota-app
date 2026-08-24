"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { UtensilsCrossed } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "in_progress" | "ready" | "served";
  course: number;
  sent_at: string | null;
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
  pending: "bg-white border-black/10 text-ink",
  in_progress: "bg-status-pendingBg border-status-pending text-status-pending",
  ready: "bg-status-freeBg border-status-free text-status-free",
  served: "bg-bg-subtle border-black/5 text-ink-muted",
};

export default function CucinaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updatingItemIds = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Errore");
      const { orders: data } = await res.json();
      const activeOrders = (data ?? [])
        .filter((o: Order) => o.status !== "open")
        .map((o: Order) => ({ ...o, items: o.items.filter((i) => i.sent_at) }))
        .filter((o: Order) => o.items.length > 0);
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
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  async function handleItemTap(orderId: string, item: OrderItem) {
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

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Cucina</h1>
        <button
          onClick={load}
          className="touch-target grid place-items-center rounded-xl border border-black/10 text-ink-muted"
          aria-label="Aggiorna ora"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {orders.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title="Nessuna comanda in corso" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const allReady = order.items.every((i) => i.status === "ready" || i.status === "served");
            return (
              <div
                key={order.id}
                className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${
                  allReady ? "border-status-free" : "border-black/5"
                }`}
              >
                <p className="mb-3 text-lg font-bold text-ink">
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
