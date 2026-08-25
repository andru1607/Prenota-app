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
        sans: ["var(--font-manrope)", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      boxShadow: {
        sm: "0 1px 2px rgba(24,24,27,0.04), 0 4px 10px -4px rgba(24,24,27,0.06)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
    },
  },
  plugins: [],
};

export default config;
