import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveStaffRow } from "@/lib/restaurant";

export async function requireAdmin(supabase: SupabaseClient): Promise<boolean> {
  const row = await getActiveStaffRow(supabase);
  return row?.role === "admin";
}
