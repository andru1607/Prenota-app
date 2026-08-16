import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
      tables: { number: string; capacity: number; status?: string }[];
    };

    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: "Nessun tavolo da creare." }, { status: 400 });
    }

    const rows = tables.map((t) => ({
      number: t.number,
      capacity: t.capacity,
      status: t.status ?? "free",
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
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Parametri 'id' e 'status' obbligatori." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("tables")
      .update({ status })
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
