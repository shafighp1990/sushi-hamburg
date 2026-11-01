"use client";
import Link from "next/link";
import { styles } from "./TopicLinks.styles";
import type { TopicLinksProps } from "../knowledge.types";

export function TopicLinks({ items, lang }: TopicLinksProps) {
  return (
    <div className={styles.div2}>
      {items.map((a) => (
        <Link href={`/wissen/${a.id}`} key={a.id}>
          {a.title[lang]}
        </Link>
      ))}
    </div>
  );
}
