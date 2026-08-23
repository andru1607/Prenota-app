import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToRestaurant } from "@/lib/push";
import { upsertCustomerFromReservation } from "@/lib/customers";
import { isDateOpen } from "@/lib/schedule";

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "Parametro 'restaurantId' obbligatorio." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "name, logo_url, primary_color, closed_weekdays, description, address, contact_phone, opening_hours_text"
    )
    .eq("id", restaurantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Ristorante non trovato." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: exceptions } = await supabase
    .from("schedule_exceptions")
    .select("date, is_open")
    .eq("restaurant_id", restaurantId)
    .gte("date", today);

  const { data: menuItems } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("category", { ascending: true })
    .order("position", { ascending: true });

  return NextResponse.json({
    restaurant: data,
    exceptions: exceptions ?? [],
    menuItems: menuItems ?? [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, customerName, phone, date, time, partySize, notes, website } = await req.json();

    if (website) {
      return NextResponse.json({ success: true, status: "confirmed" });
    }

    if (!restaurantId || !customerName || !date || !time || !partySize) {
      return NextResponse.json({ error: "Compila tutti i campi." }, { status: 400 });
    }
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: "Orario non valido." }, { status: 400 });
    }
    if (customerName.length > 100) {
      return NextResponse.json({ error: "Nome troppo lungo." }, { status: 400 });
    }
    if (phone && phone.length > 30) {
      return NextResponse.json({ error: "Numero di telefono non valido." }, { status: 400 });
    }
    if (notes && notes.length > 300) {
      return NextResponse.json({ error: "Le richieste particolari sono troppo lunghe." }, { status: 400 });
    }
    const size = Number(partySize);
    if (!Number.isInteger(size) || size < 1 || size > 50) {
      return NextResponse.json({ error: "Numero di persone non valido." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id, closed_weekdays")
      .eq("id", restaurantId)
      .single();

    if (!restaurant) {
      return NextResponse.json({ error: "Ristorante non trovato." }, { status: 404 });
    }

    if (phone) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("reservations")
        .select("*", { count: "exact", head: true })
        .eq("phone", phone)
        .eq("source", "public")
        .gte("created_at", oneHourAgo);

      if ((count ?? 0) >= 3) {
        return NextResponse.json(
          { error: "Troppe richieste inviate di recente. Riprova tra qualche minuto." },
          { status: 429 }
        );
      }
    }

    const { data: exceptionRow } = await supabase
      .from("schedule_exceptions")
      .select("date, is_open")
      .eq("restaurant_id", restaurantId)
      .eq("date", date)
      .maybeSingle();

    const open = isDateOpen(
      date,
      restaurant.closed_weekdays ?? [],
      exceptionRow ? [exceptionRow] : []
    );

    if (!open) {
      return NextResponse.json(
        { error: "Il ristorante è chiuso in questa data. Scegli un altro giorno." },
        { status: 400 }
      );
    }

    const status = size <= 6 ? "confirmed" : "pending";
    const reservationTime = toItalyIso(date, time);

    const { data: insertedReservation, error } = await supabase
      .from("reservations")
      .insert({
        restaurant_id: restaurantId,
        customer_name: customerName,
        phone: phone || null,
        party_size: size,
        reservation_time: reservationTime,
        notes: notes?.trim() || null,
        status,
        source: "public",
      })
      .select("id")
      .single();

    if (error || !insertedReservation) {
      console.error("Errore richiesta pubblica:", error);
      return NextResponse.json({ error: "Impossibile inviare la richiesta." }, { status: 500 });
    }

    await upsertCustomerFromReservation(supabase, restaurantId, customerName, phone);

    const notificationBody =
      status === "confirmed"
        ? `${customerName} ha prenotato per ${size} persone alle ${time}`
        : `${customerName} chiede un tavolo da ${size} persone alle ${time} — da confermare`;

    try {
      await sendPushToRestaurant(restaurantId, {
        title: status === "confirmed" ? "Nuova prenotazione" : "Richiesta da confermare",
        body: notificationBody,
        url: "/prenotazioni",
      });
    } catch (err) {
      console.error("Errore invio notifica:", err);
    }

    return NextResponse.json({ success: true, status, reservationId: insertedReservation.id });
  } catch (err) {
    console.error("Errore richiesta pubblica:", err);
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
