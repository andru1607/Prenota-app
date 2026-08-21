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
    .from("rooms")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    console.error("Errore lettura sale:", error);
    return NextResponse.json({ error: "Impossibile leggere le sale." }, { status: 500 });
  }

  return NextResponse.json({ rooms: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può creare sale." },
      { status: 403 }
    );
  }

  try {
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome della sala è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { count } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    const { data, error } = await supabase
      .from("rooms")
      .insert({ restaurant_id: restaurantId, name: name.trim(), position: count ?? 0 })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ room: data });
  } catch (err) {
    console.error("Errore creazione sala:", err);
    return NextResponse.json({ error: "Impossibile creare la sala." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può rinominare le sale." },
      { status: 403 }
    );
  }

  try {
    const { id, name } = await req.json();

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("rooms")
      .update({ name: name.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ room: data });
  } catch (err) {
    console.error("Errore rinomina sala:", err);
    return NextResponse.json({ error: "Impossibile rinominare la sala." }, { status: 500 });
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
      { error: "Solo un amministratore può eliminare le sale." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("rooms").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione sala:", error);
    return NextResponse.json({ error: "Impossibile eliminare la sala." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
