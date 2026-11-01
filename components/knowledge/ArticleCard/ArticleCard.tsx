"use client";
import Link from "next/link";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./ArticleCard.styles";
import type { ArticleCardProps } from "../knowledge.types";
import { categoryLabels } from "@/lib/knowledge";
import { kt } from "../knowledge.shared";

export function ArticleCard({ article: a, lang }: ArticleCardProps) {
  return (
    <Link className={styles.a} href={`/wissen/${a.id}`}>
      <Text as="span" className={styles.text}>
        {categoryLabels[a.category][lang]}
      </Text>
      <Heading as="h3">{a.title[lang]}</Heading>
      <Text>{a.body[lang][0]}</Text>
      <Text as="span" className={styles.text2}>
        {a.steps[lang].length
          ? `${a.steps[lang].length} ${kt(lang, "Schritte")}`
          : kt(lang, "Mehr erfahren")}{" "}
      </Text>
    </Link>
  );
}
