"use client";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./SourceList.styles";
import type { SourceListProps } from "../knowledge.types";
import { sources } from "@/lib/knowledge";
import { kt } from "../knowledge.shared";

export function SourceList({ ids, lang }: SourceListProps) {
  return (
    <section className={styles.section}>
      <Heading as="h2">{kt(lang, "Quellen & Einordnung")}</Heading>
      <Text>
        {kt(
          lang,
          "Eigenständige Zusammenfassungen auf Grundlage der verlinkten Quellen. Allgemeine Rezepte beschreiben keine bestätigte Rezeptur von Sushi Hamburg.",
        )}
      </Text>
      <ul>
        {ids.map((id) => {
          const s = sources.find((s) => s.id === id)!;
          return (
            <li key={id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>
              <Text as="span">{s.publisher}</Text>
            </li>
          );
        })}
      </ul>
      <Text className={styles.text3}>
        {kt(
          lang,
          "Geprüft am 07.09.2026. Produktangaben stammen aus den bereitgestellten Originalkarten; Rezeptur und Verfügbarkeit bitte beim Restaurant bestätigen.",
        )}
      </Text>
    </section>
  );
}
