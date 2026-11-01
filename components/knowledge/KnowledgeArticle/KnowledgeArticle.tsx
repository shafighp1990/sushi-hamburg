"use client";
import Link from "next/link";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./KnowledgeArticle.styles";
import type { KnowledgeArticleProps } from "../knowledge.types";
import { BookOpen } from "lucide-react";
import { articles, categoryLabels, relatedProducts,  } from "@/lib/knowledge";
import { kt, useLanguage } from "../knowledge.shared";
import { Shell } from "../Shell";
import { TopicLinks } from "../TopicLinks";
import { SourceList } from "../SourceList";
import { MiniProduct } from "../MiniProduct";

export function KnowledgeArticle({ id }: KnowledgeArticleProps) {
  const [lang, setLang] = useLanguage();
  const a = articles.find((a) => a.id === id)!;
  const related = a.related.map((id) => articles.find((a) => a.id === id)!);
  const menu = relatedProducts(id);
  return (
    <Shell lang={lang} setLang={setLang}>
      <Link className={styles.a4} href="/wissen">
        {kt(lang, "Alle Wissensartikel")}
      </Link>
      <div className={styles.div8}>
        <article className={styles.article}>
          <Text className={styles.text7}>
            {categoryLabels[a.category][lang]}
          </Text>
          <Heading as="h1">{a.title[lang]}</Heading>
          {a.body[lang].map((text, i) => (
            <Text className={i === 0 ? "article-lead" : ""} key={i}>
              {text}
            </Text>
          ))}
          {a.steps[lang].length > 0 && (
            <section className={styles.section5}>
              <Heading as="h2">{kt(lang, "Schritt für Schritt")}</Heading>
              <ol>
                {a.steps[lang].map((text, i) => (
                  <li key={i}>
                    <Text as="span">{String(i + 1).padStart(2, "0")}</Text>
                    <Text>{text}</Text>
                  </li>
                ))}
              </ol>
              {id !== "sicherheit" && (
                <Link className={styles.a5} href="/wissen/sicherheit">
                  {kt(lang, "Hinweise zu Hygiene und Lagerung")}
                </Link>
              )}
            </section>
          )}
          <SourceList ids={a.sources} lang={lang} />
        </article>
        <aside className={styles.aside2}>
          <BookOpen size={24} />
          <Heading as="h2">{kt(lang, "Weiter entdecken")}</Heading>
          <TopicLinks items={related} lang={lang} />
          <Link className={styles.a6} href="/menu">
            {kt(lang, "Sushi auswählen")}
          </Link>
        </aside>
      </div>
      {menu.length > 0 && (
        <section className={styles.section6}>
          <Text className={styles.text8}>{kt(lang, "AUF UNSERER KARTE")}</Text>
          <Heading as="h2">
            {kt(lang, "Passende Gerichte aus dem Menü.")}
          </Heading>
          <div className={styles.div9}>
            {menu.map((p) => (
              <MiniProduct key={p.id} product={p} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
