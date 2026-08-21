import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const pointId = req.nextUrl.searchParams.get("pointId");
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const latest = req.nextUrl.searchParams.get("latest");

  let query = supabase
    .from("haccp_readings")
    .select("*")
    .order("recorded_at", { ascending: false });

  if (pointId) {
    query = query.eq("point_id", pointId).limit(limit);
  } else if (latest === "true") {
    query = query.limit(500);
  } else {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore lettura letture HACCP:", error);
    return NextResponse.json({ error: "Impossibile leggere le letture." }, { status: 500 });
  }

  return NextResponse.json({ readings: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { pointId, value, note } = await req.json();

    if (!pointId || value === undefined || value === "") {
      return NextResponse.json({ error: "Punto di controllo e valore obbligatori." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("haccp_readings")
      .insert({
        restaurant_id: restaurantId,
        point_id: pointId,
        value: Number(value),
        note: note || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ reading: data });
  } catch (err) {
    console.error("Errore registrazione lettura:", err);
    return NextResponse.json({ error: "Impossibile registrare la lettura." }, { status: 500 });
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

  const { data: requesterStaff } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (requesterStaff?.role !== "admin") {
    return NextResponse.json(
      { error: "Solo un amministratore può eliminare una lettura." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("haccp_readings").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione lettura:", error);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
