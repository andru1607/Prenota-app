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

  const { data, error } = await supabase.from("tables").select("*").order("number", { ascending: true });

  if (error) {
    console.error("Errore lettura tavoli:", error);
    return NextResponse.json({ error: "Impossibile leggere i tavoli." }, { status: 500 });
  }

  return NextResponse.json({ tables: data });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { tables } = (await req.json()) as {
      tables: { number: string; capacity: number; status?: string; roomId?: string | null }[];
    };

    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: "Nessun tavolo da creare." }, { status: 400 });
    }

    const restaurantId = await getRestaurantId(supabase);

    const { count } = await supabase
      .from("tables")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    if ((count ?? 0) > 0 && !(await requireAdmin(supabase))) {
      return NextResponse.json(
        { error: "Solo un amministratore può creare nuovi tavoli." },
        { status: 403 }
      );
    }

    const rows = tables.map((t) => ({
      number: t.number,
      capacity: t.capacity,
      status: t.status ?? "free",
      room_id: t.roomId || null,
      restaurant_id: restaurantId,
    }));

    const { data, error } = await supabase.from("tables").insert(rows).select();

    if (error) {
      console.error("Errore creazione tavoli:", error);
      return NextResponse.json({ error: "Impossibile creare i tavoli." }, { status: 500 });
    }

    return NextResponse.json({ tables: data });
  } catch (err) {
    console.error("Errore richiesta creazione tavoli:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, status, number, capacity, roomId } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const isStructuralChange = number !== undefined || capacity !== undefined || roomId !== undefined;
    if (isStructuralChange && !(await requireAdmin(supabase))) {
      return NextResponse.json(
        { error: "Solo un amministratore può modificare numero, capienza o sala dei tavoli." },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (number !== undefined) updates.number = number;
    if (capacity !== undefined) updates.capacity = capacity;
    if (roomId !== undefined) updates.room_id = roomId || null;

    const { data, error } = await supabase
      .from("tables")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Errore aggiornamento tavolo:", error);
      return NextResponse.json({ error: "Impossibile aggiornare il tavolo." }, { status: 500 });
    }

    return NextResponse.json({ table: data });
  } catch (err) {
    console.error("Errore richiesta aggiornamento tavolo:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
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
      { error: "Solo un amministratore può eliminare i tavoli." },
      { status: 403 }
    );
  }

  const { error } = await supabase.from("tables").delete().eq("id", id);

  if (error) {
    console.error("Errore eliminazione tavolo:", error);
    return NextResponse.json({ error: "Impossibile eliminare il tavolo." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
