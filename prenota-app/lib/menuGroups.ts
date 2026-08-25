export type Destination = "kitchen" | "bar";

export interface MenuGroup {
  label: string;
  destination: Destination;
  matches: string[];
}

export const MENU_GROUPS: MenuGroup[] = [
  { label: "Antipasti", destination: "kitchen", matches: ["Antipasti di Mare", "Antipasti di Lago", "Antipasti", "Antipasti Vegan"] },
  { label: "Primi", destination: "kitchen", matches: ["Primi di Mare", "Primi di Lago", "Primi", "Primi Vegan"] },
  { label: "Secondi", destination: "kitchen", matches: ["Secondi di Mare", "Secondi di Lago", "Secondi"] },
  { label: "Pizze", destination: "kitchen", matches: ["Pizze"] },
  { label: "Burger", destination: "kitchen", matches: ["Burger"] },
  { label: "Contorni", destination: "kitchen", matches: ["Contorni"] },
  { label: "Insalatone", destination: "kitchen", matches: ["Insalatone"] },
  { label: "Dolci", destination: "kitchen", matches: ["Dolci"] },
  { label: "Servizio", destination: "kitchen", matches: ["Servizio"] },
  { label: "Bevande", destination: "bar", matches: ["Bibite"] },
  { label: "Birre", destination: "bar", matches: ["Birre"] },
  { label: "Vini", destination: "bar", matches: ["Vino Sfuso", "Vini Rossi", "Vini Bianchi", "Bollicine", "Vini Rosati"] },
  { label: "Spritz", destination: "bar", matches: ["Spritz", "Spritz Analcolici"] },
  { label: "Cocktails", destination: "bar", matches: ["Cocktails", "Gin Tonic"] },
  { label: "Caffetteria", destination: "bar", matches: ["Caffetteria"] },
  { label: "Grappe e Amari", destination: "bar", matches: ["Grappe e Amari"] },
];

const FALLBACK_GROUP: MenuGroup = { label: "Altro", destination: "kitchen", matches: [] };

export function groupForCategory(rawCategory: string | null | undefined): MenuGroup {
  const cat = (rawCategory || "").trim();
  return MENU_GROUPS.find((g) => g.matches.includes(cat)) ?? FALLBACK_GROUP;
}
