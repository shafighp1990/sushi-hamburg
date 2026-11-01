"use client";
import Link from "next/link";
import { OfferSection } from "../offer-section";
import { ct } from "@/lib/commerce-copy";

import { ShopShell, Basket } from "../shop-shell";

import { t } from "@/lib/shop-copy";
import { money, TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";

import { styles } from "./StorefrontView.styles";
import type { StorefrontViewProps } from "./StorefrontView.types";
import { ProductCatalog } from "./sections/ProductCatalog";

export function StorefrontView({
  lang,
  cart,
  change,
  count,
  subtotal,
  category,
  setCategory,
  query,
  setQuery,
  sort,
  setSort,
  found,
}: StorefrontViewProps) {
  return (
    <ShopShell wide>
      <section className={styles.section}>
        <div>
          <Text as="span" className={styles.text}>
            01 / SUSHI HH
          </Text>
          <Heading as="h1">{t(lang, "menuTitle")}</Heading>
        </div>
        <Text>
          {t(lang, "catalogNote")}
          <br />
          <a href="#delivery">{t(lang, "hours")}</a>
        </Text>
      </section>
      <OfferSection />
      <div className={styles.div}>
        <ProductCatalog
          lang={lang}
          cart={cart}
          change={change}
          category={category}
          setCategory={setCategory}
          query={query}
          setQuery={setQuery}
          sort={sort}
          setSort={setSort}
          found={found}
        />
        <aside className={styles.aside}>
          <Basket />
        </aside>
      </div>
      <section id="delivery" className={styles.section3}>
        <div>
          <Text as="span" className={styles.text5}>
            02 / HAMBURG
          </Text>
          <Heading as="h2">{t(lang, "delivery")}</Heading>
          <Text>
            {t(lang, "hours")}
            <br />
            {t(lang, "cutoff")}
          </Text>
          <a href={TELEGRAM} target="_blank" rel="noreferrer">
            {t(lang, "contact")}
          </a>
        </div>
        <div className={styles.div9}>
          <Heading as="h3">{ct(lang, "hamburgOnly")}</Heading>
          <Text>{ct(lang, "deliveryQuoteMode")}</Text>
        </div>
      </section>
      {count > 0 && (
        <Link className={styles.a2} href="/checkout">
          <Text as="span">
            {count} · {t(lang, "checkout")}
          </Text>
          <Text as="strong">{money(subtotal)}</Text>
        </Link>
      )}
    </ShopShell>
  );
}
