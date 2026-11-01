"use client";
import Link from "next/link";
import { Text } from "@/components/primitives/Text";
import { styles } from "./MiniProduct.styles";
import type { MiniProductProps } from "../knowledge.types";
import { money } from "@/lib/catalog";
import { ProductPhoto } from "../../product-photo";

export function MiniProduct({ product: p, lang }: MiniProductProps) {
  return (
    <Link className={styles.a7} href={`/product?id=${p.id}`}>
      <ProductPhoto product={p} lang={lang} />
      <div>
        <Text as="b">{p.name[lang]}</Text>
        <Text as="span">{money(p.price)} </Text>
      </div>
    </Link>
  );
}
