import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedReservationDraft } from "@/types";

// GET /api/reservations
// Restituisce tutte le prenotazioni, ordinate per orario crescente.
// Query param opzionale ?date=YYYY-MM-DD per filtrare un giorno specifico.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const date = req.nextUrl.searchParams.get("date");

  let query = supabase
    .from("reservations")
    .select("*")
    .order("reservation_time", { ascending: true });

  if (date) {
    const start = `${date}T00:00:00`;
    const end = `${date}T23:59:59`;
    query = query.gte("reservation_time", start).lte("reservation_time", end);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Errore lettura prenotazioni:", error);
    return NextResponse.json({ error: "Impossibile leggere le prenotazioni." }, { status: 500 });
  }

  return NextResponse.json({ reservations: data });
}

// POST /api/reservations
// Body: { drafts: ParsedReservationDraft[], source: "photo" | "manual" }
// Salva una o più prenotazioni confermate dallo staff.
export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { drafts, source } = (await req.json()) as {
      drafts: ParsedReservationDraft[];
      source: "photo" | "manual";
    };

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ error: "Nessuna prenotazione da salvare." }, { status: 400 });
    }

    const rows = drafts.map((d) => ({
      customer_name: d.customerName,
      party_size: d.partySize ?? 1,
      // Combina l'orario letto (es. "20:30") con la data odierna in formato ISO.
      // Se in futuro si aggiunge selezione data, questo andrà aggiornato.
      reservation_time: buildTodayIsoTime(d.reservationTime),
      notes: d.notes || null,
      status: "confirmed",
      source: source ?? "manual",
    }));

    const { data, error } = await supabase.from("reservations").insert(rows).select();

    if (error) {
      console.error("Errore salvataggio prenotazioni:", error);
      return NextResponse.json({ error: "Impossibile salvare le prenotazioni." }, { status: 500 });
    }

    return NextResponse.json({ reservations: data });
  } catch (err) {
    console.error("Errore richiesta salvataggio:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}

// PATCH /api/reservations
// Body: { id: string, status: ReservationStatus }
// Aggiorna lo stato di una prenotazione (es. check-in, mancata presenza, cancellazione).
export async function PATCH(req: NextRequest) {
  const supabase = createClient();

  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Parametri 'id' e 'status' obbligatori." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Errore aggiornamento prenotazione:", error);
      return NextResponse.json({ error: "Impossibile aggiornare la prenotazione." }, { status: 500 });
    }

    return NextResponse.json({ reservation: data });
  } catch (err) {
    console.error("Errore richiesta aggiornamento:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}

// Converte un orario tipo "20:30" nella data odierna in formato ISO.
// Se l'orario non è leggibile, usa l'ora corrente come fallback.
function buildTodayIsoTime(time: string | null): string {
  const now = new Date();
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) {
    return now.toISOString();
  }
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
  return d.toISOString();
}
