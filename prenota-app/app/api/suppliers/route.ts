import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

async function requireAdmin(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  return data?.role === "admin";
}

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Errore lettura fornitori:", error);
    return NextResponse.json({ error: "Impossibile leggere i fornitori." }, { status: 500 });
  }

  return NextResponse.json({ suppliers: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può aggiungere fornitori." },
      { status: 403 }
    );
  }

  try {
    const { name, phone, email, category, notes } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("suppliers")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        phone: phone || null,
        email: email || null,
        category: category || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ supplier: data });
  } catch (err) {
    console.error("Errore creazione fornitore:", err);
    return NextResponse.json({ error: "Impossibile creare il fornitore." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può modificare i fornitori." },
      { status: 403 }
    );
  }

  try {
    const { id, name, phone, email, category, notes } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone || null;
    if (email !== undefined) updates.email = email || null;
    if (category !== undefined) updates.category = category || null;
    if (notes !== undefined) updates.notes = notes || null;

    const { data, error } = await supabase
      .from("suppliers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ supplier: data });
  } catch (err) {
    console.error("Errore aggiornamento fornitore:", err);
    return NextResponse.json({ error: "Impossibile aggiornare il fornitore." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può eliminare i fornitori." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("suppliers").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione fornitore:", error);
    return NextResponse.json({ error: "Impossibile eliminare il fornitore." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
