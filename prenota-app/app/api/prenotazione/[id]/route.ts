import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToRestaurant } from "@/lib/push";
import { isDateOpen } from "@/lib/schedule";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select(
      "id, customer_name, party_size, reservation_time, status, restaurant_id, customer_confirmed_at"
    )
    .eq("id", params.id)
    .single();

  if (error || !reservation) {
    return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, logo_url, primary_color")
    .eq("id", reservation.restaurant_id)
    .single();

  return NextResponse.json({
    reservation: {
      id: reservation.id,
      customerName: reservation.customer_name,
      partySize: reservation.party_size,
      reservationTime: reservation.reservation_time,
      status: reservation.status,
      customerConfirmedAt: reservation.customer_confirmed_at,
    },
    restaurant: restaurant ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  try {
    const body = await req.json();
    const { action } = body;

    if (action !== "cancel" && action !== "modify" && action !== "confirm") {
      return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("reservations")
      .select("id, status, customer_name, reservation_time, party_size, restaurant_id")
      .eq("id", params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
    }

    if (existing.status !== "confirmed" && existing.status !== "pending") {
      return NextResponse.json(
        { error: "Questa prenotazione non può più essere modificata." },
        { status: 400 }
      );
    }

    if (action === "confirm") {
      if (existing.status !== "confirmed") {
        return NextResponse.json(
          { error: "Questa prenotazione deve prima essere confermata dal ristorante." },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("reservations")
        .update({ customer_confirmed_at: new Date().toISOString() })
        .eq("id", params.id);

      if (error) {
        console.error("Errore conferma cliente:", error);
        return NextResponse.json({ error: "Impossibile confermare." }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      const { error } = await supabase
        .from("reservations")
        .update({ status: "cancelled" })
        .eq("id", params.id);

      if (error) {
        console.error("Errore disdetta cliente:", error);
        return NextResponse.json({ error: "Impossibile disdire la prenotazione." }, { status: 500 });
      }

      const time = new Date(existing.reservation_time).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      });
      try {
        await sendPushToRestaurant(existing.restaurant_id, {
          title: "Prenotazione disdetta dal cliente",
          body: `${existing.customer_name} ha disdetto la prenotazione delle ${time}`,
          url: "/prenotazioni",
        });
      } catch (err) {
        console.error("Errore invio notifica disdetta:", err);
      }

      return NextResponse.json({ success: true });
    }

    const { date, time, partySize } = body;

    if (!date || !time || !partySize) {
      return NextResponse.json({ error: "Compila tutti i campi." }, { status: 400 });
    }
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Orario non valido." }, { status: 400 });
    }
    const size = Number(partySize);
    if (!Number.isInteger(size) || size < 1 || size > 50) {
      return NextResponse.json({ error: "Numero di persone non valido." }, { status: 400 });
    }

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("closed_weekdays")
      .eq("id", existing.restaurant_id)
      .single();

    const { data: exceptionRow } = await supabase
      .from("schedule_exceptions")
      .select("date, is_open")
      .eq("restaurant_id", existing.restaurant_id)
      .eq("date", date)
      .maybeSingle();

    const open = isDateOpen(
      date,
      restaurant?.closed_weekdays ?? [],
      exceptionRow ? [exceptionRow] : []
    );

    if (!open) {
      return NextResponse.json(
        { error: "Il ristorante è chiuso in questa data. Scegli un altro giorno." },
        { status: 400 }
      );
    }

    const newStatus = size <= 6 ? "confirmed" : "pending";
    const newReservationTime = toItalyIso(date, time);

    const { error } = await supabase
      .from("reservations")
      .update({
        reservation_time: newReservationTime,
        party_size: size,
        status: newStatus,
      })
      .eq("id", params.id);

    if (error) {
      console.error("Errore modifica cliente:", error);
      return NextResponse.json({ error: "Impossibile modificare la prenotazione." }, { status: 500 });
    }

    try {
      await sendPushToRestaurant(existing.restaurant_id, {
        title: "Prenotazione modificata dal cliente",
        body: `${existing.customer_name} ha modificato la prenotazione: ${date} alle ${time}, ${size} persone`,
        url: "/prenotazioni",
      });
    } catch (err) {
      console.error("Errore invio notifica modifica:", err);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error("Errore richiesta modifica/disdetta:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}

function toItalyIso(dateStr: string, time: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);

  const guess = new Date(Date.UTC(year, month - 1, day, hours, minutes));

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
