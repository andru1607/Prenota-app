import Anthropic from "@anthropic-ai/sdk";
import type { ParsedReservationDraft } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Sei un assistente che legge foto di agende cartacee scritte a mano, oppure screenshot di app come TheFork, e ne estrae le prenotazioni di un ristorante.

Per ogni prenotazione che riesci a identificare, estrai:
- customerName: il nome del cliente (se leggibile)
- partySize: il numero di coperti/persone (numero intero, o null se non leggibile)
- reservationTime: l'orario nel formato "HH:MM" (o null se non leggibile)
- notes: qualunque dettaglio aggiuntivo visibile accanto alla prenotazione, anche piccolo — non solo note scritte a mano. Includi ad esempio: sconti o promozioni (es. "-30%", "Sconto TheFork"), etichette come "occasione speciale", "cliente fedele", "prima volta", allergie, richieste particolari (es. tavolo vicino alla finestra, seggiolone), o qualunque badge/icona con testo visibile nello screenshot. Se ci sono più dettagli, elencali tutti separati da virgola. Ometti il campo solo se non c'è davvero nulla.
- confidence: "high" se sei sicuro della lettura, "medium" se hai qualche dubbio (es. nome ambiguo), "low" se hai dovuto indovinare gran parte del contenuto

Regole importanti:
- Non inventare mai dati: se un campo non è leggibile, usa null (o ometti "notes").
- Presta particolare attenzione ai dettagli piccoli o in caratteri ridotti (badge, etichette colorate, percentuali di sconto): sono spesso importanti quanto nome e orario, anche se scritti in piccolo.
- Se la grafia è ambigua, scegli l'interpretazione più plausibile ma imposta confidence su "low" o "medium" di conseguenza — la conferma finale spetta allo staff, non a te.
- Ignora scarabocchi, cancellature, o testo chiaramente non legato a una prenotazione.

Rispondi SOLO con un array JSON valido, senza testo prima o dopo, nel formato:
[
  { "customerName": "...", "partySize": 4, "reservationTime": "20:30", "notes": "...", "confidence": "high" }
]`;

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
