import { NextRequest, NextResponse } from "next/server";
import { parseInvoicePhoto } from "@/lib/parseInvoicePhoto";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

// Riservato all'amministratore: le fatture sono documenti contabili
export async function POST(req: NextRequest) {
  const supabase = createClient();

  if (!(await requireAdmin(supabase))) {
    return NextResponse.json(
      { error: "Solo un amministratore può leggere le fatture." },
      { status: 403 }
    );
  }

  try {
    const { image, mediaType } = await req.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { error: "Parametri 'image' e 'mediaType' obbligatori" },
        { status: 400 }
      );
    }

    const result = await parseInvoicePhoto(image, mediaType);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Errore lettura fattura:", err);
    return NextResponse.json(
      { error: "Impossibile leggere la fattura dalla foto. Riprova o inserisci manualmente." },
      { status: 500 }
    );
  }
}
