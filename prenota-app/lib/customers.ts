import type { SupabaseClient } from "@supabase/supabase-js";

const REGULAR_THRESHOLD = 3;

export async function upsertCustomerFromReservation(
  supabase: SupabaseClient,
  restaurantId: string,
  customerName: string,
  phone?: string | null
) {
  if (!phone) return;

  try {
    const { data: existing } = await supabase
      .from("customers")
      .select("id, reservation_count")
      .eq("restaurant_id", restaurantId)
      .eq("phone", phone)
      .maybeSingle();

    if (existing) {
      const newCount = (existing.reservation_count ?? 0) + 1;
      await supabase
        .from("customers")
        .update({
          name: customerName,
          reservation_count: newCount,
          is_regular: newCount >= REGULAR_THRESHOLD,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("customers").insert({
        restaurant_id: restaurantId,
        name: customerName,
        phone,
        reservation_count: 1,
        is_regular: false,
      });
    }
  } catch (err) {
    console.error("Errore aggiornamento cliente:", err);
  }
}
