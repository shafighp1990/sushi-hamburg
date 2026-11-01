"use client";
import Link from "next/link";
import Image from "next/image";
import { HoursSummary } from "../../delivery-notice";
import { Clock3, Truck } from "lucide-react";
import { ShopShell } from "../../shop-shell";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { ct } from "@/lib/commerce-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./RestaurantHome.styles";
import { HomeHero } from "../HomeHero";

export function RestaurantHome() {
  const { lang } = useShop();
  return (
    <ShopShell>
      <HomeHero />
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
                <HoursSummary />
              </dt>
              <dd>Europe/Berlin</dd>
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
