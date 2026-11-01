import type { Language } from './catalog';

export const languageKey = 'sushi-lang';
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && ['de', 'en', 'uk', 'fa'].includes(value);
}
export function languageFromCookie(cookie: string): Language | null {
  const value = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${languageKey}=`))
    ?.slice(languageKey.length + 1);
  return isLanguage(value) ? value : null;
}
export type LanguageStorage = {
  cookie: string;
  read: () => string | null;
  write: (value: string) => void;
};
export function readLanguage(
  storage: LanguageStorage,
  fallback: Language,
): Language {
  try {
    const saved = storage.read();
    if (isLanguage(saved)) return saved;
  } catch {
    /* Private browsing can deny storage. */
  }
  try {
    const cookie = languageFromCookie(storage.cookie);
    if (cookie) return cookie;
  } catch {
    /* Some privacy settings also deny access to cookies. */
  }
  return fallback;
}
export function persistLanguage(storage: LanguageStorage, language: Language) {
  if (!isLanguage(language)) return;
  // Both stores are written in the selection handler, before a link can unload the page.
  try {
    storage.cookie = `${languageKey}=${language}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* Keep the other persistence channel available. */
  }
  try {
    storage.write(language);
  } catch {
    /* Cookie remains available to the server. */
  }
}
