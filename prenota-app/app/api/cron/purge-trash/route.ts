import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const admin = createAdminClient();
    const { error, count } = await admin
      .from("reservations")
      .delete({ count: "exact" })
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff.toISOString());

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: count ?? 0 });
  } catch (err) {
    console.error("Errore pulizia cestino:", err);
    return NextResponse.json({ error: "Errore pulizia cestino." }, { status: 500 });
  }
}
