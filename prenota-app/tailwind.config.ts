import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "var(--color-bg)",
          subtle: "var(--color-bg-subtle)",
        },
        ink: {
          DEFAULT: "#18181B",
          muted: "#71717A",
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          light: "var(--color-primary-light)",
        },
        status: {
          free: "#16A34A",
          freeBg: "#F0FDF4",
          pending: "#D97706",
          pendingBg: "#FFFBEB",
          danger: "#DC2626",
          dangerBg: "#FEF2F2",
          closed: "#71717A",
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
