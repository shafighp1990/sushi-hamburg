"use client";
import Link from "next/link";
import Image from "next/image";
import { HoursSummary } from "../../delivery-notice";
import { Clock3, Truck } from "lucide-react";
import { ProductCard } from "../../storefront/ProductCard";
import { ShopShell } from "../../shop-shell";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { ct } from "@/lib/commerce-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./RestaurantHome.styles";
import { HomeHero } from "../HomeHero";

// Signature rolls that already have studio photographs.
const featuredIds = ["philadelphia", "california-salmon", "green-dragon", "philadelphia-unagi"];

export function RestaurantHome() {
  const { lang, products, cart, change } = useShop();
  const featured = featuredIds
    .map((id) => products.find((p) => p.id === id && p.active !== false))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return (
    <ShopShell>
      <HomeHero />
      {featured.length > 0 && (
        <section className={styles.featured} aria-labelledby="home-featured-title">
          <div className={styles.featuredHead}>
            <div>
              <Text as="span" className={styles.text3}>
                {t(lang, "menu")}
              </Text>
              <Heading as="h2" id="home-featured-title">
                {t(lang, "signature")}
              </Heading>
            </div>
            <Link className={styles.a3} href="/menu">
              {t(lang, "viewMenu")}
            </Link>
          </div>
          <div className={styles.featuredGrid}>
            {featured.map((p, index) => (
              <ProductCard
                key={p.id}
                p={p}
                index={index}
                lang={lang}
                quantity={cart[p.id] || 0}
                onAdd={() => change(p.id, 1)}
              />
            ))}
          </div>
        </section>
      )}
      <section
        className={styles.section2}
        id="delivery"
        aria-labelledby="home-delivery-title"
      >
        <figure className={styles.figure}>
          <picture>
            <source
              type="image/webp"
              srcSet="/products/philadelphia-800.webp 800w, /products/philadelphia-1600.webp 1600w, /products/philadelphia-2400.webp 2400w"
              sizes="(max-width: 760px) 100vw, 600px"
            />
            <Image unoptimized
              src="/products/philadelphia-1600.jpg"
              sizes="(max-width: 760px) 100vw, 600px"
              width={1600}
              height={1067}
              alt="Sushi HH · Philadelphia"
              decoding="async"
            />
          </picture>
          <figcaption>SUSHI HH · PHILADELPHIA</figcaption>
        </figure>
        <div className={styles.div2}>
          <Text as="span" className={styles.text3}>
            {t(lang, "delivery")}
          </Text>
          <Heading as="h2" id="home-delivery-title">
            {t(lang, "homeDelivery")}
          </Heading>
          <Text>{t(lang, "homeOrderInfo")}</Text>
          <dl className={styles.dl}>
            <div>
              <dt>
                <Clock3 size={18} />
                {t(lang, "hours")}
              </dt>
              <dd>
                {t(lang, "cutoff")}
                <HoursSummary />
              </dd>
            </div>
            <div>
              <dt>
                <Truck size={18} />
                {ct(lang, "hamburgOnly")}
              </dt>
              <dd>{ct(lang, "deliveryQuoteMode")}</dd>
            </div>
          </dl>
          <a
            className={styles.a2}
            href={TELEGRAM}
            target="_blank"
            rel="noreferrer"
          >
            {t(lang, "contact")}
          </a>
        </div>
      </section>
      <section className={styles.section3} aria-labelledby="home-journal-title">
        <div>
          <Text as="span" className={styles.text4}>
            SUSHI JOURNAL
          </Text>
          <Heading as="h2" id="home-journal-title">
            {t(lang, "homeJournal")}
          </Heading>
          <Text>{t(lang, "homeJournalIntro")}</Text>
        </div>
        <Link className={styles.a3} href="/wissen">
          {t(lang, "knowledge")}
        </Link>
      </section>
    </ShopShell>
  );
}
