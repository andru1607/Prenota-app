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

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const date = req.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Parametro 'date' obbligatorio." }, { status: 400 });
  }

  const { data, error } = await supabase.from("shifts").select("*").eq("date", date);

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
    const { staffId, date, slot } = await req.json();

    if (!staffId || !date || !slot) {
      return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { data, error } = await supabase
      .from("shifts")
      .insert({ restaurant_id: restaurantId, staff_id: staffId, date, slot })
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
