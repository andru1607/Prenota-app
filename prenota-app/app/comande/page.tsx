"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Plus,
  Minus,
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
  ShoppingBag,
  Euro,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { LockedFeature } from "@/components/ui/LockedFeature";
import { useToast } from "@/components/ui/ToastProvider";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { hasAccessToFeature } from "@/lib/subscription";
import { MENU_GROUPS, groupForCategory } from "@/lib/menuGroups";

interface MenuItem {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
}

interface TableOption {
  id: string;
  number: string;
  roomId: string | null;
}

interface Room {
  id: string;
  name: string;
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

const COURSE_LABELS: Record<number, string> = {
  1: "Subito",
  2: "Seg. 2",
  3: "Seg. 3",
  4: "Seg. 4",
};

const ROOM_FILTER_KEY = "prenota-app:comandeRoomFilter";

const GROUP_COLORS = [
  "#A6473A",
  "#5C7247",
  "#C79A3D",
  "#2F6459",
  "#6B3654",
  "#C1662E",
  "#4A5568",
  "#8B4A2B",
  "#9C7A2E",
  "#A85D5D",
];

function colorForGroup(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return GROUP_COLORS[hash % GROUP_COLORS.length];
}

function sortTablesByNumber<T extends { number: string }>(tables: T[]): T[] {
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

function useLongPress(onLongPress: () => void, ms = 450) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = () => {
    timerRef.current = setTimeout(onLongPress, ms);
  };
  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onContextMenu: (e: React.SyntheticEvent) => e.preventDefault(),
  };
}

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export default function ComandePage() {
  const { show } = useToast();
  const { info: subInfo, isLoading: subLoading } = useSubscription();
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOpeningTable, setIsOpeningTable] = useState<string | null>(null);
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const [subView, setSubView] = useState<"general" | "categories" | "items" | "bill">("general");
  const [splitPeople, setSplitPeople] = useState(2);
  const [activeGroupLabel, setActiveGroupLabel] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [sendingCourse, setSendingCourse] = useState<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
          .then((body) =>
            setTables(
              sortTablesByNumber(
                (body?.tables ?? []).map((t: any) => ({
                  id: t.id,
                  number: t.number,
                  roomId: t.room_id ?? null,
                }))
              )
            )
          )
          .catch(() => {}),
        fetch("/api/rooms")
          .then((res) => (res.ok ? res.json() : null))
          .then((body) => {
            const list = body?.rooms ?? [];
            setRooms(list);
            const saved = window.localStorage.getItem(ROOM_FILTER_KEY);
            if (saved) {
              setRoomFilter(saved);
            } else if (list.length > 0) {
              setRoomFilter(list[0].id);
            }
          })
          .catch(() => {}),
      ]);
      setIsLoading(false);
    }
    loadAll();
  }, [loadOrders]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) ?? null;

  const roomGroups = useMemo(() => {
    const groups = [
      ...rooms.map((r) => ({ room: r, tables: tables.filter((t) => t.roomId === r.id) })),
      {
        room: null as Room | null,
        tables: tables.filter((t) => !t.roomId || !rooms.some((r) => r.id === t.roomId)),
      },
    ];
    return groups.filter((g) => g.tables.length > 0);
  }, [rooms, tables]);

  const visibleRoomGroups = useMemo(() => {
    if (rooms.length === 0) return roomGroups;
    if (roomFilter === "none") return roomGroups.filter((g) => g.room === null);
    return roomGroups.filter((g) => g.room?.id === roomFilter);
  }, [roomGroups, rooms, roomFilter]);

  function handleRoomFilterChange(value: string) {
    setRoomFilter(value);
    window.localStorage.setItem(ROOM_FILTER_KEY, value);
  }

  const hasTablesWithoutRoom = tables.some(
    (t) => !t.roomId || !rooms.some((r) => r.id === t.roomId)
  );

  const takeoutOrders = orders.filter((o) => !o.table_id);

  const itemsInGroup = useMemo(() => {
    if (!activeGroupLabel) return [];
    return menuItems.filter((m) => groupForCategory(m.category).label === activeGroupLabel);
  }, [menuItems, activeGroupLabel]);

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

  async function handleOpenTable(tableId: string | null, label: string) {
    const existing = tableId ? orders.find((o) => o.table_id === tableId) : null;
    if (existing) {
      setSelectedOrderId(existing.id);
      setSubView("general");
      setActiveCourse(1);
      return;
    }

    setIsOpeningTable(tableId ?? "takeout");
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");

      await loadOrders();
      setSelectedOrderId(body.order.id);
      setSubView("general");
      setActiveCourse(1);
    } catch (err) {
      console.error(err);
      show(`Non sono riuscito ad aprire la comanda per ${label}.`, "error");
    } finally {
      setIsOpeningTable(null);
    }
  }

  async function handleDeleteOrder(orderId: string, label: string) {
    if (!confirm(`Eliminare la comanda di ${label}? Non si può annullare.`)) return;
    setIsDeleting(true);
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    if (selectedOrderId === orderId) setSelectedOrderId(null);
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore");
      show("Comanda eliminata");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad eliminare la comanda.", "error");
      loadOrders();
    } finally {
      setIsDeleting(false);
    }
  }

  function handleAddItem(menuItem: MenuItem) {
    if (!selectedOrderId) return;
    const course = activeCourse;
    const nowIso = new Date().toISOString();

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== selectedOrderId) return o;
        const existing = o.items.find(
          (i) => i.menu_item_id === menuItem.id && i.course === course && !i.sent_at
        );
        if (existing) {
          return {
            ...o,
            items: o.items.map((i) =>
              i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        const optimisticItem: OrderItem = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          menu_item_id: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          notes: null,
          status: "pending",
          course,
          sent_at: course === 1 ? nowIso : null,
          destination: groupForCategory(menuItem.category).destination,
        };
        return { ...o, items: [...o.items, optimisticItem] };
      })
    );

    if (course === 1) show(`${menuItem.name} inviato`);

    fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_item",
        orderId: selectedOrderId,
        menuItemId: menuItem.id,
        quantity: 1,
        course,
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Errore");
        loadOrders();
      })
      .catch((err) => {
        console.error(err);
        show(err.message || "Non sono riuscito ad aggiungere il piatto.", "error");
        loadOrders();
      });
  }

  async function handleDeleteItem(itemId: string, itemName: string) {
    if (!selectedOrderId) return;
    if (!confirm(`Togliere "${itemName}" dalla comanda?`)) return;
    setExpandedItemId(null);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrderId ? { ...o, items: o.items.filter((i) => i.id !== itemId) } : o
      )
    );
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_item", orderId: selectedOrderId, itemId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore");
    } catch (err: any) {
      console.error(err);
      show(err.message || "Non sono riuscito a togliere il piatto.", "error");
      loadOrders();
    }
  }

  function handleSetQuantity(itemId: string, quantity: number) {
    if (!selectedOrderId) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrderId
          ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)) }
          : o
      )
    );
    fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_quantity", orderId: selectedOrderId, itemId, quantity }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Errore");
      })
      .catch((err) => {
        console.error(err);
        show(err.message || "Non sono riuscito ad aggiornare la quantità.", "error");
        loadOrders();
      });
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
      show(`${COURSE_LABELS[course]} inviata`);
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

  function openCategories() {
    setSubView("categories");
    setActiveGroupLabel(null);
    setSearch("");
  }

  if (!subLoading && subInfo && !hasAccessToFeature(subInfo.effectiveTier, "comande")) {
    return <LockedFeature feature="comande" />;
  }

  if (selectedOrder) {
    const allServed =
      selectedOrder.items.length > 0 && selectedOrder.items.every((i) => i.status === "served" && i.sent_at);
    const orderLabel = selectedOrder.tableNumber
      ? `Tavolo ${selectedOrder.tableNumber}`
      : "questa comanda";

    return (
      <div className="flex min-h-screen flex-col bg-[#1A1310] pb-24 print:bg-white">
        <div className="sticky top-0 z-20 border-b border-[#3A2C22] bg-[#251C17] print:hidden">
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={() => {
                if (subView === "items") {
                  setSubView("categories");
                  setActiveGroupLabel(null);
                } else if (subView === "categories" || subView === "bill") {
                  setSubView("general");
                  setSearch("");
                } else {
                  setSelectedOrderId(null);
                }
              }}
              className="touch-target grid place-items-center rounded-lg text-[#A69686]"
              aria-label="Indietro"
            >
              <ArrowLeft size={20} />
            </button>

            {subView === "categories" ? (
              <div className="relative flex-1">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A69686]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca un piatto..."
                  className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] py-2 pl-8 pr-3 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                />
              </div>
            ) : (
              <h1 className="flex-1 truncate text-base font-semibold text-[#F0E9E0]">
                {subView === "items"
                  ? activeGroupLabel
                  : subView === "bill"
                  ? "Conto"
                  : selectedOrder.tableNumber
                  ? `Tavolo ${selectedOrder.tableNumber}`
                  : "Comanda"}
              </h1>
            )}

            {subView === "general" && (
              <>
                <button
                  onClick={() => handleDeleteOrder(selectedOrder.id, orderLabel)}
                  disabled={isDeleting}
                  className="touch-target grid place-items-center rounded-lg text-[#D97A63] disabled:opacity-50"
                  aria-label="Elimina comanda"
                >
                  <Trash2 size={18} />
                </button>
                {selectedOrder.items.length > 0 && (
                  <button
                    onClick={() => setSubView("bill")}
                    className="touch-target grid place-items-center rounded-lg text-[#A69686]"
                    aria-label="Vedi conto"
                  >
                    <Euro size={18} />
                  </button>
                )}
                <button
                  onClick={openCategories}
                  className="touch-target flex items-center gap-1 rounded-lg bg-gradient-to-b from-[#C17F45] to-[#A6683A] px-2.5 py-1.5 text-sm font-medium text-[#1A1310]"
                  aria-label="Aggiungi piatti"
                >
                  <Plus size={16} />
                </button>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="touch-target grid place-items-center rounded-lg text-[#A69686]"
              aria-label="Stampa"
            >
              <Printer size={18} />
            </button>
          </div>

          {(subView === "categories" || subView === "items") && (
            <div className="flex border-t border-[#3A2C22]">
              {[1, 2, 3, 4].map((course) => (
                <button
                  key={course}
                  onClick={() => setActiveCourse(course)}
                  className={`flex-1 py-2.5 text-sm font-medium ${
                    activeCourse === course
                      ? "border-b-2 border-[#C17F45] text-[#C17F45]"
                      : "text-[#A69686]"
                  }`}
                >
                  {COURSE_LABELS[course]}
                </button>
              ))}
            </div>
          )}
        </div>

        {subView === "general" && (
          <div className="flex-1 space-y-3 p-4 print:hidden">
            {selectedOrder.items.length === 0 ? (
              <div className="py-6 text-center">
                <p className="mb-3 text-sm text-[#A69686]">Nessun piatto ancora.</p>
                <button
                  onClick={openCategories}
                  className="touch-target inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] px-4 py-2.5 text-sm font-medium text-[#1A1310]"
                >
                  <Plus size={16} />
                  Aggiungi piatti
                </button>
              </div>
            ) : (
              [1, 2, 3, 4].map((course) => {
                const courseItems = selectedOrder.items.filter((i) => i.course === course);
                if (courseItems.length === 0) return null;
                const pending = courseItems.filter((i) => !i.sent_at);
                const sent = courseItems.filter((i) => i.sent_at);
                const earliestSent = sent.map((i) => i.sent_at!).sort()[0];

                return (
                  <div key={course} className="animate-fade-in overflow-hidden rounded-2xl border border-[#3A2C22] bg-[#251C17]">
                    <div className="flex items-center justify-between bg-[#2A211C] px-3 py-2 text-[#F0E9E0]">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            pending.length > 0 ? "bg-[#E3A857]" : "bg-[#7C9473]"
                          }`}
                        />
                        {COURSE_LABELS[course]}
                      </span>
                      {earliestSent && (
                        <span className="flex items-center gap-1 text-xs text-[#A69686]">
                          <Clock size={12} />
                          {formatElapsed(earliestSent)}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-[#3A2C22]">
                      {courseItems.map((item) => (
                        <OrderItemRow
                          key={item.id}
                          item={item}
                          price={priceFor(item)}
                          isExpanded={expandedItemId === item.id}
                          onToggleExpand={() =>
                            setExpandedItemId((prev) => (prev === item.id ? null : item.id))
                          }
                          onSetQuantity={(q) => handleSetQuantity(item.id, q)}
                          onDelete={() => handleDeleteItem(item.id, item.name)}
                        />
                      ))}
                    </div>
                    {pending.length > 0 && (
                      <button
                        onClick={() => handleSendCourse(course)}
                        disabled={sendingCourse === course}
                        className="flex w-full items-center justify-center gap-2 bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-50"
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
                className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-[#3A2C22] bg-[#251C17] py-3 text-sm font-medium text-[#A69686] disabled:opacity-50"
              >
                {isClosing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Chiudi comanda
              </button>
            )}
          </div>
        )}

        {subView === "categories" && (
          <div className="flex-1 p-3 pb-24">
            {searchResults ? (
              searchResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#A69686]">Nessun piatto trovato.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.map((item) => (
                    <ItemTile key={item.id} item={item} onTap={() => handleAddItem(item)} />
                  ))}
                </div>
              )
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {MENU_GROUPS.map((group) => {
                  const count = menuItems.filter(
                    (m) => groupForCategory(m.category).label === group.label
                  ).length;
                  const color = colorForGroup(group.label);
                  return (
                    <button
                      key={group.label}
                      onClick={() => {
                        if (count === 0) return;
                        setActiveGroupLabel(group.label);
                        setSubView("items");
                      }}
                      disabled={count === 0}
                      className="touch-target touch-manipulation flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl p-2 text-center text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-30"
                      style={{ backgroundColor: color }}
                    >
                      {group.label}
                      <span className="text-[9px] font-normal uppercase opacity-80">
                        {group.destination === "bar" ? "Bar" : "Cucina"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {subView === "items" && (
          <div className="flex-1 p-3 pb-24">
            <div className="grid grid-cols-2 gap-2">
              {itemsInGroup.map((item) => (
                <ItemTile key={item.id} item={item} onTap={() => handleAddItem(item)} />
              ))}
            </div>
          </div>
        )}

        {subView === "bill" && (
          <div className="flex-1 space-y-3 p-4 print:p-0">
            <div className="overflow-hidden rounded-2xl border border-[#3A2C22] bg-[#251C17] print:rounded-none print:border-0 print:bg-white">
              <div className="border-b border-dashed border-[#3A2C22] p-4 text-center print:border-black/10">
                <p className="text-sm font-semibold text-[#F0E9E0] print:text-black">
                  {selectedOrder.tableNumber ? `Tavolo ${selectedOrder.tableNumber}` : "Comanda"}
                </p>
                <p className="text-xs text-[#A69686] print:text-black">
                  {new Date(selectedOrder.created_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="space-y-1.5 p-4">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-[#F0E9E0] print:text-black">
                      {item.quantity}× {item.name}
                    </span>
                    <span className="num-tabular shrink-0 text-[#F0E9E0] print:text-black">
                      €{(priceFor(item) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-[#3A2C22] p-4 print:border-black/10">
                <span className="text-base font-semibold text-[#F0E9E0] print:text-black">Totale</span>
                <span className="num-tabular text-xl font-bold text-[#F0E9E0] print:text-black">€{orderTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4 print:hidden">
              <p className="mb-3 text-sm font-medium text-[#F0E9E0]">Dividi il conto</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => setSplitPeople((n) => Math.max(1, n - 1))}
                  className="touch-target grid h-10 w-10 place-items-center rounded-xl border border-[#3A2C22] bg-[#1A1310] text-[#F0E9E0]"
                  aria-label="Meno persone"
                >
                  <Minus size={16} />
                </button>
                <div className="text-center">
                  <p className="num-tabular text-2xl font-bold text-[#F0E9E0]">{splitPeople}</p>
                  <p className="text-xs text-[#A69686]">{splitPeople === 1 ? "persona" : "persone"}</p>
                </div>
                <button
                  onClick={() => setSplitPeople((n) => Math.min(30, n + 1))}
                  className="touch-target grid h-10 w-10 place-items-center rounded-xl border border-[#3A2C22] bg-[#1A1310] text-[#F0E9E0]"
                  aria-label="Più persone"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-[#C17F45]/30 bg-[#C17F45]/15 p-3 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-[#C17F45]">A testa</p>
                <p className="num-tabular text-2xl font-bold text-[#C17F45]">
                  €{(orderTotal / splitPeople).toFixed(2)}
                </p>
              </div>
              {splitPeople > 1 && (
                <p className="mt-2 text-center text-[11px] text-[#A69686]">
                  Divisione in parti uguali, arrotondata al centesimo.
                </p>
              )}
            </div>

            <button
              onClick={() => window.print()}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-[#3A2C22] bg-[#251C17] py-2.5 text-sm font-medium text-[#A69686] print:hidden"
            >
              <Printer size={16} />
              Stampa conto
            </button>
          </div>
        )}

        {subView !== "bill" && (
          <div
            className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310] shadow-[0_-4px_20px_rgba(0,0,0,0.35)] print:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => setSubView("general")}
                className="touch-target grid place-items-center rounded-lg"
                aria-label="Vedi riepilogo"
              >
                <Receipt size={20} />
              </button>
              <span className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium uppercase text-[#1A1310]/70">Totale</span>
                <span className="num-tabular text-xl font-bold">€{orderTotal.toFixed(2)}</span>
              </span>
              {subView !== "general" ? (
                <button
                  onClick={openCategories}
                  className="touch-target grid place-items-center rounded-lg"
                  aria-label="Altre categorie"
                >
                  <Plus size={20} />
                </button>
              ) : (
                <span className="w-9" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <h1 className="mb-1 text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Comande</h1>
      <SignatureLine className="mb-4" />

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">{error}</p>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-[#A69686]">Carico i tavoli...</p>
      ) : tables.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nessun tavolo configurato"
          description="Aggiungi prima i tavoli nella sezione Tavoli, poi torna qui."
        />
      ) : (
        <div className="space-y-5">
          {rooms.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {rooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoomFilterChange(r.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    roomFilter === r.id
                      ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                      : "border border-[#3A2C22] text-[#A69686]"
                  }`}
                >
                  {r.name}
                </button>
              ))}
              {hasTablesWithoutRoom && (
                <button
                  onClick={() => handleRoomFilterChange("none")}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    roomFilter === "none"
                      ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                      : "border border-[#3A2C22] text-[#A69686]"
                  }`}
                >
                  Senza sala
                </button>
              )}
            </div>
          )}

          {visibleRoomGroups.map((group) => (
            <div key={group.room?.id ?? "senza-sala"}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A69686]">
                {group.room?.name ?? "Senza sala"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {group.tables.map((table) => {
                  const activeOrder = orders.find((o) => o.table_id === table.id);
                  const isOpening = isOpeningTable === table.id;
                  return (
                    <div key={table.id} className="relative">
                      <button
                        onClick={() => handleOpenTable(table.id, `Tavolo ${table.number}`)}
                        disabled={isOpening}
                        className={`touch-target touch-manipulation flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-2xl text-center transition-transform active:scale-95 disabled:opacity-60 ${
                          activeOrder
                            ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                            : "border-2 border-[#3A2C22] bg-[#251C17] text-[#F0E9E0]"
                        }`}
                      >
                        {isOpening ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <>
                            <span className="text-lg font-bold">{table.number}</span>
                            {activeOrder && (
                              <span className="text-[10px] font-medium opacity-90">
                                {activeOrder.items.filter((i) => !i.sent_at).length > 0
                                  ? "Da inviare"
                                  : activeOrder.status === "sent"
                                  ? "In cucina"
                                  : activeOrder.status === "ready"
                                  ? "Pronta"
                                  : "Servita"}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                      {activeOrder && (
                        <button
                          onClick={() =>
                            handleDeleteOrder(activeOrder.id, `Tavolo ${table.number}`)
                          }
                          className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-[#3A2C22] bg-[#251C17] text-[#D97A63]"
                          aria-label={`Elimina comanda tavolo ${table.number}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#A69686]">Senza tavolo</p>
            <div className="space-y-2">
              {takeoutOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between rounded-xl border border-[#3A2C22] bg-[#251C17] p-3"
                >
                  <button
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setSubView("general");
                      setActiveCourse(1);
                    }}
                    className="touch-target flex-1 text-left text-sm font-medium text-[#F0E9E0]"
                  >
                    Comanda asporto · {order.items.length} piatt{order.items.length === 1 ? "o" : "i"}
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id, "questa comanda")}
                    className="touch-target grid place-items-center rounded-lg text-[#D97A63]"
                    aria-label="Elimina comanda"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleOpenTable(null, "asporto")}
                disabled={isOpeningTable === "takeout"}
                className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#3A2C22] py-2.5 text-sm font-medium text-[#A69686] disabled:opacity-50"
              >
                {isOpeningTable === "takeout" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShoppingBag size={16} />
                )}
                Nuova comanda senza tavolo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderItemRow({
  item,
  price,
  isExpanded,
  onToggleExpand,
  onSetQuantity,
  onDelete,
}: {
  item: OrderItem;
  price: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSetQuantity: (quantity: number) => void;
  onDelete: () => void;
}) {
  const longPress = useLongPress(onToggleExpand);

  return (
    <div
      {...longPress}
      className="select-none px-3 py-2 text-sm"
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[#F0E9E0]">
            {item.quantity}× {item.name}
            <span className="ml-1.5 text-[10px] uppercase text-[#A69686]">
              {item.destination === "bar" ? "Bar" : "Cucina"}
            </span>
          </p>
          {item.notes && <p className="text-xs text-[#A69686]">{item.notes}</p>}
          <p className="text-xs text-[#A69686]">
            {!item.sent_at ? "Da inviare" : `€${(price * item.quantity).toFixed(2)}`}
          </p>
        </div>
        {!isExpanded && (
          <span className="shrink-0 text-[10px] text-[#A69686] print:hidden">Tieni premuto</span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-[#1A1310] p-2 print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (item.quantity <= 1 ? onDelete() : onSetQuantity(item.quantity - 1))}
              className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-[#3A2C22] bg-[#251C17] text-[#F0E9E0]"
              aria-label="Diminuisci quantità"
            >
              <Minus size={14} />
            </button>
            <span className="num-tabular w-6 text-center text-sm font-semibold text-[#F0E9E0]">{item.quantity}</span>
            <button
              onClick={() => onSetQuantity(item.quantity + 1)}
              className="touch-target grid h-8 w-8 place-items-center rounded-lg border border-[#3A2C22] bg-[#251C17] text-[#F0E9E0]"
              aria-label="Aumenta quantità"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={onDelete}
            className="touch-target flex items-center gap-1 rounded-lg border border-[#C0503D]/30 bg-[#C0503D]/15 px-2.5 py-1.5 text-xs font-medium text-[#D97A63]"
          >
            <Trash2 size={13} />
            Elimina
          </button>
        </div>
      )}
    </div>
  );
}

function ItemTile({ item, onTap }: { item: MenuItem; onTap: () => void }) {
  const color = item.category ? colorForGroup(groupForCategory(item.category).label) : "#3A2C22";
  return (
    <button
      onClick={onTap}
      className="touch-target touch-manipulation flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl p-2.5 text-center text-white transition-transform active:scale-95"
      style={{ backgroundColor: color }}
    >
      <span className="text-sm font-semibold leading-tight">{item.name}</span>
      <span className="num-tabular text-xs opacity-85">
        {item.price !== null ? `€${item.price.toFixed(2)}` : "—"}
      </span>
    </button>
  );
}
