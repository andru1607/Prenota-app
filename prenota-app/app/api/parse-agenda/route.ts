import { NextRequest, NextResponse } from "next/server";
import { parseAgendaPhoto } from "@/lib/parseAgendaPhoto";

// POST /api/parse-agenda
// Body: { image: string (base64 senza prefisso), mediaType: "image/jpeg" | "image/png" | "image/webp" }
// Risposta: { drafts: ParsedReservationDraft[] }
//
// IMPORTANTE: questa route NON scrive nulla nel database.
// Restituisce solo bozze che lo staff deve confermare dalla UI
// (vedi componente PhotoImportReview) prima che diventino prenotazioni reali.
export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "Parametri 'image' e 'mediaType' obbligatori" },
        { status: 400 }
      );
    }

    const drafts = await parseAgendaPhoto(image, mediaType);

    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("Errore lettura agenda:", err);
    return NextResponse.json(
      { error: "Impossibile leggere l'agenda dalla foto. Riprova o inserisci manualmente." },
      { status: 500 }
    );
  }
}
