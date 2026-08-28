import { NextRequest, NextResponse } from "next/server";
import { parseFatturaPhoto } from "@/lib/parseFatturaPhoto";

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "Parametri 'image' e 'mediaType' obbligatori" },
        { status: 400 }
      );
    }

    const drafts = await parseFatturaPhoto(image, mediaType);

    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("Errore lettura fattura:", err);
    return NextResponse.json(
      { error: "Impossibile leggere la fattura dalla foto. Riprova o inserisci manualmente." },
      { status: 500 }
    );
  }
}
