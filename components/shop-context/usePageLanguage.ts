"use client";
import { useLayoutEffect } from "react";
import type { Language } from "@/lib/catalog";
import { t } from "@/lib/shop-copy";

const descriptions: Record<Language, string> = {
  de: "Sushi-Catering und Lieferung in Hamburg. Sushi, Maki und Sets entdecken, bestellen und die Lieferung verfolgen.",
  en: "Sushi catering and delivery in Hamburg. Explore sushi, maki and sets, place an order and track your delivery.",
  uk: "Суші-кейтеринг і доставка в Гамбурзі. Обирайте суші, макі та сети, замовляйте й відстежуйте доставку.",
  fa: "کیترینگ سوشی و ارسال در هامبورگ. سوشی، ماکی و ست‌ها را ببینید، سفارش دهید و وضعیت ارسال را پیگیری کنید.",
};

export function usePageLanguage(lang: Language) {
  useLayoutEffect(() => {
    const update = () => {
      if (document.documentElement.dataset.languagePending) return;
      const content = document.querySelector('.sushi-language-content');
      if (content?.getAttribute('lang') !== lang) return;
      const path = location.pathname;
      const heading = path.startsWith('/account') ? t(lang, 'account')
        : path.startsWith('/admin') ? t(lang, 'admin')
          : content.querySelector('main h1')?.textContent?.replace(/\s+/g, ' ').trim();
      const title = heading ? `${heading} · Sushi HH Hamburg` : 'Sushi HH Hamburg';
      if (document.title !== title) document.title = title;
      const description = document.querySelector('meta[name="description"]');
      if (description?.getAttribute('content') !== descriptions[lang]) {
        description?.setAttribute('content', descriptions[lang]);
      }
    };
    update();
    // Navigation can replace a page after the shared provider has mounted.
    // Read its translated heading instead of reusing static German metadata.
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const head = document.head;
    observer.observe(head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [lang]);
}
