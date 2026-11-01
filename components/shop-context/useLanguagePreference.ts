"use client";
import { useCallback, useSyncExternalStore } from "react";
import type { Language } from "@/lib/catalog";
import { languageKey, persistLanguage, readLanguage, type LanguageStorage } from "@/lib/language-preference";

const eventName = "sushi-language-change";
let memory: Language | undefined;
function storage(): LanguageStorage {
  return {
    get cookie() { return document.cookie; },
    set cookie(value: string) { document.cookie = value; },
    read: () => localStorage.getItem(languageKey),
    write: value => localStorage.setItem(languageKey, value),
  };
}
function subscribe(notify: () => void) {
  // Migrate the existing local preference to a server-readable cookie.
  const current = readLanguage(storage(), memory ?? "de");
  persistLanguage(storage(), current);
  const synchronize = () => { memory = undefined; notify(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key === languageKey || event.key === null) synchronize();
  };
  window.addEventListener(eventName, notify);
  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", synchronize);
  window.addEventListener("focus", synchronize);
  return () => {
    window.removeEventListener(eventName, notify);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", synchronize);
    window.removeEventListener("focus", synchronize);
  };
}
export function useLanguagePreference(initialLanguage: Language) {
  const lang = useSyncExternalStore(subscribe, () => readLanguage(storage(), memory ?? initialLanguage), () => initialLanguage);
  const setLang = useCallback((language: Language) => {
    memory = language;
    persistLanguage(storage(), language);
    window.dispatchEvent(new Event(eventName));
  }, []);
  return { lang, setLang };
}
