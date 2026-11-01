"use client";
import Link from "next/link";
import { HoursSummary } from "../../delivery-notice";
import { ct } from "@/lib/commerce-copy";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./ShopFooter.styles";

export function ShopFooter() {
  const { lang, user, settings } = useShop();
  const locale = lang === "uk" ? "uk-UA" : lang === "fa" ? "fa-IR" : lang;
  const hours = [1, 2, 3, 4, 5, 6, 0].filter(
    (i) => settings.schedule.weekly[i].open,
  );
  return (
    <footer className={styles.footer}>
      <div className={styles.div7}>
        <Text as="span" className={styles.text3}>
          SUSHI HH · HAMBURG
        </Text>
        <Heading as="h2">{t(lang, "delivery")}</Heading>
        <Text>{t(lang, "serviceNotice")}</Text>
        <div className={styles.div8}>
          {hours.map((i) => (
            <div key={i}>
              <Text as="span">
                {new Intl.DateTimeFormat(locale, {
                  weekday: "long",
                  timeZone: "Europe/Berlin",
                }).format(new Date(Date.UTC(2026, 9, 11 + i, 12)))}
              </Text>
              <Text as="b" dir="ltr">
                {settings.schedule.weekly[i].deliveryStart} –{" "}
                {settings.schedule.weekly[i].deliveryEnd}
              </Text>
            </div>
          ))}
        </div>
        <div className={styles.div9}>
          <HoursSummary />
          <Text as="small">Europe/Berlin</Text>
        </div>
        <Text>
          {ct(lang, "hamburgOnly")}
          <br />
          {ct(lang, "deliveryQuoteMode")}
        </Text>
      </div>
      <div className={styles.div10}>
        <Text as="span" className={styles.text4}>
          SUSHI HH
        </Text>
        <Heading as="h2">{t(lang, "contact")}</Heading>
        <a
          className={styles.a2}
          href={TELEGRAM}
          target="_blank"
          rel="noreferrer"
        >
          @sushi_hamburg_chat
        </a>
        <div className={styles.div11}>
          <div className={styles.div12}>
            <Link href="/menu">{t(lang, "menu")}</Link>
            <Link href="/account">{t(lang, "account")}</Link>
            <Link href="/order">{t(lang, "track")}</Link>
            <Link href="/wissen">{t(lang, "knowledge")}</Link>
            <Link href="/gallery">{t(lang, "gallery")}</Link>
          </div>
          <div className={styles.div13}>
            <Heading as="h3">{t(lang, "originalMenus")}</Heading>
            {["signature", "classics", "new", "sets"].map((p) => (
              <Link
                key={p}
                href={`/menus/${p}.jpg`}
                target="_blank"
                rel="noreferrer"
              >
                {t(lang, p as "signature")}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.div14}>
        <Text as="span">© {new Date().getFullYear()} SUSHI HH</Text>
        <div>
          <Link href="/privacy">{t(lang, "privacy")}</Link>
          <Link href="/legal">{t(lang, "legal")}</Link>
          {user?.admin && <Link href="/admin">{t(lang, "admin")}</Link>}
        </div>
        <Text as="span">{t(lang, "catalogNote")}</Text>
      </div>
    </footer>
  );
}
