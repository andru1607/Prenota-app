"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyTheme } from "@/lib/themes";
import { getMyStaffRow } from "@/lib/roles";

export function ThemeLoader() {
  useEffect(() => {
    async function loadTheme() {
      try {
        const staffRow = await getMyStaffRow();
        if (!staffRow) return;

        const supabase = createClient();
        const { data: restaurant } = await supabase
          .from("restaurants")
          .select("app_theme")
          .eq("id", staffRow.restaurantId)
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
