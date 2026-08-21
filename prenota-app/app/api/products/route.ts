import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const search = req.nextUrl.searchParams.get("search");
  const frequent = req.nextUrl.searchParams.get("frequent");

  let query = supabase.from("products").select("*, suppliers(id, name)");

  if (frequent === "true") {
    query = query.gt("use_count", 0).order("use_count", { ascending: false }).limit(8);
  } else if (search) {
    query = query.ilike("name", `%${search}%`).order("name", { ascending: true });
  } else {
    query = query.order("name", { ascending: true });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore lettura catalogo:", error);
    return NextResponse.json({ error: "Impossibile leggere il catalogo." }, { status: 500 });
  }

  return NextResponse.json({ products: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { name, supplierId, defaultQuantity } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome del prodotto è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("products")
      .insert({
        restaurant_id: restaurantId,
        supplier_id: supplierId || null,
        name: name.trim(),
        default_quantity: defaultQuantity || null,
      })
      .select("*, suppliers(id, name)")
      .single();

    if (error) throw error;

    return NextResponse.json({ product: data });
  } catch (err) {
    console.error("Errore creazione prodotto:", err);
    return NextResponse.json({ error: "Impossibile aggiungere il prodotto." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, name, defaultQuantity, supplierId, incrementUse } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    if (incrementUse) {
      const { data: current } = await supabase
        .from("products")
        .select("use_count")
        .eq("id", id)
        .single();

      await supabase
        .from("products")
        .update({ use_count: (current?.use_count ?? 0) + 1 })
        .eq("id", id);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (defaultQuantity !== undefined) updates.default_quantity = defaultQuantity || null;
    if (supplierId !== undefined) updates.supplier_id = supplierId || null;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore aggiornamento prodotto:", err);
    return NextResponse.json({ error: "Impossibile aggiornare il prodotto." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione prodotto:", error);
    return NextResponse.json({ error: "Impossibile eliminare il prodotto." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
