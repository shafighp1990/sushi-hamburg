"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { money } from "@/lib/catalog";
import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./Basket.styles";
import type { BasketProps } from "../shop-shell.types";
import { Quantity } from "../Quantity";

export function Basket({ checkout = true }: BasketProps) {
  const { lang, products, cart, subtotal, count, change } = useShop();
  const lines = products.filter((p) => cart[p.id]);
  const missing = Object.keys(cart).filter(
    (id) => !products.some((p) => p.id === id),
  );
  return (
    <section className={styles.section}>
      <header>
        <Text as="span">HH / {String(count).padStart(2, "0")}</Text>
        <ShoppingBag size={21} />
      </header>
      <Heading as="h2">{t(lang, "cart")}</Heading>
      {!count ? (
        <div className={styles.div16}>
          <Text as="span">＋</Text>
          <Heading as="h3">{t(lang, "empty")}</Heading>
          <Text>{t(lang, "emptySub")}</Text>
        </div>
      ) : (
        <>
          <div className={styles.div17}>
            {lines.map((p) => (
              <div key={p.id} className={styles.div18}>
                <div>
                  <Link href={`/product?id=${p.id}`}>{p.name[lang]}</Link>
                  <Text as="b">{money(p.price * (cart[p.id] || 0))}</Text>
                </div>
                <Quantity p={p} />
              </div>
            ))}
            {missing.map((id) => (
              <div key={id} className={styles.div19}>
                {id} · {t(lang, "unavailable")}
                <Button onClick={() => change(id, -50)}>
                  {t(lang, "remove")}
                </Button>
              </div>
            ))}
          </div>
          <div className={styles.div20}>
            <Text as="span">{t(lang, "subtotal")}</Text>
            <Text as="strong">{money(subtotal)}</Text>
          </div>
          <Text className={styles.text5}>{t(lang, "catalogNote")}</Text>
          {checkout && (
            <Link className={styles.a4} href="/checkout">
              {t(lang, "checkout")}
            </Link>
          )}
        </>
      )}
      <div className={styles.div21}>
        <Text as="span">SUSHI HH</Text>
        <Text as="small">HAMBURG</Text>
      </div>
    </section>
  );
}
