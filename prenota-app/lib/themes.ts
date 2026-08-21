export const THEMES = {
  minimal: {
    label: "Minimal",
    description: "Pulito ed essenziale, stile gestionale",
    bg: "#FAFAFA",
    bgSubtle: "#F4F4F5",
    primary: "#4F46E5",
    primaryHover: "#4338CA",
    primaryLight: "#EEF2FF",
  },
  elegante: {
    label: "Elegante",
    description: "Toni caldi e un rosso vinaccia profondo",
    bg: "#FAF8F5",
    bgSubtle: "#F2EEE7",
    primary: "#8B2635",
    primaryHover: "#6E1E2A",
    primaryLight: "#FBEAEC",
  },
  vivace: {
    label: "Vivace",
    description: "Energico, con un arancione acceso",
    bg: "#FFFBF5",
    bgSubtle: "#FFF4E6",
    primary: "#EA580C",
    primaryHover: "#C2410C",
    primaryLight: "#FFEDD5",
  },
} as const;

export type ThemeName = keyof typeof THEMES;

export const DEFAULT_THEME: ThemeName = "minimal";

export function isValidTheme(value: string | null | undefined): value is ThemeName {
  return !!value && value in THEMES;
}

export function applyTheme(name: string | null | undefined) {
  const theme = THEMES[isValidTheme(name) ? name : DEFAULT_THEME];
  const root = document.documentElement;
  root.style.setProperty("--color-bg", theme.bg);
  root.style.setProperty("--color-bg-subtle", theme.bgSubtle);
  root.style.setProperty("--color-primary", theme.primary);
  root.style.setProperty("--color-primary-hover", theme.primaryHover);
  root.style.setProperty("--color-primary-light", theme.primaryLight);
}
