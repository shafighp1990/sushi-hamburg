import uiTranslations from "@/lib/knowledge-ui-translations.json";
import { useShop } from "../shop-context";
import { type Language } from "@/lib/catalog";
export const kt = (lang: Language, key: string) =>
  (uiTranslations as Record<string, Record<Language, string>>)[key]?.[lang] ||
  key;

export function useLanguage() {
  const { lang, setLang } = useShop();
  return [lang, setLang] as const;
}

export { LiveProductDetail as ProductDetail } from ".././product-detail";
