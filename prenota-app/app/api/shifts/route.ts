import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const date = req.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Parametro 'date' obbligatorio." }, { status: 400 });
  }

  const restaurantId = await getRestaurantId(supabase);

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("date", date)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Errore lettura turni:", error);
    return NextResponse.json({ error: "Impossibile leggere i turni." }, { status: 500 });
  }

  return NextResponse.json({ shifts: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può modificare i turni." },
      { status: 403 }
    );
  }

  try {
    const { rosterMemberId, date, startTime, endTime } = await req.json();

    if (!rosterMemberId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
    }
    if (!/^\d{1,2}:\d{2}$/.test(startTime) || !/^\d{1,2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: "Orario non valido." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("shifts")
      .insert({
        restaurant_id: restaurantId,
        roster_member_id: rosterMemberId,
        date,
        start_time: startTime,
        end_time: endTime,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ shift: data });
  } catch (err) {
    console.error("Errore creazione turno:", err);
    return NextResponse.json({ error: "Impossibile assegnare il turno." }, { status: 500 });
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
      { error: "Solo un amministratore può modificare i turni." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("shifts").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione turno:", error);
    return NextResponse.json({ error: "Impossibile rimuovere il turno." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
