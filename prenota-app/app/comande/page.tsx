"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X, Check, Loader2, Send, Trash2, Search, Printer, UtensilsCrossed } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
}

interface TableOption {
  id: string;
  number: string;
}

interface OrderItem {
  id: string;
  menu_item_id: string | null;
  name: string;
  quantity: number;
  notes: string | null;
  status: "pending" | "in_progress" | "ready" | "served";
}

interface Order {
  id: string;
  table_id: string | null;
  tableNumber: string | null;
  status: "open" | "sent" | "ready" | "served";
  created_at: string;
  items: OrderItem[];
}

const ITEM_STATUS_LABEL: Record<OrderItem["status"], string> = {
  pending: "In attesa",
  in_progress: "In preparazione",
  ready: "Pronto",
  served: "Servito",
};

function sortTablesByNumber(tables: TableOption[]): TableOption[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

export default function ComandePage() {
  const { show } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [newOrderTableId, setNewOrderTableId] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  const [menuSearch, setMenuSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { orders: data } = await res.json();
      setOrders(data ?? []);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare le comande.");
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setIsLoading(true);
      await Promise.all([
        loadOrders(),
        fetch("/api/menu")
          .then((res) => (res.ok ? res.json() : null))
          .then((body) => setMenuItems(body?.items ?? []))
          .catch(() => {}),
        fetch("/api/tables")
          .then((res) => (res.ok ? res.json() : null))
          .then((body) => setTables(sortTablesByNumber(body?.tables ?? [])))
          .catch(() => {}),
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, [loadOrders]);

  const tablesWithoutOrder = tables.filter((t) => !orders.some((o) => o.table_id === t.id));
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  async function handleCreateOrder() {
    setIsCreatingOrder(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: newOrderTableId || null }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");

      setShowNewOrder(false);
      setNewOrderTableId("");
      await loadOrders();
      setSelectedOrderId(body.order.id);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aprire la comanda.", "error");
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function handleAddItem(menuItem: MenuItem) {
    if (!selectedOrderId) return;
    const quantity = quantities[menuItem.id] || 1;
    setAddingItemId(menuItem.id);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          orderId: selectedOrderId,
          menuItemId: menuItem.id,
          quantity,
        }),
      });
      if (!res.ok) throw new Error("Errore");
      setQuantities((prev) => ({ ...prev, [menuItem.id]: 1 }));
      await loadOrders();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiungere il piatto.", "error");
    } finally {
      setAddingItemId(null);
    }
  }

  async function handleRemoveItem(itemId: string) {
    if (!selectedOrderId) return;
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_item", orderId: selectedOrderId, itemId }),
      });
      if (!res.ok) throw new Error("Errore");
      await loadOrders();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a togliere il piatto.", "error");
    }
  }

  async function handleSend() {
    if (!selectedOrderId) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", orderId: selectedOrderId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");
      show("Comanda inviata in cucina");
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      show(err.message || "Non sono riuscito a inviare la comanda.", "error");
    } finally {
      setIsSending(false);
    }
  }

  async function handleClose() {
    if (!selectedOrderId) return;
    if (!confirm("Chiudere questa comanda? Sparirà dall'elenco attivo.")) return;
    setIsClosing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", orderId: selectedOrderId }),
      });
      if (!res.ok) throw new Error("Errore");
      show("Comanda chiusa");
      setSelectedOrderId(null);
      await loadOrders();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a chiudere la comanda.", "error");
    } finally {
      setIsClosing(false);
    }
  }

  const filteredMenu = menuItems.filter((m) =>
    m.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

  if (selectedOrder) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => setSelectedOrderId(null)}
            className="touch-target flex items-center gap-1.5 text-sm font-medium text-ink-muted"
          >
            <X size={18} />
            Chiudi vista
          </button>
          <h1 className="text-base font-semibold text-ink">
            {selectedOrder.tableNumber ? `Tavolo ${selectedOrder.tableNumber}` : "Comanda"}
          </h1>
          <button
            onClick={() => window.print()}
            className="touch-target grid place-items-center rounded-lg text-ink-muted"
            aria-label="Stampa comanda"
          >
            <Printer size={18} />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-black/5 bg-white p-4 print:border-none print:shadow-none">
          <p className="mb-2 text-sm font-medium text-ink">
            Piatti ({selectedOrder.items.length})
          </p>
          {selectedOrder.items.length === 0 ? (
            <p className="text-sm text-ink-muted">Nessun piatto ancora, aggiungine uno qui sotto.</p>
          ) : (
            <div className="space-y-2">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-ink">
                      {item.quantity}× {item.name}
                    </p>
                    {item.notes && <p className="text-xs text-ink-muted">{item.notes}</p>}
                    {selectedOrder.status !== "open" && (
                      <p className="text-xs text-ink-muted">{ITEM_STATUS_LABEL[item.status]}</p>
                    )}
                  </div>
                  {selectedOrder.status === "open" && (
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted print:hidden"
                      aria-label="Rimuovi piatto"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedOrder.status === "open" && (
          <div className="print:hidden">
            <div className="relative mb-3">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
              />
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Cerca nel menu"
                className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm"
              />
            </div>

            {filteredMenu.length === 0 ? (
              <EmptyState
                icon={UtensilsCrossed}
                title="Nessun piatto trovato"
                description="Aggiungi piatti dalla Vetrina per poterli usare qui."
              />
            ) : (
              <div className="space-y-2">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-black/5 bg-white p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{item.name}</p>
                      {item.category && <p className="text-xs text-ink-muted">{item.category}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={quantities[item.id] || 1}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="num-tabular w-14 rounded-lg border border-black/10 px-2 py-1.5 text-center text-sm"
                      />
                      <button
                        onClick={() => handleAddItem(item)}
                        disabled={addingItemId === item.id}
                        className="touch-target grid place-items-center rounded-lg bg-primary text-white disabled:opacity-50"
                        aria-label={`Aggiungi ${item.name}`}
                      >
                        {addingItemId === item.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Plus size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={isSending || selectedOrder.items.length === 0}
              className="touch-target mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              Invia in cucina
            </button>
          </div>
        )}

        {selectedOrder.status === "served" && (
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-medium text-ink-muted disabled:opacity-50 print:hidden"
          >
            {isClosing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Chiudi comanda
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Comande</h1>
        <button
          onClick={() => setShowNewOrder((v) => !v)}
          className="touch-target flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white"
        >
          <Plus size={18} />
          Nuova
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      {showNewOrder && (
        <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
          <p className="mb-2 text-sm font-medium text-ink">Apri comanda per tavolo</p>
          <select
            value={newOrderTableId}
            onChange={(e) => setNewOrderTableId(e.target.value)}
            className="mb-3 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          >
            <option value="">Senza tavolo (es. asporto)</option>
            {tablesWithoutOrder.map((t) => (
              <option key={t.id} value={t.id}>
                Tavolo {t.number}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateOrder}
            disabled={isCreatingOrder}
            className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {isCreatingOrder && <Loader2 size={16} className="animate-spin" />}
            Apri comanda
          </button>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nessuna comanda aperta"
          description='Usa "Nuova" per iniziarne una.'
        />
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrderId(order.id)}
              className="animate-fade-in touch-target flex w-full items-center justify-between rounded-xl border border-black/5 bg-white p-3 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">
                  {order.tableNumber ? `Tavolo ${order.tableNumber}` : "Senza tavolo"}
                </p>
                <p className="text-xs text-ink-muted">
                  {order.items.length} piatt{order.items.length === 1 ? "o" : "i"} ·{" "}
                  {order.status === "open"
                    ? "Da inviare"
                    : order.status === "sent"
                    ? "In cucina"
                    : order.status === "ready"
                    ? "Pronto"
                    : "Servito"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  order.status === "ready" || order.status === "served"
                    ? "bg-status-freeBg text-status-free"
                    : order.status === "sent"
                    ? "bg-status-pendingBg text-status-pending"
                    : "bg-bg-subtle text-ink-muted"
                }`}
              >
                {order.status === "open"
                  ? "Aperta"
                  : order.status === "sent"
                  ? "Inviata"
                  : order.status === "ready"
                  ? "Pronta"
                  : "Servita"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
