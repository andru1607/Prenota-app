import type { SupabaseClient } from "@supabase/supabase-js";

export async function getRestaurantId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utente non autenticato");
  }

  const { data, error } = await supabase
    .from("staff")
    .select("restaurant_id")
    .eq("auth_user_id", user.id)
    .single();

  if (error || !data?.restaurant_id) {
    throw new Error("Nessun ristorante collegato a questo utente");
  }

  return data.restaurant_id;
}
