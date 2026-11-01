"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ProductPhoto } from "@/components/product-photo";
import { Quantity } from "@/components/shop-shell";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { money } from "@/lib/catalog";
import { t } from "@/lib/shop-copy";
import { styles } from "./ProductCard.styles";
import type { ProductCardProps } from "./ProductCard.types";
export function ProductCard({
  p,
  index,
  lang,
  quantity,
  onAdd,
}: ProductCardProps) {
  return (
    <article className={styles.article}>
      <Link className={styles.a} href={`/product?id=${p.id}`}>
        <ProductPhoto product={p} lang={lang} />
        <Text as="span" className={styles.text2}>
          {String(index + 1).padStart(2, "0")}
        </Text>
        {p.weight && (
          <Text as="span" className={styles.text3}>
            {p.weight} g
          </Text>
        )}
      </Link>
      <div className={styles.div6}>
        <Heading as="h3">
          <Link href={`/product?id=${p.id}`}>{p.name[lang]}</Link>
        </Heading>
        <Text as="strong">{money(p.price)}</Text>
      </div>
      <Text>{p.description[lang]}</Text>
      <div className={styles.div7}>
        <Link href={`/product?id=${p.id}`}>{t(lang, "details")}</Link>
        {quantity ? (
          <Quantity p={p} />
        ) : (
          <Button className={styles.button} onClick={onAdd}>
            <Plus size={17} />
            {t(lang, "add")}
          </Button>
        )}
      </div>
    </article>
  );
}
