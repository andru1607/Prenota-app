import { NextRequest, NextResponse } from "next/server";
import { parseAgendaPhoto } from "@/lib/parseAgendaPhoto";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "Parametri 'image' e 'mediaType' obbligatori" },
        { status: 400 }
      );
    }

    const rawDrafts = await parseAgendaPhoto(image, mediaType);

    const supabase = createClient();
    const { data: existing } = await supabase
      .from("reservations")
      .select("customer_name, reservation_time")
      .neq("status", "cancelled");

    const existingKeys = new Set(
      (existing ?? []).map((r) =>
        buildDuplicateKey(r.customer_name, formatTimeFromIso(r.reservation_time))
      )
    );

    const drafts = [];
    const skipped: string[] = [];

    for (const draft of rawDrafts) {
      const key = buildDuplicateKey(draft.customerName, draft.reservationTime);
      if (draft.reservationTime && existingKeys.has(key)) {
        skipped.push(`${draft.customerName} (${draft.reservationTime})`);
      } else {
        drafts.push(draft);
      }
    }

    return NextResponse.json({ drafts, skipped });
  } catch (err) {
    console.error("Errore lettura agenda:", err);
    return NextResponse.json(
      { error: "Impossibile leggere l'agenda dalla foto. Riprova o inserisci manualmente." },
      { status: 500 }
    );
  }
}

function buildDuplicateKey(name: string, time: string | null): string {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, " ");
  return `${normalizedName}|${time ?? ""}`;
}

function formatTimeFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}
