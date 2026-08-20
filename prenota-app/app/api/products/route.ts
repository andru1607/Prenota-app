import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const search = req.nextUrl.searchParams.get("search");

  let query = supabase
    .from("products")
    .select("*, suppliers(id, name)")
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
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
