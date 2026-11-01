"use client";
import Link from "next/link";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./HomeHero.styles";

export function HomeHero() {
  const { lang } = useShop();
  return (
    <section className={styles.section} aria-labelledby="home-title">
      <Text as="span" className={styles.text}>
        SUSHI HH / HAMBURG
      </Text>
      <Heading as="h1" id="home-title">
        {t(lang, "homeTitle")}
      </Heading>
      <Text className={styles.text2}>{t(lang, "serviceNotice")}</Text>
      <div className={styles.div}>
        <Text>{t(lang, "homeIntro")}</Text>
        <Link className={styles.a} href="/menu">
          {t(lang, "viewMenu")}
        </Link>
      </div>
    </section>
  );
}
