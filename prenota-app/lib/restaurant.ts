import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const ACTIVE_RESTAURANT_COOKIE = "prenota_active_restaurant";

interface ActiveStaffRow {
  restaurantId: string;
  role: string;
}

export async function getActiveStaffRow(supabase: SupabaseClient): Promise<ActiveStaffRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staffRows, error } = await supabase
    .from("staff")
    .select("restaurant_id, role")
    .eq("auth_user_id", user.id);

  if (error || !staffRows || staffRows.length === 0) return null;

  const cookieStore = cookies();
  const activeId = cookieStore.get(ACTIVE_RESTAURANT_COOKIE)?.value;
  const match = staffRows.find((r) => r.restaurant_id === activeId) ?? staffRows[0];

  return { restaurantId: match.restaurant_id, role: match.role };
}

export async function getRestaurantId(supabase: SupabaseClient): Promise<string> {
  const row = await getActiveStaffRow(supabase);
  if (!row) {
    throw new Error("Nessun ristorante collegato a questo utente");
  }
  return row.restaurantId;
}
