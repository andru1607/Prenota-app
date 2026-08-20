import { createClient } from "@/lib/supabase/client";

export async function getMyRole(): Promise<"admin" | "staff" | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("staff")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (data?.role === "admin") return "admin";
  if (data?.role === "staff") return "staff";
  return null;
}
