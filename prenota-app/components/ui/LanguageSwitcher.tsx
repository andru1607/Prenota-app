"use client";

import type { Lang } from "@/lib/i18n/translations";

const OPTIONS: { code: Lang; label: string }[] = [
  { code: "it", label: "IT" },
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
];

interface LanguageSwitcherProps {
  lang: Lang;
  onChange: (lang: Lang) => void;
  accentColor?: string;
}

export function LanguageSwitcher({ lang, onChange, accentColor }: LanguageSwitcherProps) {
  return (
    <div className="flex justify-center gap-1.5">
      {OPTIONS.map((opt) => {
        const active = opt.code === lang;
        return (
          <button
            key={opt.code}
            onClick={() => onChange(opt.code)}
            className={`touch-target rounded-full px-3 text-xs font-semibold ${
              active ? "text-white" : "border border-black/10 text-ink-muted"
            }`}
            style={active && accentColor ? { backgroundColor: accentColor } : undefined}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
