"use client";
import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import type { Language } from "@/lib/catalog";
import { isLanguage, languageKey, persistLanguage, readLanguage, type LanguageStorage } from "@/lib/language-preference";

const eventName = "sushi-language-change";
let memory: Language | undefined;
let lastPersisted: Language | undefined;
function storage(): LanguageStorage {
  return {
    get cookie() { return document.cookie; },
    set cookie(value: string) { document.cookie = value; },
    read: () => localStorage.getItem(languageKey),
    write: value => localStorage.setItem(languageKey, value),
  };
}
function subscribe(notify: () => void, fallback: Language) {
  // Migrate the existing local preference to a server-readable cookie.
  const current = memory ?? readLanguage(storage(), fallback);
  persistLanguage(storage(), current);
  lastPersisted = readLanguage(storage(), current);
  const synchronize = () => {
    const persisted = readLanguage(storage(), memory ?? fallback);
    // Preserve this tab's selection if a browser silently refused both writes.
    // A later value from another tab still takes effect on focus/back navigation.
    if (persisted !== lastPersisted) memory = persisted;
    lastPersisted = persisted;
    notify();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === languageKey || event.key === null) {
      memory = isLanguage(event.newValue) ? event.newValue : undefined;
      synchronize();
    }
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
  const listen = useCallback((notify: () => void) => subscribe(notify, initialLanguage), [initialLanguage]);
  const lang = useSyncExternalStore(listen, () => memory ?? readLanguage(storage(), initialLanguage), () => initialLanguage);
  const setLang = useCallback((language: Language) => {
    memory = language;
    persistLanguage(storage(), language);
    lastPersisted = readLanguage(storage(), language);
    window.dispatchEvent(new Event(eventName));
  }, []);
  useLayoutEffect(() => {
    const desired = memory ?? readLanguage(storage(), initialLanguage);
    const root = document.documentElement;
    if (lang !== desired) {
      root.dataset.languagePending = desired;
      return;
    }
    root.lang = lang;
    root.dir = lang === "fa" ? "rtl" : "ltr";
    root.dataset.languagePreference = lang;
    delete root.dataset.languagePending;
  }, [lang, initialLanguage]);
  return { lang, setLang };
}
