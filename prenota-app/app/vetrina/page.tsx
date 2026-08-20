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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  category: string | null;
}

export default function VetrinaPage() {
  const router = useRouter();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [openingHoursText, setOpeningHoursText] = useState("");
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [infoSaved, setInfoSaved] = useState(false);

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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffRow } = await supabase
        .from("staff")
        .select("restaurant_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!staffRow?.restaurant_id) return;
      setRestaurantId(staffRow.restaurant_id);

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("description, address, contact_phone, opening_hours_text")
        .eq("id", staffRow.restaurant_id)
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
    setInfoSaved(false);
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

      setInfoSaved(true);
      setTimeout(() => setInfoSaved(false), 2500);
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare le informazioni.");
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

      resetItemForm();
      loadMenu();
    } catch (err) {
      console.error(err);
      setError("Non sono riuscito a salvare il piatto.");
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
    } catch (err) {
      console.error(err);
      loadMenu();
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.push("/impostazioni")}
          className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-bg-subtle"
          aria-label="Indietro"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold text-ink">Vetrina pubblica</h1>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-status-dangerBg p-3 text-sm text-status-danger">{error}</p>
      )}

      <div className="mb-4 rounded-xl border border-black/5 bg-white p-4">
        <p className="mb-3 text-sm font-medium text-ink">Informazioni del locale</p>
        <div className="space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Breve descrizione del ristorante"
            rows={2}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Indirizzo (es. Via Roma 12, Milano)"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Telefono del ristorante"
            type="tel"
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
          <textarea
            value={openingHoursText}
            onChange={(e) => setOpeningHoursText(e.target.value)}
            placeholder={"Orari di apertura, es.\nLun-Ven 19:00-23:00\nSab-Dom 12:00-15:00, 19:00-23:30"}
            rows={3}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={handleSaveInfo}
          disabled={isSavingInfo}
          className="touch-target mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {isSavingInfo && <Loader2 size={16} className="animate-spin" />}
          {infoSaved ? "Salvato!" : "Salva informazioni"}
        </button>
      </div>

      <div className="rounded-xl border border-black/5 bg-white p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-medium text-ink">Menu</p>
          <button
            onClick={() => (showItemForm ? resetItemForm() : setShowItemForm(true))}
            className="touch-target flex items-center gap-1 text-xs font-medium text-primary"
          >
            <Plus size={14} />
            Aggiungi piatto
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-muted">
          Il menu è facoltativo: se non aggiungi nulla, semplicemente non comparirà nella
          pagina pubblica.
        </p>

        {showItemForm && (
          <div className="mb-3 rounded-lg bg-bg-subtle p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-ink">
                {editingItemId ? "Modifica piatto" : "Nuovo piatto"}
              </p>
              <button
                onClick={resetItemForm}
                className="touch-target grid place-items-center rounded-lg text-ink-muted"
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
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <input
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="Descrizione (facoltativa)"
                className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Prezzo €"
                  type="number"
                  step="0.01"
                  className="num-tabular rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
                <input
                  value={itemCategory}
                  onChange={(e) => setItemCategory(e.target.value)}
                  placeholder="Categoria (es. Antipasti)"
                  className="rounded-lg border border-black/10 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleSaveItem}
              disabled={isSavingItem || !itemName.trim()}
              className="touch-target mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {isSavingItem ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Salva piatto
            </button>
          </div>
        )}

        {isLoadingMenu ? (
          <p className="py-4 text-center text-sm text-ink-muted">Carico il menu...</p>
        ) : menuItems.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink-muted">Nessun piatto ancora.</p>
        ) : (
          <div className="space-y-2">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-bg-subtle p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    {item.category && (
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-ink-muted">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-ink-muted">{item.description}</p>
                  )}
                  {item.price !== null && (
                    <p className="num-tabular mt-0.5 text-xs font-medium text-ink">
                      €{Number(item.price).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => startEditItem(item)}
                    className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-white"
                    aria-label="Modifica piatto"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="touch-target grid place-items-center rounded-lg text-ink-muted hover:bg-status-dangerBg hover:text-status-danger"
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
