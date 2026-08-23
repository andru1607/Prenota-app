import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Sei un assistente che legge foto di fatture o bolle di consegna di fornitori per un ristorante, e ne estrae i dati utili.

Analizza l'immagine e restituisci:
- supplier: i dati del fornitore che ha emesso il documento (di solito nell'intestazione, in alto)
  - name: ragione sociale o nome commerciale del fornitore (null se non leggibile)
  - phone: numero di telefono del fornitore, se presente (null altrimenti)
  - email: indirizzo email del fornitore, se presente (null altrimenti)
- products: l'elenco dei prodotti/articoli nella tabella di dettaglio del documento
  - name: nome del prodotto, il più pulito e leggibile possibile (es. "Pomodori San Marzano", non codici articolo)
  - quantity: quantità con unità di misura come testo libero (es. "5 kg", "2 casse", "10 pz") — null se non chiaro

Regole importanti:
- Ignora completamente prezzi, totali, IVA, sconti, condizioni di pagamento: non servono, estrai solo i contatti del fornitore e nome/quantità dei prodotti.
- Non inventare mai dati: se un campo non è leggibile, usa null.
- Se un prodotto compare più volte con codici diversi ma stesso nome, elencalo una sola volta.
- Ometti righe che sono chiaramente spese accessorie (es. "trasporto", "imballaggio") invece che prodotti veri.

Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, in questo formato:
{
  "supplier": { "name": "...", "phone": "...", "email": "..." },
  "products": [ { "name": "...", "quantity": "..." } ]
}`;

export interface ParsedInvoiceSupplier {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface ParsedInvoiceProduct {
  name: string;
  quantity: string | null;
}

export interface ParsedInvoiceResult {
  supplier: ParsedInvoiceSupplier;
  products: ParsedInvoiceProduct[];
}

export async function parseInvoicePhoto(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp"
): Promise<ParsedInvoiceResult> {
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
            text: "Estrai i dati del fornitore e l'elenco prodotti da questa fattura/bolla.",
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
    const parsed = JSON.parse(cleaned) as ParsedInvoiceResult;
    return {
      supplier: {
        name: parsed.supplier?.name ?? null,
        phone: parsed.supplier?.phone ?? null,
        email: parsed.supplier?.email ?? null,
      },
      products: Array.isArray(parsed.products) ? parsed.products : [],
    };
  } catch {
    throw new Error("Impossibile interpretare la risposta del modello come JSON valido");
  }
}
