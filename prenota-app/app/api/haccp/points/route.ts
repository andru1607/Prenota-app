import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("haccp_points")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Errore lettura punti di controllo:", error);
    return NextResponse.json({ error: "Impossibile leggere i punti di controllo." }, { status: 500 });
  }

  return NextResponse.json({ points: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può aggiungere punti di controllo." },
      { status: 403 }
    );
  }

  try {
    const { name, targetMin, targetMax } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Il nome è obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("haccp_points")
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        target_min: targetMin === "" || targetMin === undefined ? null : Number(targetMin),
        target_max: targetMax === "" || targetMax === undefined ? null : Number(targetMax),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ point: data });
  } catch (err) {
    console.error("Errore creazione punto di controllo:", err);
    return NextResponse.json({ error: "Impossibile creare il punto di controllo." }, { status: 500 });
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
      { error: "Solo un amministratore può eliminare punti di controllo." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("haccp_points").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione punto di controllo:", error);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
