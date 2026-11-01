"use client";
import Link from "next/link";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Button } from "@/components/primitives/Button";
import { styles } from "./KnowledgeIndex.styles";
import { useState } from "react";
import { BookOpen, Search } from "lucide-react";
import {
  articles,
  categoryLabels,
  searchArticles,
  type KnowledgeCategory,
} from "@/lib/knowledge";
import { products } from "@/lib/catalog";
import { kt, useLanguage } from "../knowledge.shared";
import { Shell } from "../Shell";
import { ArticleCard } from "../ArticleCard";

export function KnowledgeIndex() {
  const [lang, setLang] = useLanguage();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all");
  const found = searchArticles(query, category);
  return (
    <Shell lang={lang} setLang={setLang}>
      <section className={styles.section2}>
        <div>
          <Text className={styles.text4}>
            <BookOpen size={16} /> SUSHI JOURNAL
          </Text>
          <Heading as="h1">{kt(lang, "Sushi verstehen.")}</Heading>
          <Text>
            {kt(
              lang,
              "Was steckt in deiner Rolle? Entdecke Sushi-Arten, Zutaten und die Handgriffe dahinter — mit Quellen aus Japan und Asien.",
            )}
          </Text>
          <div className={styles.div3}>
            <Text as="span">
              <Text as="b">{articles.length}</Text>
              {kt(lang, "Wissensartikel")}
            </Text>
            <Text as="span">
              <Text as="b">{products.length}</Text>
              {kt(lang, "Produkte erklärt")}
            </Text>
            <Text as="span">
              <Text as="b">DE / UA / EN / FA</Text>
              {kt(lang, "Vier Sprachen")}
            </Text>
          </div>
        </div>
        <aside className={styles.aside}>
          <Text as="span" className={styles.text5}>
            01 / {kt(lang, "DER URSPRUNG")}
          </Text>
          <Heading as="h2">{kt(lang, "Wie Sushi entstand.")}</Heading>
          <Text>
            {kt(
              lang,
              "Von fermentiertem Fisch über Essigreis bis zur modernen Rolle: Sushi hat sich über Jahrhunderte verändert.",
            )}
          </Text>
          <Link className={styles.a2} href="/wissen/geschichte">
            {kt(lang, "Die Geschichte entdecken")}
          </Link>
        </aside>
      </section>
      <section
        className={styles.section3}
        aria-label={kt(lang, "Wissensbibliothek")}
      >
        <div className={styles.div4}>
          <Search size={20} />
          <Label className={styles.label} htmlFor="knowledge-query">
            {kt(lang, "Wissen durchsuchen")}
          </Label>
          <Input
            id="knowledge-query"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kt(lang, "Suche nach Lachs, Masago, Maki, Reis …")}
          />
          {query && (
            <Button
              onClick={() => setQuery("")}
              aria-label={kt(lang, "Suche leeren")}
            >
              ×
            </Button>
          )}
        </div>
        <div className={styles.div5} aria-label={kt(lang, "Kategorie")}>
          {["all", ...Object.keys(categoryLabels)].map((c) => (
            <Button
              key={c}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c === "all"
                ? kt(lang, "Alles")
                : categoryLabels[c as KnowledgeCategory][lang]}
              <Text as="span">
                {c === "all"
                  ? articles.length
                  : articles.filter((a) => a.category === c).length}
              </Text>
            </Button>
          ))}
        </div>
        <output className={styles.output}>
          {found.length} {kt(lang, "Artikel gefunden")}
        </output>
        <div className={styles.div6}>
          {found.map((a) => (
            <ArticleCard key={a.id} article={a} lang={lang} />
          ))}
        </div>
        {!found.length && (
          <div className={styles.div7}>
            <Heading as="h2">{kt(lang, "Noch kein Treffer.")}</Heading>
            <Text>
              {kt(
                lang,
                "Versuche einen kürzeren Begriff oder eine andere Kategorie.",
              )}
            </Text>
            <Button
              className={styles.button}
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
            >
              {kt(lang, "Alle Artikel anzeigen")}
            </Button>
          </div>
        )}
      </section>
      <section className={styles.section4}>
        <div>
          <Text className={styles.text6}>{kt(lang, "WISSEN MIT QUELLEN")}</Text>
          <Heading as="h2">{kt(lang, "Die Quellen der Sammlung.")}</Heading>
          <Text>
            {kt(
              lang,
              "Wir verbinden Informationen japanischer Behörden, Kulturinstitutionen und Lebensmittelhersteller mit Hinweisen des Centre for Food Safety in Hongkong. Jede Wissensseite nennt ihre Quellen. Die Sammlung deckt wichtige Formen und die Begriffe unserer Karte ab und ist keine vollständige Liste aller regionalen Sushi-Rezepte.",
            )}
          </Text>
        </div>
        <div>
          <Heading as="h3">
            {kt(lang, "Restaurantkarte ≠ allgemeines Rezept")}
          </Heading>
          <Text>
            {kt(
              lang,
              "Produktseiten zeigen den übermittelten Menütext. Nicht belegte Garstufen, Herkunftsangaben und Rezeptdetails werden nicht ergänzt. Die Originalkarten bleiben zugänglich.",
            )}
          </Text>
          <Link className={styles.a3} href="/data/sushi-knowledge.json" download>
            {kt(lang, "Wissensdaten mit Quellen herunterladen")}
          </Link>
        </div>
      </section>
    </Shell>
  );
}
