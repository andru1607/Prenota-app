"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Truck,
  Phone,
  Mail,
  Pencil,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Zap,
} from "lucide-react";
import { getMyRole } from "@/lib/roles";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  category: string | null;
  notes: string | null;
}

interface Product {
  id: string;
  name: string;
  default_quantity: string | null;
  supplier_id: string | null;
  suppliers: { id: string; name: string } | null;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: string | null;
  is_ordered: boolean;
  supplier_id: string | null;
  suppliers: { id: string; name: string } | null;
}

export default function FornitoriPage() {
  const router = useRouter();
  const { show } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [frequentProducts, setFrequentProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemSupplier, setNewItemSupplier] = useState("");
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState("");

  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierCategory, setSupplierCategory] = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [suppliersRes, itemsRes, frequentRes] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/order-items"),
        fetch("/api/products?frequent=true"),
      ]);
      if (!suppliersRes.ok || !itemsRes.ok) throw new Error("Errore nel caricamento");

      const { suppliers: sData } = await suppliersRes.json();
      const { items: iData } = await itemsRes.json();
      setSuppliers(sData ?? []);
      setOrderItems(iData ?? []);

      if (frequentRes.ok) {
        const { products } = await frequentRes.json();
        setFrequentProducts(products ?? []);
      }
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare i dati.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getMyRole().then((role) => setIsAdmin(role === "admin"));
  }, [load]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const { products } = await res.json();
          setSearchResults(products ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function quickAdd(product: Product) {
    try {
      await fetch("/api/order-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          quantity: product.default_quantity,
          supplierId: product.supplier_id,
        }),
      });
      fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, incrementUse: true }),
      }).catch(() => {});

      setQuery("");
      setSearchResults([]);
      show(`"${product.name}" aggiunto alla lista`);
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiungere il prodotto.", "error");
    }
  }

  async function handleAddNewItem() {
    if (!query.trim()) return;
    try {
      const res = await fetch("/api/order-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: query.trim(),
          quantity: newItemQuantity,
          supplierId: newItemSupplier || null,
        }),
      });
      if (!res.ok) throw new Error("Errore aggiunta");

      if (saveToCatalog) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: query.trim(),
            defaultQuantity: newItemQuantity,
            supplierId: newItemSupplier || null,
          }),
        });
      }

      const addedName = query.trim();
      setQuery("");
      setNewItemQuantity("");
      setNewItemSupplier("");
      setShowNewItemForm(false);
      show(`"${addedName}" aggiunto alla lista`);
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito ad aggiungere il prodotto.", "error");
    }
  }

  async function toggleOrdered(item: OrderItem) {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_ordered: !i.is_ordered } : i))
    );
    try {
      await fetch("/api/order-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isOrdered: !item.is_ordered }),
      });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  function startEditQuantity(item: OrderItem) {
    setEditingQuantityId(item.id);
    setEditingQuantityValue(item.quantity ?? "");
  }

  async function saveQuantity(id: string) {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: editingQuantityValue } : i))
    );
    setEditingQuantityId(null);
    try {
      await fetch("/api/order-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, quantity: editingQuantityValue }),
      });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  async function deleteItem(id: string) {
    setOrderItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await fetch(`/api/order-items?id=${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      load();
    }
  }

  async function clearOrdered() {
    if (!confirm("Svuotare tutti i prodotti già ordinati dalla lista?")) return;
    try {
      await fetch("/api/order-items?clearOrdered=true", { method: "DELETE" });
      show("Lista ripulita");
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a svuotare la lista.", "error");
    }
  }

  function resetSupplierForm() {
    setShowSupplierForm(false);
    setEditingSupplierId(null);
    setSupplierName("");
    setSupplierPhone("");
    setSupplierEmail("");
    setSupplierCategory("");
  }

  function startEditSupplier(s: Supplier) {
    setEditingSupplierId(s.id);
    setSupplierName(s.name);
    setSupplierPhone(s.phone ?? "");
    setSupplierEmail(s.email ?? "");
    setSupplierCategory(s.category ?? "");
    setShowSupplierForm(true);
  }

  async function handleSaveSupplier() {
    if (!supplierName.trim()) return;
    try {
      const payload = {
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        email: supplierEmail.trim(),
        category: supplierCategory.trim(),
      };
      const res = editingSupplierId
        ? await fetch("/api/suppliers", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingSupplierId, ...payload }),
          })
        : await fetch("/api/suppliers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error("Errore salvataggio fornitore");
      const wasEditing = !!editingSupplierId;
      resetSupplierForm();
      show(wasEditing ? "Fornitore aggiornato" : "Fornitore aggiunto");
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare il fornitore.", "error");
    }
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("Eliminare questo fornitore?")) return;
    try {
      await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
      show("Fornitore eliminato");
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare il fornitore.", "error");
    }
  }

  const groupedItems = new Map<string, OrderItem[]>();
  for (const item of orderItems) {
    const key = item.suppliers?.name ?? "Senza fornitore";
    if (!groupedItems.has(key)) groupedItems.set(key, []);
    groupedItems.get(key)!.push(item);
  }
  const hasOrdered = orderItems.some((i) => i.is_ordered);
  const noResultsFound = query.trim().length > 0 && !isSearching && searchResults.length === 0;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/strumenti")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink">Fornitori e ordini</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <div className="relative mb-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowNewItemForm(false);
            }}
            placeholder="Cerca un prodotto da ordinare..."
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm"
          />
        </div>

        {!query.trim() && frequentProducts.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-ink-muted">
              <Zap size={12} />
              Ordinati spesso
            </p>
            <div className="flex flex-wrap gap-1.5">
              {frequentProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => quickAdd(product)}
                  className="touch-target flex items-center gap-1 rounded-full border border-black/10 bg-bg-subtle px-3 py-1.5 text-xs font-medium text-ink"
                >
                  <Plus size={12} className="text-primary" />
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching && <p className="py-2 text-xs text-ink-muted">Cerco...</p>}

        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => quickAdd(product)}
                className="touch-target flex w-full items-center justify-between gap-2 rounded-lg bg-bg-subtle p-2.5 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm text-ink">{product.name}</p>
                  <p className="text-xs text-ink-muted">
                    {product.suppliers?.name ?? "Nessun fornitore"}
                    {product.default_quantity && ` · ${product.default_quantity}`}
                  </p>
                </div>
                <span className="grid shrink-0 h-7 w-7 place-items-center rounded-lg bg-primary text-white">
                  <Plus size={15} />
                </span>
              </button>
            ))}
          </div>
        )}

        {noResultsFound && !showNewItemForm && (
          <div className="mt-2 rounded-lg bg-bg-subtle p-3">
            <p className="mb-2 text-sm text-ink-muted">
              Nessun prodotto trovato per "{query}".
            </p>
            <button
              onClick={() => setShowNewItemForm(true)}
              className="touch-target flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <Plus size={15} />
              Aggiungi "{query}" alla lista
            </button>
          </div>
        )}

        {showNewItemForm && (
          <div className="mt-2 rounded-lg bg-bg-subtle p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-ink">Nuovo prodotto: {query}</p>
              <button
                onClick={() => setShowNewItemForm(false)}
                className="touch-target grid place-items-center rounded-lg text-ink-muted"
                aria-label="Chiudi"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <input
                value={newItemQuantity}
                onChange={(e) => setNewItemQuantity(e.target.value)}
                placeholder="Quantità (es. 5 kg)"
                autoFocus
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              {suppliers.length > 0 && (
                <select
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-ink"
                >
                  <option value="">Nessun fornitore</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={saveToCatalog}
                  onChange={(e) => setSaveToCatalog(e.target.checked)}
                />
                Salva anche nel catalogo per la prossima volta
              </label>
            </div>
            <button
              onClick={handleAddNewItem}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white"
            >
              <Plus size={16} />
              Aggiungi alla lista
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Lista da ordinare</p>
          {hasOrdered && (
            <button
              onClick={clearOrdered}
              className="touch-target text-xs font-medium text-status-danger"
            >
              Svuota ordinati
            </button>
          )}
        </div>

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : orderItems.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="Nessun prodotto in lista"
            description="Usa la ricerca qui sopra per aggiungerne."
          />
        ) : (
          <div className="space-y-4">
            {Array.from(groupedItems.entries()).map(([supplierName, items]) => (
              <div key={supplierName}>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-ink-muted">
                  <Truck size={12} />
                  {supplierName}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="animate-fade-in flex items-center justify-between gap-2 rounded-lg bg-bg-subtle p-2.5"
                    >
                      <button
                        onClick={() => toggleOrdered(item)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                            item.is_ordered
                              ? "border-status-free bg-status-free text-white"
                              : "border-black/20"
                          }`}
                        >
                          {item.is_ordered && <Check size={12} />}
                        </span>
                        <span
                          className={`min-w-0 text-sm ${
                            item.is_ordered ? "text-ink-muted line-through" : "text-ink"
                          }`}
                        >
                          {item.name}
                        </span>
                      </button>

                      {editingQuantityId === item.id ? (
                        <input
                          value={editingQuantityValue}
                          onChange={(e) => setEditingQuantityValue(e.target.value)}
                          onBlur={() => saveQuantity(item.id)}
                          onKeyDown={(e) => e.key === "Enter" && saveQuantity(item.id)}
                          autoFocus
                          placeholder="Quantità"
                          className="w-24 shrink-0 rounded-lg border border-black/10 px-2 py-1 text-xs"
                        />
                      ) : (
                        <button
                          onClick={() => startEditQuantity(item)}
                          className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-ink-muted underline decoration-dotted"
                        >
                          {item.quantity || "+ quantità"}
                        </button>
                      )}

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                        aria-label="Rimuovi"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <button
          onClick={() => setShowSuppliers((v) => !v)}
          className="touch-target flex w-full items-center justify-between"
        >
          <span className="text-sm font-medium text-ink">Fornitori</span>
          {showSuppliers ? (
            <ChevronDown size={18} className="text-ink-muted" />
          ) : (
            <ChevronRightIcon size={18} className="text-ink-muted" />
          )}
        </button>

        {showSuppliers && (
          <div className="mt-3">
            {isAdmin && (
              <button
                onClick={() => (showSupplierForm ? resetSupplierForm() : setShowSupplierForm(true))}
                className="touch-target mb-2 flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Plus size={14} />
                Aggiungi
              </button>
            )}

            {showSupplierForm && (
              <div className="mb-3 rounded-lg bg-bg-subtle p-3">
                <div className="space-y-2">
                  <input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Nome fornitore"
                    autoFocus
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                  <input
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Telefono"
                    type="tel"
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                  <input
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                  <input
                    value={supplierCategory}
                    onChange={(e) => setSupplierCategory(e.target.value)}
                    placeholder="Categoria (es. Ortofrutta)"
                    className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  onClick={handleSaveSupplier}
                  disabled={!supplierName.trim()}
                  className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  <Check size={16} />
                  Salva fornitore
                </button>
              </div>
            )}

            {suppliers.length === 0 ? (
              <EmptyState icon={Truck} title="Nessun fornitore ancora" />
            ) : (
              <div className="space-y-1.5">
                {suppliers.map((s) => (
                  <div key={s.id} className="rounded-lg bg-bg-subtle p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-ink">{s.name}</p>
                          {s.category && (
                            <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ink-muted">
                              {s.category}
                            </span>
                          )}
                        </div>
                        {s.phone && (
                          <a
                            href={`tel:${s.phone}`}
                            className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted underline"
                          >
                            <Phone size={11} /> {s.phone}
                          </a>
                        )}
                        {s.email && (
                          <a
                            href={`mailto:${s.email}`}
                            className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted underline"
                          >
                            <Mail size={11} /> {s.email}
                          </a>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => startEditSupplier(s)}
                            className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-white"
                            aria-label="Modifica fornitore"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                            aria-label="Elimina fornitore"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
