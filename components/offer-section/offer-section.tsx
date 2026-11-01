"use client";
import { useState } from "react";
import { useShop } from "../shop-context";
import { ct } from "@/lib/commerce-copy";
import { t } from "@/lib/shop-copy";
import { money } from "@/lib/catalog";
import { ProductPhoto } from "../product-photo";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { styles } from "./offer-section.styles";

export function OfferSection() {
  const { lang, settings, products } = useShop(),
    [copied, setCopied] = useState(false),
    o = settings.offer;
  if (!o.active) return null;
  return (
    <section className={styles.section}>
      <div>
        <Text as="span" className={styles.text}>
          {ct(lang, "offerBadge")}
        </Text>
        <Heading as="h2">{o.title[lang]}</Heading>
        <Text>{o.description[lang]}</Text>
        {o.couponCode && (
          <Button
            className={styles.button}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(o.couponCode);
                sessionStorage.setItem("sushi-coupon", o.couponCode);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {o.couponCode} · {copied ? t(lang, "copied") : ct(lang, "copyCode")}
          </Button>
        )}
      </div>
      <div className={styles.div}>
        {o.productIds
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean)
          .map((p) => (
            <a href={"/product?id=" + p!.id} key={p!.id}>
              <ProductPhoto product={p!} lang={lang} />
              <Text as="span">{p!.name[lang]}</Text>
              <Text as="b">{money(p!.price)}</Text>
            </a>
          ))}
      </div>
    </section>
  );
}
