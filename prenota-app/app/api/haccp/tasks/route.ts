import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cleaning_tasks")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Errore lettura attività di pulizia:", error);
    return NextResponse.json({ error: "Impossibile leggere le attività." }, { status: 500 });
  }

  return NextResponse.json({ tasks: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può aggiungere attività di pulizia." },
      { status: 403 }
    );
  }

  try {
    const { name, frequency } = await req.json();

    if (!name?.trim() || !["daily", "weekly"].includes(frequency)) {
      return NextResponse.json({ error: "Dati mancanti o non validi." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("cleaning_tasks")
      .insert({ restaurant_id: restaurantId, name: name.trim(), frequency })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Errore creazione attività:", err);
    return NextResponse.json({ error: "Impossibile creare l'attività." }, { status: 500 });
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
      { error: "Solo un amministratore può eliminare attività di pulizia." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("cleaning_tasks").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione attività:", error);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
