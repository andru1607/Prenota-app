"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Plus,
  X,
  Check,
  Loader2,
  Send,
  Trash2,
  Search,
  Printer,
  UtensilsCrossed,
  ArrowLeft,
  Receipt,
  Clock,
} from "lucide-react";
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

const COURSE_LABELS: Record<number, string> = {
  1: "Subito",
  2: "Seg. 2",
  3: "Seg. 3",
  4: "Seg. 4",
};

const CATEGORY_COLORS = [
  "#DC2626",
  "#111827",
  "#CA8A04",
  "#78350F",
  "#7C3AED",
  "#0F766E",
  "#1D4ED8",
  "#EA580C",
  "#BE185D",
  "#4D7C0F",
];

function colorForCategory(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function sortTablesByNumber(tables: TableOption[]): TableOption[] {
  return [...tables].sort((a, b) => {
    const numA = Number(a.number);
    const numB = Number(b.number);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.number.localeCompare(b.number);
  });
}

function formatElapsed(sentAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(sentAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min fa`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""} fa`;
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

  const [subView, setSubView] = useState<"categories" | "items" | "summary">("categories");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [sendingCourse, setSendingCourse] = useState<number | null>(null);
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

  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category?.trim() || "Menu"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const itemsInCategory = useMemo(
    () => menuItems.filter((m) => (m.category?.trim() || "Menu") === activeCategory),
    [menuItems, activeCategory]
  );

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return menuItems.filter((m) => m.name.toLowerCase().includes(q));
  }, [menuItems, search]);

  const orderTotal = useMemo(() => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.reduce((sum, item) => {
      const menuItem = menuItems.find((m) => m.id === item.menu_item_id);
      return sum + (menuItem?.price ?? 0) * item.quantity;
    }, 0);
  }, [selectedOrder, menuItems]);

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
      setSubView("categories");
      setActiveCourse(1);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aprire la comanda.", "error");
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function handleAddItem(menuItem: MenuItem) {
    if (!selectedOrderId) return;
    setAddingItemId(menuItem.id);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_item",
          orderId: selectedOrderId,
          menuItemId: menuItem.id,
          quantity: 1,
          course: activeCourse,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");
      await loadOrders();
      if (activeCourse === 1) show(`${menuItem.name} inviato in cucina`);
    } catch (err: any) {
      console.error(err);
      show(err.message || "Non sono riuscito ad aggiungere il piatto.", "error");
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
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      show(err.message || "Non sono riuscito a togliere il piatto.", "error");
    }
  }

  async function handleSendCourse(course: number) {
    if (!selectedOrderId) return;
    setSendingCourse(course);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_course", orderId: selectedOrderId, course }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");
      show(`${COURSE_LABELS[course]} inviata in cucina`);
      await loadOrders();
    } catch (err: any) {
      console.error(err);
      show(err.message || "Non sono riuscito a inviare questa portata.", "error");
    } finally {
      setSendingCourse(null);
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

  function priceFor(item: OrderItem): number {
    return menuItems.find((m) => m.id === item.menu_item_id)?.price ?? 0;
  }

  if (selectedOrder) {
    const allServed =
      selectedOrder.items.length > 0 && selectedOrder.items.every((i) => i.status === "served" && i.sent_at);

    return (
      <div className="flex min-h-screen flex-col bg-bg pb-20">
        <div className="sticky top-0 z-10 border-b border-black/5 bg-white">
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={() => {
                if (subView !== "categories") {
                  setSubView("categories");
                  setActiveCategory(null);
                  setSearch("");
                } else {
                  setSelectedOrderId(null);
                }
              }}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Indietro"
            >
              <ArrowLeft size={20} />
            </button>

            {subView === "categories" ? (
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    selectedOrder.tableNumber ? `Tavolo ${selectedOrder.tableNumber} — cerca...` : "Cerca un piatto..."
                  }
                  className="w-full rounded-lg border border-black/10 bg-bg-subtle py-2 pl-8 pr-3 text-sm"
                />
              </div>
            ) : (
              <h1 className="flex-1 truncate text-base font-semibold text-ink">
                {subView === "items"
                  ? activeCategory
                  : selectedOrder.tableNumber
                  ? `Tavolo ${selectedOrder.tableNumber}`
                  : "Comanda"}
              </h1>
            )}

            <button
              onClick={() => setSubView(subView === "summary" ? "categories" : "summary")}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Riepilogo comanda"
            >
              <Receipt size={20} />
            </button>
            <button
              onClick={() => window.print()}
              className="touch-target grid place-items-center rounded-lg text-ink-muted"
              aria-label="Stampa"
            >
              <Printer size={18} />
            </button>
          </div>

          {subView !== "summary" && (
            <div className="flex border-t border-black/5">
              {[1, 2, 3, 4].map((course) => (
                <button
                  key={course}
                  onClick={() => setActiveCourse(course)}
                  className={`flex-1 py-2.5 text-sm font-medium ${
                    activeCourse === course
                      ? "border-b-2 border-primary text-primary"
                      : "text-ink-muted"
                  }`}
                >
                  {COURSE_LABELS[course]}
                </button>
              ))}
            </div>
          )}
        </div>

        {subView === "summary" && (
          <div className="flex-1 space-y-3 p-4 print:p-0">
            {selectedOrder.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">
                Nessun piatto ancora. Torna indietro per aggiungerne.
              </p>
            ) : (
              [1, 2, 3, 4].map((course) => {
                const courseItems = selectedOrder.items.filter((i) => i.course === course);
                if (courseItems.length === 0) return null;
                const pending = courseItems.filter((i) => !i.sent_at);
                const sent = courseItems.filter((i) => i.sent_at);
                const earliestSent = sent
                  .map((i) => i.sent_at!)
                  .sort()[0];

                return (
                  <div key={course} className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="flex items-center justify-between bg-ink px-3 py-2 text-white">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            pending.length > 0 ? "bg-status-pending" : "bg-status-free"
                          }`}
                        />
                        {COURSE_LABELS[course]}
                      </span>
                      {earliestSent && (
                        <span className="flex items-center gap-1 text-xs text-white/70">
                          <Clock size={12} />
                          {formatElapsed(earliestSent)}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-black/5">
                      {courseItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <p className="text-ink">
                              {item.quantity}× {item.name}
                            </p>
                            {item.notes && <p className="text-xs text-ink-muted">{item.notes}</p>}
                            <p className="text-xs text-ink-muted">
                              {!item.sent_at ? "Da inviare" : `€${(priceFor(item) * item.quantity).toFixed(2)}`}
                            </p>
                          </div>
                          {!item.sent_at && (
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
                    {pending.length > 0 && (
                      <button
                        onClick={() => handleSendCourse(course)}
                        disabled={sendingCourse === course}
                        className="flex w-full items-center justify-center gap-2 bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50 print:hidden"
                      >
                        {sendingCourse === course ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Send size={16} />
                        )}
                        Invia questa portata
                      </button>
                    )}
                  </div>
                );
              })
            )}

            {allServed && (
              <button
                onClick={handleClose}
                disabled={isClosing}
                className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white py-3 text-sm font-medium text-ink-muted disabled:opacity-50 print:hidden"
              >
                {isClosing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Chiudi comanda
              </button>
            )}
          </div>
        )}

        {subView === "categories" && (
          <div className="flex-1 p-3">
            {searchResults ? (
              searchResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-muted">Nessun piatto trovato.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {searchResults.map((item) => (
                    <ItemTile
                      key={item.id}
                      item={item}
                      isAdding={addingItemId === item.id}
                      onTap={() => handleAddItem(item)}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => {
                  const count = menuItems.filter((m) => (m.category?.trim() || "Menu") === category).length;
                  const color = colorForCategory(category);
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        if (count === 0) return;
                        setActiveCategory(category);
                        setSubView("items");
                      }}
                      className="touch-target flex aspect-square flex-col items-center justify-center rounded-xl p-2 text-center text-xs font-semibold uppercase leading-tight text-white"
                      style={{ backgroundColor: color }}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subView === "items" && (
          <div className="flex-1 p-3">
            <div className="grid grid-cols-3 gap-2">
              {itemsInCategory.map((item) => (
                <ItemTile
                  key={item.id}
                  item={item}
                  isAdding={addingItemId === item.id}
                  onTap={() => handleAddItem(item)}
                />
              ))}
            </div>
          </div>
        )}

        {subView !== "summary" && (
          <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between bg-primary px-4 py-3 text-white print:hidden">
            <button
              onClick={() => setSubView("summary")}
              className="touch-target grid place-items-center rounded-lg"
              aria-label="Vedi riepilogo"
            >
              <Receipt size={20} />
            </button>
            <span className="num-tabular text-lg font-bold">€{orderTotal.toFixed(2)}</span>
            {subView === "items" ? (
              <button
                onClick={() => {
                  setSubView("categories");
                  setActiveCategory(null);
                }}
                className="touch-target grid place-items-center rounded-lg"
                aria-label="Altre categorie"
              >
                <Plus size={20} />
              </button>
            ) : (
              <span className="w-9" />
            )}
          </div>
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
          {orders.map((order) => {
            const pendingCount = order.items.filter((i) => !i.sent_at).length;
            return (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setSubView("categories");
                  setActiveCourse(1);
                }}
                className="animate-fade-in touch-target flex w-full items-center justify-between rounded-xl border border-black/5 bg-white p-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {order.tableNumber ? `Tavolo ${order.tableNumber}` : "Senza tavolo"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {order.items.length} piatt{order.items.length === 1 ? "o" : "i"}
                    {pendingCount > 0 ? ` · ${pendingCount} da inviare` : ""}
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
                    ? "In cucina"
                    : order.status === "ready"
                    ? "Pronta"
                    : "Servita"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemTile({
  item,
  isAdding,
  onTap,
}: {
  item: MenuItem;
  isAdding: boolean;
  onTap: () => void;
}) {
  const color = item.category ? colorForCategory(item.category) : "#111827";
  return (
    <button
      onClick={onTap}
      disabled={isAdding}
      className="touch-target flex aspect-square flex-col items-center justify-center gap-1 rounded-xl p-2 text-center text-white disabled:opacity-60"
      style={{ backgroundColor: color }}
    >
      {isAdding ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <>
          <span className="num-tabular text-sm font-bold">
            {item.price !== null ? `€${item.price.toFixed(2)}` : "—"}
          </span>
          <span className="text-[11px] font-medium leading-tight">{item.name}</span>
        </>
      )}
    </button>
  );
}
