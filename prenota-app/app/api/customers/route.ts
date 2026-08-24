import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");
  const search = req.nextUrl.searchParams.get("search");

  let query = supabase.from("customers").select("*").order("name", { ascending: true });

  if (id) {
    query = query.eq("id", id);
  } else if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore lettura clienti:", error);
    return NextResponse.json({ error: "Impossibile leggere i clienti." }, { status: 500 });
  }

  return NextResponse.json({ customers: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { name, phone, notes } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("customers")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        phone: phone || null,
        notes: notes || null,
        reservation_count: 0,
        is_regular: false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ customer: data });
  } catch (err) {
    console.error("Errore creazione cliente:", err);
    return NextResponse.json({ error: "Impossibile creare il cliente." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, name, phone, notes, is_regular } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (notes !== undefined) updates.notes = notes;
    if (is_regular !== undefined) updates.is_regular = is_regular;

    const { data, error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ customer: data });
  } catch (err) {
    console.error("Errore aggiornamento cliente:", err);
    return NextResponse.json({ error: "Impossibile aggiornare il cliente." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può eliminare i clienti." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione cliente:", error);
    return NextResponse.json({ error: "Impossibile eliminare il cliente." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
