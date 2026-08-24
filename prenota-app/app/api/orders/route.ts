import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

const ACTIVE_STATUSES = ["open", "sent", "ready", "served"];
const ITEM_STATUSES = ["pending", "in_progress", "ready", "served"];

async function findOrder(supabase: ReturnType<typeof createClient>, id: string, restaurantId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error || !data) return null;
  return data;
}

export async function GET() {
  const supabase = createClient();

  try {
    const restaurantId = await getRestaurantId(supabase);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, table_id, status, created_at")
      .eq("restaurant_id", restaurantId)
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) return NextResponse.json({ orders: [] });

    const orderIds = orders.map((o) => o.id);
    const tableIds = orders.map((o) => o.table_id).filter((id): id is string => !!id);

    const { data: items, error: itemsError } = await supabase
      .from("customer_order_items")
      .select("id, order_id, menu_item_id, name, quantity, notes, status, created_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });
    if (itemsError) throw itemsError;

    const { data: tables, error: tablesError } =
      tableIds.length > 0
        ? await supabase.from("tables").select("id, number").in("id", tableIds)
        : { data: [], error: null };
    if (tablesError) throw tablesError;

    const result = orders.map((order) => ({
      ...order,
      tableNumber: tables?.find((t) => t.id === order.table_id)?.number ?? null,
      items: (items ?? []).filter((item) => item.order_id === order.id),
    }));

    return NextResponse.json({ orders: result });
  } catch (err) {
    console.error("Errore lettura comande:", err);
    return NextResponse.json({ error: "Impossibile leggere le comande." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { tableId } = await req.json();
    const restaurantId = await getRestaurantId(supabase);

    if (tableId) {
      const { data: table } = await supabase
        .from("tables")
        .select("id")
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!table) return NextResponse.json({ error: "Tavolo non valido." }, { status: 400 });

      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .in("status", ACTIVE_STATUSES)
        .maybeSingle();
      if (existing) return NextResponse.json({ order: existing, existing: true });
    }

    const { data, error } = await supabase
      .from("orders")
      .insert({ restaurant_id: restaurantId, table_id: tableId || null, status: "open" })
      .select("id, table_id, status, created_at")
      .single();
    if (error) throw error;
    return NextResponse.json({ order: data }, { status: 201 });
  } catch (err) {
    console.error("Errore creazione comanda:", err);
    return NextResponse.json({ error: "Impossibile aprire la comanda." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { action, orderId, itemId, menuItemId, quantity, notes, status } = await req.json();
    const restaurantId = await getRestaurantId(supabase);

    if (!orderId) return NextResponse.json({ error: "Comanda obbligatoria." }, { status: 400 });
    const order = await findOrder(supabase, orderId, restaurantId);
    if (!order) return NextResponse.json({ error: "Comanda non trovata." }, { status: 404 });

    if (action === "add_item") {
      if (order.status !== "open") {
        return NextResponse.json({ error: "La comanda è già stata inviata." }, { status: 400 });
      }
      if (!menuItemId || !Number.isInteger(quantity) || quantity < 1) {
        return NextResponse.json({ error: "Piatto o quantità non validi." }, { status: 400 });
      }
      const { data: menuItem } = await supabase
        .from("menu_items")
        .select("id, name")
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurantId)
        .maybeSingle();
      if (!menuItem) return NextResponse.json({ error: "Piatto non trovato nel menu." }, { status: 404 });

      const { data, error } = await supabase
        .from("customer_order_items")
        .insert({
          order_id: orderId,
          menu_item_id: menuItem.id,
          name: menuItem.name,
          quantity,
          notes: notes?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ item: data });
    }

    if (action === "remove_item") {
      if (order.status !== "open") {
        return NextResponse.json({ error: "La comanda è già stata inviata." }, { status: 400 });
      }
      if (!itemId) return NextResponse.json({ error: "Piatto obbligatorio." }, { status: 400 });
      const { error } = await supabase
        .from("customer_order_items")
        .delete()
        .eq("id", itemId)
        .eq("order_id", orderId);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "send") {
      if (order.status !== "open") {
        return NextResponse.json({ error: "Questa comanda è già stata inviata." }, { status: 400 });
      }
      const { count, error: countError } = await supabase
        .from("customer_order_items")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId);
      if (countError) throw countError;
      if (!count) {
        return NextResponse.json({ error: "Aggiungi almeno un piatto prima di inviare." }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "sent" })
        .eq("id", orderId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ order: data });
    }

    if (action === "item_status") {
      if (!itemId || !ITEM_STATUSES.includes(status)) {
        return NextResponse.json({ error: "Stato piatto non valido." }, { status: 400 });
      }
      const { data: item } = await supabase
        .from("customer_order_items")
        .select("id")
        .eq("id", itemId)
        .eq("order_id", orderId)
        .maybeSingle();
      if (!item) return NextResponse.json({ error: "Piatto non trovato." }, { status: 404 });

      const { data, error } = await supabase
        .from("customer_order_items")
        .update({ status })
        .eq("id", itemId)
        .select()
        .single();
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from("customer_order_items")
        .select("status")
        .eq("order_id", orderId);
      if (itemsError) throw itemsError;

      const allServed = Boolean(items?.length) && items!.every((row) => row.status === "served");
      const allReady =
        Boolean(items?.length) && items!.every((row) => row.status === "ready" || row.status === "served");
      const nextOrderStatus = allServed ? "served" : allReady ? "ready" : order.status;
      if (nextOrderStatus !== order.status) {
        await supabase.from("orders").update({ status: nextOrderStatus }).eq("id", orderId);
      }
      return NextResponse.json({ item: data, orderStatus: nextOrderStatus });
    }

    if (action === "close") {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "closed" })
        .eq("id", orderId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ order: data });
    }

    return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
  } catch (err) {
    console.error("Errore aggiornamento comanda:", err);
    return NextResponse.json({ error: "Impossibile aggiornare la comanda." }, { status: 500 });
  }
}
