import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("order_items")
    .select("*, suppliers(id, name)")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Errore lettura lista ordini:", error);
    return NextResponse.json({ error: "Impossibile leggere la lista." }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { name, quantity, supplierId } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome del prodotto è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("order_items")
      .insert({
        restaurant_id: restaurantId,
        supplier_id: supplierId || null,
        name: name.trim(),
        quantity: quantity || null,
        is_ordered: false,
      })
      .select("*, suppliers(id, name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("Errore aggiunta alla lista:", err);
    return NextResponse.json({ error: "Impossibile aggiungere alla lista." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, isOrdered, quantity } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (isOrdered !== undefined) updates.is_ordered = isOrdered;
    if (quantity !== undefined) updates.quantity = quantity || null;

    const { data, error } = await supabase
      .from("order_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("Errore aggiornamento elemento lista:", err);
    return NextResponse.json({ error: "Impossibile aggiornare." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");
  const clearOrdered = req.nextUrl.searchParams.get("clearOrdered");

  try {
    if (clearOrdered === "true") {
      const restaurantId = await getRestaurantId(supabase);
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("restaurant_id", restaurantId)
        .eq("is_ordered", true);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const { error } = await supabase.from("order_items").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore eliminazione elemento lista:", err);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }
}
