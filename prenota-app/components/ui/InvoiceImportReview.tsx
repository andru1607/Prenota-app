"use client";

import { useState } from "react";
import { ArrowLeft, Check, Loader2, Trash2, Truck } from "lucide-react";
import type { ParsedInvoiceResult } from "@/lib/parseInvoicePhoto";

interface Supplier {
  id: string;
  name: string;
}

interface ProductRow {
  name: string;
  quantity: string;
  include: boolean;
}

export interface InvoiceConfirmData {
  supplierMode: "existing" | "new" | "none";
  existingSupplierId?: string;
  newSupplier?: { name: string; phone: string; email: string };
  products: { name: string; quantity: string }[];
}

interface InvoiceImportReviewProps {
  result: ParsedInvoiceResult;
  suppliers: Supplier[];
  onConfirm: (data: InvoiceConfirmData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

// Schermata di verifica dopo aver letto una fattura: permette di correggere
// i dati del fornitore, scegliere se abbinarlo a uno già esistente o crearne
// uno nuovo, e togliere dai prodotti quelli che non si vogliono salvare —
// prima di scrivere davvero qualcosa nel database.
export function InvoiceImportReview({
  result,
  suppliers,
  onConfirm,
  onCancel,
  isSaving,
}: InvoiceImportReviewProps) {
  // Se il nome letto corrisponde (anche solo in parte) a un fornitore già
  // esistente, partiamo proponendo quello invece di crearne uno duplicato
  const guessedMatch = result.supplier.name
    ? suppliers.find((s) =>
        s.name.toLowerCase().includes(result.supplier.name!.toLowerCase()) ||
        result.supplier.name!.toLowerCase().includes(s.name.toLowerCase())
      )
    : undefined;

  const [supplierMode, setSupplierMode] = useState<"existing" | "new" | "none">(
    guessedMatch ? "existing" : result.supplier.name ? "new" : "none"
  );
  const [existingSupplierId, setExistingSupplierId] = useState(guessedMatch?.id ?? "");
  const [newName, setNewName] = useState(result.supplier.name ?? "");
  const [newPhone, setNewPhone] = useState(result.supplier.phone ?? "");
  const [newEmail, setNewEmail] = useState(result.supplier.email ?? "");

  const [products, setProducts] = useState<ProductRow[]>(
    result.products.map((p) => ({ name: p.name, quantity: p.quantity ?? "", include: true }))
  );

  function updateProduct(index: number, changes: Partial<ProductRow>) {
    setProducts((prev) => prev.map((p, i) => (i === index ? { ...p, ...changes } : p)));
  }

  function removeProduct(index: number) {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  }

  const includedCount = products.filter((p) => p.include && p.name.trim()).length;
  const canConfirm =
    includedCount > 0 &&
    (supplierMode !== "existing" || existingSupplierId) &&
    (supplierMode !== "new" || newName.trim());

  async function handleConfirm() {
    if (!canConfirm) return;
    await onConfirm({
      supplierMode,
      existingSupplierId: supplierMode === "existing" ? existingSupplierId : undefined,
      newSupplier:
        supplierMode === "new"
          ? { name: newName.trim(), phone: newPhone.trim(), email: newEmail.trim() }
          : undefined,
      products: products
        .filter((p) => p.include && p.name.trim())
        .map((p) => ({ name: p.name.trim(), quantity: p.quantity.trim() })),
    });
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Annulla"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink">Rivedi la fattura</h1>
      </div>

      {/* Fornitore */}
      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-ink">
          <Truck size={16} />
          Fornitore
        </p>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setSupplierMode("existing")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "existing"
                ? "bg-primary text-white"
                : "border border-black/10 text-ink-muted"
            }`}
          >
            Fornitore esistente
          </button>
          <button
            onClick={() => setSupplierMode("new")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "new"
                ? "bg-primary text-white"
                : "border border-black/10 text-ink-muted"
            }`}
          >
            Nuovo fornitore
          </button>
          <button
            onClick={() => setSupplierMode("none")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "none"
                ? "bg-primary text-white"
                : "border border-black/10 text-ink-muted"
            }`}
          >
            Nessuno
          </button>
        </div>

        {supplierMode === "existing" && (
          <select
            value={existingSupplierId}
            onChange={(e) => setExistingSupplierId(e.target.value)}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm text-ink"
          >
            <option value="">Scegli un fornitore...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {supplierMode === "new" && (
          <div className="space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome fornitore"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Telefono (facoltativo)"
              type="tel"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (facoltativa)"
              type="email"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
          </div>
        )}

        {supplierMode === "none" && (
          <p className="text-xs text-ink-muted">
            I prodotti verranno salvati nel catalogo senza collegarli a nessun fornitore.
          </p>
        )}
      </div>

      {/* Prodotti */}
      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-ink">
          Prodotti trovati ({includedCount} selezionati)
        </p>

        {products.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">
            Non ho trovato prodotti leggibili in questa foto.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg bg-bg-subtle p-2.5">
                <button
                  onClick={() => updateProduct(index, { include: !product.include })}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    product.include
                      ? "border-status-free bg-status-free text-white"
                      : "border-black/20"
                  }`}
                  aria-label="Includi prodotto"
                >
                  {product.include && <Check size={12} />}
                </button>
                <input
                  value={product.name}
                  onChange={(e) => updateProduct(index, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm"
                  placeholder="Nome prodotto"
                />
                <input
                  value={product.quantity}
                  onChange={(e) => updateProduct(index, { quantity: e.target.value })}
                  className="w-24 shrink-0 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs"
                  placeholder="Quantità"
                />
                <button
                  onClick={() => removeProduct(index)}
                  className="touch-target grid shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
                  aria-label="Rimuovi riga"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleConfirm}
        disabled={!canConfirm || isSaving}
        className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        {isSaving ? "Salvo..." : `Salva ${includedCount} prodott${includedCount === 1 ? "o" : "i"} nel catalogo`}
      </button>
    </div>
  );
}
