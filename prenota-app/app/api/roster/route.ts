import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("roster_members")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Errore lettura roster:", error);
    return NextResponse.json({ error: "Impossibile leggere l'elenco." }, { status: 500 });
  }

  return NextResponse.json({ members: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può aggiungere persone." },
      { status: 403 }
    );
  }

  try {
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("roster_members")
      .insert({ restaurant_id: restaurantId, name: name.trim() })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ member: data });
  } catch (err) {
    console.error("Errore creazione persona:", err);
    return NextResponse.json({ error: "Impossibile aggiungere la persona." }, { status: 500 });
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
      { error: "Solo un amministratore può rimuovere persone." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("roster_members").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione persona:", error);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
