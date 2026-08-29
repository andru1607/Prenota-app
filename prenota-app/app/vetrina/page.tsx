"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Check,
  Plus,
  Trash2,
  Pencil,
  X,
  UtensilsCrossed,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyStaffRow } from "@/lib/roles";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
}

export default function VetrinaPage() {
  const router = useRouter();
  const { show } = useToast();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [openingHoursText, setOpeningHoursText] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [isSavingItem, setIsSavingItem] = useState(false);

  useEffect(() => {
    async function loadInfo() {
      const staffRow = await getMyStaffRow();
      if (!staffRow) return;
      setRestaurantId(staffRow.restaurantId);

      const supabase = createClient();
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("description, address, contact_phone, opening_hours_text")
        .eq("id", staffRow.restaurantId)
        .single();

      if (restaurant) {
        setDescription(restaurant.description ?? "");
        setAddress(restaurant.address ?? "");
        setContactPhone(restaurant.contact_phone ?? "");
        setOpeningHoursText(restaurant.opening_hours_text ?? "");
      }
    }
    loadInfo();
  }, []);

  const loadMenu = useCallback(async () => {
    setIsLoadingMenu(true);
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Errore nel caricamento");
      const { items } = await res.json();
      setMenuItems(items ?? []);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a caricare il menu.");
    } finally {
      setIsLoadingMenu(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  async function handleSaveInfo() {
    if (!restaurantId) return;
    setIsSavingInfo(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({
          description: description || null,
          address: address || null,
          contact_phone: contactPhone || null,
          opening_hours_text: openingHoursText || null,
        })
        .eq("id", restaurantId);

      if (updateError) throw updateError;

      show("Informazioni salvate");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare le informazioni.", "error");
    } finally {
      setIsSavingInfo(false);
    }
  }

  function resetItemForm() {
    setShowItemForm(false);
    setEditingItemId(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemCategory("");
  }

  function startEditItem(item: MenuItem) {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemDescription(item.description ?? "");
    setItemPrice(item.price !== null ? String(item.price) : "");
    setItemCategory(item.category ?? "");
    setShowItemForm(true);
  }

  async function handleSaveItem() {
    if (!itemName.trim()) return;
    setIsSavingItem(true);
    setError(null);
    try {
      const payload = {
        name: itemName.trim(),
        description: itemDescription.trim() || undefined,
        price: itemPrice ? Number(itemPrice) : undefined,
        category: itemCategory.trim() || undefined,
      };

      const res = editingItemId
        ? await fetch("/api/menu", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingItemId, ...payload }),
          })
        : await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) throw new Error("Errore salvataggio piatto");

      const wasEditing = !!editingItemId;
      resetItemForm();
      show(wasEditing ? "Piatto aggiornato" : "Piatto aggiunto al menu");
      loadMenu();
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a salvare il piatto.", "error");
    } finally {
      setIsSavingItem(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Eliminare questo piatto dal menu?")) return;
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
    try {
      const res = await fetch(`/api/menu?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione");
      show("Piatto eliminato");
    } catch (err) {
      console.error(err);
      show("Non sono riuscito a eliminare il piatto.", "error");
      loadMenu();
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1310] p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-[#A69686]"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold uppercase tracking-wide text-[#F0E9E0]">Vetrina pubblica</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-[#C0503D]/40 bg-[#2A1B14] p-3 text-sm text-[#D97A63]">
          {error}
        </p>
      )}

      <div className="mb-4 rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <p className="mb-3 text-sm font-medium text-[#F0E9E0]">Informazioni del locale</p>
        <div className="space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descrizione del ristorante"
            rows={2}
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Indirizzo (es. Via Roma 12, Milano)"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Telefono del ristorante"
            type="tel"
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
          <textarea
            value={openingHoursText}
            onChange={(e) => setOpeningHoursText(e.target.value)}
            placeholder={"Orari di apertura, es.\nLun-Ven 19:00-23:00\nSab-Dom 12:00-15:00, 19:00-23:30"}
            rows={3}
            className="w-full rounded-lg border border-[#3A2C22] bg-[#1A1310] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSaveInfo}
          disabled={isSavingInfo}
          className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2.5 text-sm font-medium text-[#1A1310] disabled:opacity-50"
        >
          {isSavingInfo && <Loader2 size={16} className="animate-spin" />}
          Salva informazioni
        </button>
      </div>

      <div className="rounded-2xl border border-[#3A2C22] bg-[#251C17] p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-[#F0E9E0]">Menu</p>
          <button
            onClick={() => (showItemForm ? resetItemForm() : setShowItemForm(true))}
            className="touch-target flex items-center gap-1 text-xs font-medium text-[#C17F45]"
          >
            <Plus size={14} />
            Aggiungi piatto
          </button>
        </div>
        <p className="mb-3 text-xs text-[#A69686]">
          Il menu è facoltativo: se non aggiungi nulla, semplicemente non comparirà nella
          pagina pubblica.
        </p>

        {showItemForm && (
          <div className="mb-3 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-[#F0E9E0]">
                {editingItemId ? "Modifica piatto" : "Nuovo piatto"}
              </p>
              <button
                onClick={resetItemForm}
                className="touch-target grid place-items-center rounded-lg text-[#A69686]"
                aria-label="Chiudi"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Nome del piatto"
                autoFocus
                className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
              <input
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Descrizione (facoltativa)"
                className="w-full rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Prezzo €"
                  type="number"
                  step="0.01"
                  className="num-tabular rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                />
                <input
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  placeholder="Categoria (es. Antipasti)"
                  className="rounded-lg border border-[#3A2C22] bg-[#251C17] px-3 py-2 text-sm text-[#F0E9E0] placeholder:text-[#7A6E63] focus:border-[#C17F45]/60 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleSaveItem}
              disabled={isSavingItem || !itemName.trim()}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#C17F45] to-[#A6683A] py-2 text-sm font-medium text-[#1A1310] disabled:opacity-40"
            >
              {isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Salva piatto
            </button>
          </div>
        )}

        {isLoadingMenu ? (
          <ListSkeleton rows={3} />
        ) : menuItems.length === 0 ? (
          <EmptyState icon={UtensilsCrossed} title="Nessun piatto ancora" />
        ) : (
          <div className="space-y-2">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="animate-fade-in flex items-start justify-between gap-2 rounded-lg border border-[#3A2C22] bg-[#1A1310] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#F0E9E0]">{item.name}</p>
                    {item.category && (
                      <span className="rounded-full border border-[#3A2C22] bg-[#251C17] px-1.5 py-0.5 text-[10px] text-[#A69686]">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-[#A69686]">{item.description}</p>
                  )}
                  {item.price !== null && (
                    <p className="num-tabular mt-0.5 text-xs font-medium text-[#F0E9E0]">
                      €{Number(item.price).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEditItem(item)}
                    className="touch-target grid place-items-center rounded-lg text-[#A69686]"
                    aria-label="Modifica piatto"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="touch-target grid place-items-center rounded-lg text-[#A69686] hover:bg-[#C0503D]/15 hover:text-[#D97A63]"
                    aria-label="Elimina piatto"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
