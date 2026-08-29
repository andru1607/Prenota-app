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

export function InvoiceImportReview({
  result,
  suppliers,
  onConfirm,
  onCancel,
  isSaving,
}: InvoiceImportReviewProps) {
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
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Annulla"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Rivedi la fattura</h1>
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-[#F0E9E0]">
          <Truck size={16} className="text-[#C17F45]" />
          Fornitore
        </p>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setSupplierMode("existing")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "existing"
                ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                : "border border-[#3A2C22] text-[#A69686]"
            }`}
          >
            Fornitore esistente
          </button>
          <button
            onClick={() => setSupplierMode("new")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "new"
                ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                : "border border-[#3A2C22] text-[#A69686]"
            }`}
          >
            Nuovo fornitore
          </button>
          <button
            onClick={() => setSupplierMode("none")}
            className={`flex-1 rounded-lg py-2 text-xs font-medium ${
              supplierMode === "none"
                ? "bg-gradient-to-b from-[#C17F45] to-[#A6683A] text-[#1A1310]"
                : "border border-[#3A2C22] text-[#A69686]"
            }`}
          >
            Nessuno
          </button>
        </div>

        {supplierMode === "existing" && (
          <select
            value={existingSupplierId}
            onChange={(e) => setExistingSupplierId(e.target.value)}
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0]"
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
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Telefono (facoltativo)"
              type="tel"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email (facoltativa)"
              type="email"
              className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
            />
          </div>
        )}

        {supplierMode === "none" && (
          <p className="text-xs text-[#A69686]">
            I prodotti verranno salvati nel catalogo senza collegarli a nessun fornitore.
          </p>
        )}
      </div>

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-3 text-sm font-medium text-[#F0E9E0]">
          Prodotti trovati ({includedCount} selezionati)
        </p>

        {products.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#A69686]">
            Non ho trovato prodotti leggibili in questa foto.
          </p>
        ) : (
          <div className="space-y-2">
            {products.map((product, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-2.5">
                <button
                  onClick={() => updateProduct(index, { include: !product.include })}
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                    product.include
                      ? "border-[#7C9473] bg-[#7C9473] text-[#1A1310]"
                      : "border-[#3A2C22]"
                  }`}
                  aria-label="Includi prodotto"
                >
                  {product.include && <Check size={12} />}
                </button>
                <input
                  value={product.name}
                  onChange={(e) => updateProduct(index, { name: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2 py-1.5 text-sm text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
                  placeholder="Nome prodotto"
                />
                <input
                  value={product.quantity}
                  onChange={(e) => updateProduct(index, { quantity: e.target.value })}
                  className="num-tabular w-24 shrink-0 rounded-lg border border-[#3A2C22] bg-[#251C17] px-2 py-1.5 text-xs text-[#F0E9E0] focus:border-[#C17F45]/60 focus:outline-none"
                  placeholder="Quantità"
                />
                <button
                  onClick={() => removeProduct(index)}
                  className="touch-target grid shrink-0 place-items-center rounded-lg text-[#A69686]"
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
        className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-3 text-sm font-medium text-[#1A1310] shadow-[0_0_18px_rgba(227,168,87,0.25)] disabled:opacity-40"
      >
        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
        {isSaving ? "Salvo..." : `Salva ${includedCount} prodott${includedCount === 1 ? "o" : "i"} nel catalogo`}
      </button>
    </div>
  );
}
