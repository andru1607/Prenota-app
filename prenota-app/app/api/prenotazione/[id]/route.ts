import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToRestaurant } from "@/lib/push";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: reservation, error } = await supabase
    .from("reservations")
    .select("id, customer_name, party_size, reservation_time, status, restaurant_id")
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
    },
    restaurant: restaurant ?? null,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  try {
    const { action } = await req.json();

    if (action !== "cancel") {
      return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("reservations")
      .select("id, status, customer_name, reservation_time, restaurant_id")
      .eq("id", params.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
    }

    if (existing.status !== "confirmed" && existing.status !== "pending") {
      return NextResponse.json(
        { error: "Questa prenotazione non può essere disdetta." },
        { status: 400 }
      );
    }

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
  } catch (err) {
    console.error("Errore richiesta disdetta:", err);
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }
}
