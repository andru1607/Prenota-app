"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Receipt,
  Loader2,
} from "lucide-react";
import { getMyRole } from "@/lib/roles";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { LockedFeature } from "@/components/ui/LockedFeature";
import { useToast } from "@/components/ui/ToastProvider";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { hasAccessToFeature } from "@/lib/subscription";
import { InvoiceImportReview, type InvoiceConfirmData } from "@/components/ui/InvoiceImportReview";
import type { ParsedInvoiceResult } from "@/lib/parseInvoicePhoto";

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SignatureLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-14 bg-gradient-to-r from-[#C17F45] via-[#C17F45] to-transparent ${className}`} />
  );
}

export default function FornitoriPage() {
  const router = useRouter();
  const { show } = useToast();
  const { info: subInfo, isLoading: subLoading } = useSubscription();
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

  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [isReadingInvoice, setIsReadingInvoice] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState<ParsedInvoiceResult | null>(null);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

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

  async function handleInvoiceSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingInvoice(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Errore lettura fattura");

      if (!body.products || body.products.length === 0) {
        show("Non ho trovato prodotti leggibili in questa foto.", "error");
        return;
      }

      setInvoiceResult(body);
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a leggere la fattura. Riprova con una foto più nitide.", "error");
    } finally {
      setIsReadingInvoice(false);
      e.target.value = "";
    }
  }

  async function handleConfirmInvoice(data: InvoiceConfirmData) {
    setIsSavingInvoice(true);
    try {
      let supplierId: string | null = null;

      if (data.supplierMode === "existing") {
        supplierId = data.existingSupplierId ?? null;
      } else if (data.supplierMode === "new" && data.newSupplier) {
        const res = await fetch("/api/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data.newSupplier),
        });
        if (!res.ok) throw new Error("Errore creazione fornitore");
        const { supplier } = await res.json();
        supplierId = supplier.id;
      }

      await Promise.all(
        data.products.map((p) =>
          fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: p.name,
              defaultQuantity: p.quantity || undefined,
              supplierId: supplierId || undefined,
            }),
          })
        )
      );

      show(`${data.products.length} prodott${data.products.length === 1 ? "o aggiunto" : "i aggiunti"} al catalogo`);
      setInvoiceResult(null);
      load();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare i dati della fattura.", "error");
    } finally {
      setIsSavingInvoice(false);
    }
  }

  if (!subLoading && subInfo && !hasAccessToFeature(subInfo.effectiveTier, "fornitori")) {
    return <LockedFeature feature="fornitori" />;
  }

  if (invoiceResult) {
    return (
      <InvoiceImportReview
        result={invoiceResult}
        suppliers={suppliers}
        onConfirm={handleConfirmInvoice}
        onCancel={() => setInvoiceResult(null)}
        isSaving={isSavingInvoice}
      />
    );
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
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/strumenti")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Fornitori e ordini</h1>
          <SignatureLine className="mt-1" />
        </div>
        {isAdmin && (
          <>
            <input
              ref={invoiceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInvoiceSelected}
            />
            <button
              onClick={() => invoiceInputRef.current?.click()}
              disabled={isReadingInvoice}
              className="touch-target flex items-center gap-1.5 rounded-xl border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-xs font-medium text-[#A69686] disabled:opacity-60"
              title="Leggi fattura"
            >
              {isReadingInvoice ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Receipt size={15} className="text-[#C17F45]" />
              )}
              Leggi fattura
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="relative mb-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A69686]"
          />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowNewItemForm(false);
            }}
            placeholder="Cerca un prodotto da ordinare..."
            className="w-full rounded-xl border border-[#3A2C22] bg-[#1A1310] py-2.5 pl-9 pr-3 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
        </div>

        {!query.trim() && frequentProducts.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-[#A69686]">
              <Zap size={12} className="text-[#C17F45]" />
              Ordinati spesso
            </p>
            <div className="flex flex-wrap gap-1.5">
              {frequentProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => quickAdd(product)}
                  className="touch-target flex items-center gap-1 rounded-full border border-[#3A2C22] bg-[#1A1310] px-3 py-1.5 text-xs font-medium text-[#F0E9E0]"
                >
                  <Plus size={12} className="text-[#C17F45]" />
                  {product.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isSearching && <p className="py-2 text-xs text-[#A69686]">Cerco...</p>}

        {searchResults.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => quickAdd(product)}
                className="touch-target flex w-full items-center justify-between gap-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-2.5 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm text-[#F0E9E0]">{product.name}</p>
                  <p className="text-xs text-[#A69686]">
                    {product.suppliers?.name ?? "Nessun fornitore"}
                    {product.default_quantity && ` · ${product.default_quantity}`}
                  </p>
                </div>
                <span className="grid shrink-0 h-7 w-7 place-items-center rounded-lg bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]">
                  <Plus size={15} />
                </span>
              </button>
            ))}
          </div>
        )}

        {noResultsFound && !showNewItemForm && (
          <div className="mt-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
            <p className="mb-2 text-sm text-[#A69686]">
              Nessun prodotto trovato per "{query}".
            </p>
            <button
              onClick={() => setShowNewItemForm(true)}
              className="touch-target flex items-center gap-1.5 text-sm font-medium text-[#C17F45]"
            >
              <Plus size={15} />
              Aggiungi "{query}" alla lista
            </button>
          </div>
        )}

        {showNewItemForm && (
          <div className="mt-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-[#F0E9E0]">Nuovo prodotto: {query}</p>
              <button
                onClick={() => setShowNewItemForm(false)}
                className="touch-target grid place-items-center rounded-lg text-[#A69686]"
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
                className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
              {suppliers.length > 0 && (
                <select
                  value={newItemSupplier}
                  onChange={(e) => setNewItemSupplier(e.target.value)}
                  className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0]"
                >
                  <option value="">Nessun fornitore</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <label className="flex items-center gap-2 text-xs text-[#A69686]">
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
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310]"
            >
              <Plus size={16} />
              Aggiungi alla lista
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-[#F0E9E0]">Lista da ordinare</p>
          {hasOrdered && (
            <button
              onClick={clearOrdered}
              className="touch-target text-xs font-medium text-[#D97A63]"
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
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#A69686]">
                  <Truck size={12} />
                  {supplierName}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="animate-fade-in flex items-center justify-between gap-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-2.5"
                    >
                      <button
                        onClick={() => toggleOrdered(item)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                            item.is_ordered
                              ? "border-[#7C9473] bg-[#7C9473] text-[#1A1310]"
                              : "border-[#3A2C22]"
                          }`}
                        >
                          {item.is_ordered && <Check size={12} />}
                        </span>
                        <span
                          className={`min-w-0 text-sm ${
                            item.is_ordered ? "text-[#A69686] line-through" : "text-[#F0E9E0]"
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
                          className="w-24 shrink-0 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2 py-1 text-xs text-[#F0E9E0]"
                        />
                      ) : (
                        <button
                          onClick={() => startEditQuantity(item)}
                          className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-[#A69686] underline decoration-dotted"
                        >
                          {item.quantity || "+ quantità"}
                        </button>
                      )}

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="touch-target grid shrink-0 place-items-center rounded-lg text-[#A69686]"
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

      <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <button
          onClick={() => setShowSuppliers((v) => !v)}
          className="touch-target flex w-full items-center justify-between"
        >
          <span className="text-sm font-medium text-[#F0E9E0]">Fornitori</span>
          {showSuppliers ? (
            <ChevronDown size={18} className="text-[#A69686]" />
          ) : (
            <ChevronRightIcon size={18} className="text-[#A69686]" />
          )}
        </button>

        {showSuppliers && (
          <div className="mt-3">
            {isAdmin && (
              <button
                onClick={() => (showSupplierForm ? resetSupplierForm() : setShowSupplierForm(true))}
                className="touch-target mb-2 flex items-center gap-1 text-xs font-medium text-[#C17F45]"
              >
                <Plus size={14} />
                Aggiungi
              </button>
            )}

            {showSupplierForm && (
              <div className="mb-3 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
                <div className="space-y-2">
                  <input
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="Nome fornitore"
                    autoFocus
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    placeholder="Telefono"
                    type="tel"
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    value={supplierEmail}
                    onChange={(e) => setSupplierEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                  <input
                    value={supplierCategory}
                    onChange={(e) => setSupplierCategory(e.target.value)}
                    placeholder="Categoria (es. Ortofrutta)"
                    className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveSupplier}
                  disabled={!supplierName.trim()}
                  className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-40"
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
                  <div key={s.id} className="rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[#F0E9E0]">{s.name}</p>
                          {s.category && (
                            <span className="rounded-full border border-[#3A2C22] bg-[#251C17] px-1.5 py-0.5 text-[10px] text-[#A69686]">
                              {s.category}
                            </span>
                          )}
                        </div>
                        {s.phone && (
                          <a
                            href={`tel:${s.phone}`}
                            className="mt-0.5 flex items-center gap-1 text-xs text-[#A69686] underline"
                          >
                            <Phone size={11} /> {s.phone}
                          </a>
                        )}
                        {s.email && (
                          <a
                            href={`mailto:${s.email}`}
                            className="mt-0.5 flex items-center gap-1 text-xs text-[#A69686] underline"
                          >
                            <Mail size={11} /> {s.email}
                          </a>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => startEditSupplier(s)}
                            className="touch-target grid place-items-center rounded-lg text-[#A69686]"
                            aria-label="Modifica fornitore"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="touch-target grid place-items-center rounded-lg text-[#A69686]"
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
