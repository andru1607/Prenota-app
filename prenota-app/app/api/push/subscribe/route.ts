import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRestaurantId } from "@/lib/restaurant";

export async function POST(req: NextRequest) {
  const supabase = createClient();

  try {
    const subscription = await req.json();
    const restaurantId = await getRestaurantId(supabase);

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        restaurant_id: restaurantId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: "endpoint" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore salvataggio iscrizione notifiche:", err);
    return NextResponse.json({ error: "Impossibile attivare le notifiche." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();

  try {
    const { endpoint } = await req.json();
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore rimozione iscrizione notifiche:", err);
    return NextResponse.json({ error: "Impossibile disattivare le notifiche." }, { status: 500 });
  }
}
