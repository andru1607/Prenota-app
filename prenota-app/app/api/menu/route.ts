import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("category", { ascending: true })
    .order("position", { ascending: true });

  if (error) {
    console.error("Errore lettura menu:", error);
    return NextResponse.json({ error: "Impossibile leggere il menu." }, { status: 500 });
  }

  return NextResponse.json({ items: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { name, description, price, category } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome del piatto è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("menu_items")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description || null,
        price: price ?? null,
        category: category || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("Errore creazione piatto:", err);
    return NextResponse.json({ error: "Impossibile aggiungere il piatto." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, name, description, price, category } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description || null;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category || null;

    const { data, error } = await supabase
      .from("menu_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error("Errore aggiornamento piatto:", err);
    return NextResponse.json({ error: "Impossibile aggiornare il piatto." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione piatto:", error);
    return NextResponse.json({ error: "Impossibile eliminare il piatto." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
