import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cleaning_logs")
    .select("*")
    .order("done_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Errore lettura log pulizie:", error);
    return NextResponse.json({ error: "Impossibile leggere i log." }, { status: 500 });
  }

  return NextResponse.json({ logs: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json({ error: "Parametro 'taskId' obbligatorio." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("cleaning_logs")
      .insert({ restaurant_id: restaurantId, task_id: taskId })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ log: data });
  } catch (err) {
    console.error("Errore registrazione pulizia:", err);
    return NextResponse.json({ error: "Impossibile registrare." }, { status: 500 });
  }
}
