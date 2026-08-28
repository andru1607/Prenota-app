import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type ParsedFatturaDraft = {
  productName: string;
  quantity: number | null;
  confidence: "high" | "medium" | "low";
};

const SYSTEM_PROMPT = `Sei un assistente che legge foto di fatture o bolle di consegna di un bar, e ne estrae i prodotti (bottiglie, bevande, ingredienti) con le relative quantità.

Per ogni riga prodotto che riesci a identificare, estrai:
- productName: il nome del prodotto così come scritto in fattura (es. "Gin Bombay Sapphire 70cl")
- quantity: il numero di pezzi/bottiglie consegnati per quella riga (numero intero, o null se non leggibile)
- confidence: "high" se sei sicuro della lettura, "medium" se hai qualche dubbio, "low" se hai dovuto indovinare gran parte del contenuto

Regole importanti:
- Ignora righe che non sono prodotti: totali, IVA, spese di trasporto, indirizzi, codici fiscali, numeri d'ordine, intestazioni.
- Non inventare mai dati: se un campo non è leggibile, usa null.
- Se la stampa o la grafia è ambigua, scegli l'interpretazione più plausibile ma imposta confidence di conseguenza — la conferma finale spetta sempre allo staff, non a te.
- Se la stessa fattura elenca più taglie/formati dello stesso prodotto su righe separate, trattale come righe distinte.

Rispondi SOLO con un array JSON valido, senza testo prima o dopo, nel formato:
[
  { "productName": "...", "quantity": 6, "confidence": "high" }
]`;

export async function parseFatturaPhoto(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ParsedFatturaDraft[]> {
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
            text: "Estrai tutti i prodotti leggibili da questa fattura o bolla di consegna.",
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
    return JSON.parse(cleaned) as ParsedFatturaDraft[];
  } catch {
    throw new Error("Impossibile interpretare la risposta del modello come JSON valido");
  }
}
