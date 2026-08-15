import type { Config } from "tailwindcss";

// Palette del tema: base neutra "gestionale" (stile Notion/Linear) +
// colori di stato molto marcati per la leggibilità a colpo d'occhio durante il servizio.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutri base
        bg: {
          DEFAULT: "#FAFAFA",
          subtle: "#F4F4F5",
        },
        ink: {
          DEFAULT: "#18181B", // testo principale
          muted: "#71717A",   // testo secondario
        },
        // Colore primario (azioni, elementi attivi)
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        // Stati semantici — usati SEMPRE con lo stesso significato in tutta l'app
        status: {
          free: "#16A34A",      // tavolo libero / confermato
          freeBg: "#F0FDF4",
          pending: "#D97706",   // in attesa / da confermare / ritardo
          pendingBg: "#FFFBEB",
          danger: "#DC2626",    // conflitto / cancellazione / urgenza
          dangerBg: "#FEF2F2",
          closed: "#71717A",    // chiuso / non disponibile
          closedBg: "#F4F4F5",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
    },
  },
  plugins: [],
};

export default config;
