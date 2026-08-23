"use client";

import { useEffect, useState, useCallback } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n/translations";

const LANG_KEY = "prenota-app:publicLang";

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "it";
  const code = navigator.language?.slice(0, 2).toLowerCase();
  if (code === "en") return "en";
  if (code === "de") return "de";
  return "it";
}

export function useLang() {
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    const saved = window.localStorage.getItem(LANG_KEY) as Lang | null;
    setLangState(saved && saved in translations ? saved : detectBrowserLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(LANG_KEY, next);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key],
    [lang]
  );

  return { lang, setLang, t };
}
