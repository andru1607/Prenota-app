"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyTheme } from "@/lib/themes";

export function ThemeLoader() {
  useEffect(() => {
    async function loadTheme() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: staffRow } = await supabase
          .from("staff")
          .select("restaurant_id")
          .eq("auth_user_id", user.id)
          .single();

        if (!staffRow?.restaurant_id) return;

        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("app_theme")
          .eq("id", staffRow.restaurant_id)
          .single();

        applyTheme(restaurant?.app_theme);
      } catch (err) {
        console.error("Errore caricamento tema:", err);
      }
    }
    loadTheme();
  }, []);

  return null;
}
