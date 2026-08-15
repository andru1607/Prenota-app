import Anthropic from "@anthropic-ai/sdk";
import type { ParsedReservationDraft } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Sei un assistente che legge foto di agende cartacee scritte a mano da un ristorante e ne estrae le prenotazioni.

Per ogni prenotazione che riesci a identificare nella foto, estrai:
- customerName: il nome del cliente (se leggibile)
- partySize: il numero di coperti/persone (numero intero, o null se non leggibile)
- reservationTime: l'orario nel formato "HH:MM" (o null se non leggibile)
- notes: eventuali note aggiuntive scritte accanto (es. allergie, richieste particolari), o omesso se assenti
- confidence: "high" se sei sicuro della lettura, "medium" se hai qualche dubbio (es. nome ambiguo), "low" se hai dovuto indovinare gran parte del contenuto

Regole importanti:
- Non inventare mai dati: se un campo non è leggibile, usa null (o ometti "notes").
- Se la grafia è ambigua, scegli l'interpretazione più plausibile ma imposta confidence su "low" o "medium" di conseguenza — la conferma finale spetta allo staff, non a te.
- Ignora scarabocchi, cancellature, o testo chiaramente non legato a una prenotazione.

Rispondi SOLO con un array JSON valido, senza testo prima o dopo, nel formato:
[
  { "customerName": "...", "partySize": 4, "reservationTime": "20:30", "notes": "...", "confidence": "high" }
]`;

/**
 * Invia una foto dell'agenda (base64) a Claude e restituisce le prenotazioni
 * estratte come BOZZE — non ancora salvate nel database.
 * Lo staff deve sempre confermare/correggere prima che diventino prenotazioni reali
 * (la scrittura a mano è ambigua: mai inserimento automatico senza revisione).
 */
export async function parseAgendaPhoto(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ParsedReservationDraft[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: "Estrai tutte le prenotazioni leggibili da questa foto dell'agenda.",
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Nessuna risposta testuale dal modello");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned) as ParsedReservationDraft[];
  } catch {
    throw new Error("Impossibile interpretare la risposta del modello come JSON valido");
  }
}
