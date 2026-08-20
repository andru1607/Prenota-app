import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const supabase = createClient();

  try {
    const restaurantId = await getRestaurantId(supabase);

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("closed_weekdays")
      .eq("id", restaurantId)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    const { data: exceptions } = await supabase
      .from("schedule_exceptions")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .gte("date", today)
      .order("date", { ascending: true });

    return NextResponse.json({
      closedWeekdays: restaurant?.closed_weekdays ?? [],
      exceptions: exceptions ?? [],
    });
  } catch (err) {
    console.error("Errore lettura orari:", err);
    return NextResponse.json({ error: "Impossibile leggere gli orari." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { closedWeekdays } = await req.json();
    const restaurantId = await getRestaurantId(supabase);

    const { error } = await supabase
      .from("restaurants")
      .update({ closed_weekdays: closedWeekdays })
      .eq("id", restaurantId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore aggiornamento giorni di chiusura:", err);
    return NextResponse.json(
      { error: "Impossibile aggiornare i giorni di chiusura." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { from, to, isOpen } = await req.json();

    if (!from) {
      return NextResponse.json({ error: "Data di inizio obbligatoria." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const startDate = new Date(from + "T12:00:00");
    const endDate = to ? new Date(to + "T12:00:00") : startDate;

    if (endDate < startDate) {
      return NextResponse.json({ error: "L'intervallo non è valido." }, { status: 400 });
    }

    const dates: string[] = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    if (dates.length > 366) {
      return NextResponse.json({ error: "Intervallo troppo grande." }, { status: 400 });
    }

    const rows = dates.map((date) => ({
      restaurant_id: restaurantId,
      date,
      is_open: isOpen,
    }));

    const { error } = await supabase
      .from("schedule_exceptions")
      .upsert(rows, { onConflict: "restaurant_id,date" });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore creazione eccezione:", err);
    return NextResponse.json({ error: "Impossibile salvare l'eccezione." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
  }

  const { error } = await supabase.from("schedule_exceptions").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione eccezione:", error);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
