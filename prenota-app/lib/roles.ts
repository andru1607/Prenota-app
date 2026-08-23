import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/activeRestaurant";

export interface MyStaffRow {
  restaurantId: string;
  role: "admin" | "staff";
}

export async function getMyStaffRow(): Promise<MyStaffRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staffRows } = await supabase
    .from("staff")
    .select("restaurant_id, role")
    .eq("auth_user_id", user.id);

  if (!staffRows || staffRows.length === 0) return null;

  const activeId = getActiveRestaurantId();
  const match = staffRows.find((r) => r.restaurant_id === activeId) ?? staffRows[0];

  if (match.role !== "admin" && match.role !== "staff") return null;

  return { restaurantId: match.restaurant_id, role: match.role };
}

export async function getMyRole(): Promise<"admin" | "staff" | null> {
  const row = await getMyStaffRow();
  return row?.role ?? null;
}
