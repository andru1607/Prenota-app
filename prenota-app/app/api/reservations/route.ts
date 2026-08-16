import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedReservationDraft } from "@/types";

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

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const { drafts, source, date } = (await req.json()) as {
      drafts: ParsedReservationDraft[];
      source: "photo" | "manual";
      date?: string;
    };

    if (!drafts || drafts.length === 0) {
      return NextResponse.json({ error: "Nessuna prenotazione da salvare." }, { status: 400 });
    }

    const rows = drafts.map((d) => ({
      customer_name: d.customerName,
      party_size: d.partySize ?? 1,
      reservation_time: buildTodayIsoTime(d.reservationTime, date),
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

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const id = req.nextUrl.searchParams.get("id");
  const all = req.nextUrl.searchParams.get("all");

  try {
    if (all === "true") {
      const { error } = await supabase
        .from("reservations")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: "Parametro 'id' obbligatorio." }, { status: 400 });
    }

    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore eliminazione prenotazione:", err);
    return NextResponse.json({ error: "Impossibile eliminare." }, { status: 500 });
  }
}

function buildTodayIsoTime(time: string | null, dateStr?: string): string {
  const base = dateStr ? new Date(dateStr + "T00:00:00Z") : new Date();
  const y = dateStr ? base.getUTCFullYear() : base.getFullYear();
  const m = dateStr ? base.getUTCMonth() : base.getMonth();
  const d = dateStr ? base.getUTCDate() : base.getDate();

  let hours = base.getHours();
  let minutes = base.getMinutes();
  if (time && /^\d{1,2}:\d{2}$/.test(time)) {
    [hours, minutes] = time.split(":").map(Number);
  }

  return toItalyIso(y, m, d, hours, minutes);
}

function toItalyIso(year: number, month: number, day: number, hours: number, minutes: number): string {
  const guess = new Date(Date.UTC(year, month, day, hours, minutes));

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(guess);

  const map: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== "literal") map[p.type] = p.value;
  });

  const shownAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour === "24" ? "0" : map.hour),
    Number(map.minute),
    Number(map.second)
  );

  const offsetMs = guess.getTime() - shownAsUtc;
  const corrected = new Date(guess.getTime() + offsetMs);

  return corrected.toISOString();
}
