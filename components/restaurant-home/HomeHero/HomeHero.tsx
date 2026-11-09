"use client";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Clock3, Truck } from "lucide-react";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { ct } from "@/lib/commerce-copy";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./HomeHero.styles";

const heroPhoto = "/products/california-salmon-angle2";

/** Opening screen: oversized title, the two ways in (menu, tracking) and the
 *  three facts a guest needs before ordering, beside one studio photograph. */
export function HomeHero() {
  const { lang } = useShop();
  return (
    <section className={styles.section} aria-labelledby="home-title">
      <div className={styles.copy}>
        <Text as="span" className={styles.text}>
          Sushi HH · Hamburg
        </Text>
        <Heading as="h1" id="home-title">
          {t(lang, "homeTitle")}
        </Heading>
        <Text className={styles.text2}>{t(lang, "serviceNotice")}</Text>
        <Text className={styles.intro}>{t(lang, "homeIntro")}</Text>
        <div className={styles.actions}>
          <Link className={styles.a} href="/menu">
            {t(lang, "viewMenu")}
          </Link>
          <Link className={styles.secondary} href="/order">
            {t(lang, "track")}
          </Link>
        </div>
        <ul className={styles.facts}>
          <li>
            <CalendarDays size={18} aria-hidden="true" />
            {t(lang, "hours")}
          </li>
          <li>
            <Clock3 size={18} aria-hidden="true" />
            {t(lang, "cutoff")}
          </li>
          <li>
            <Truck size={18} aria-hidden="true" />
            {ct(lang, "hamburgOnly")}
          </li>
        </ul>
      </div>
      <figure className={styles.figure}>
        <picture>
          <source
            type="image/webp"
            srcSet={`${heroPhoto}-800.webp 800w, ${heroPhoto}-1600.webp 1600w, ${heroPhoto}-2400.webp 2400w`}
            sizes="(max-width: 900px) 100vw, 46vw"
          />
          <Image
            unoptimized
            priority
            src={`${heroPhoto}-1600.jpg`}
            sizes="(max-width: 900px) 100vw, 46vw"
            width={1600}
            height={1200}
            alt="Sushi HH · California · Lachs"
            decoding="async"
          />
        </picture>
        <figcaption className={styles.caption}>
          <Text as="span">{t(lang, "signature")}</Text>
          <Text as="b">California · Lachs</Text>
        </figcaption>
      </figure>
    </section>
  );
}
