"use client";
import Link from "next/link";
import { Send } from "lucide-react";
import { HoursSummary } from "../../delivery-notice";
import { ct } from "@/lib/commerce-copy";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./ShopFooter.styles";

/**
 * Footer: large wordmark with the live delivery board, then navigation and
 * the original menu cards, closed by a legal strip. Hours come from settings.
 */
export function ShopFooter() {
  const { lang, user, settings } = useShop();
  const locale = lang === "uk" ? "uk-UA" : lang === "fa" ? "fa-IR" : lang;
  const hours = [1, 2, 3, 4, 5, 6, 0].filter(
    (i) => settings.schedule.weekly[i].open,
  );
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.lead}>
          <Text as="span" className={styles.text3}>
            {t(lang, "delivery")} · Hamburg
          </Text>
          <Text as="p" className={styles.wordmark} aria-hidden="true">
            Sushi <em>HH</em>
          </Text>
          <Text className={styles.intro}>{t(lang, "serviceNotice")}</Text>
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
          <Text className={styles.note}>
            {ct(lang, "hamburgOnly")}
            <br />
            {ct(lang, "deliveryQuoteMode")}
          </Text>
        </div>
        <div className={styles.col}>
          <Heading as="h2">{t(lang, "menu")}</Heading>
          <div className={styles.div12}>
            <Link href="/menu">{t(lang, "menu")}</Link>
            <Link href="/wissen">{t(lang, "knowledge")}</Link>
            <Link href="/gallery">{t(lang, "gallery")}</Link>
            <Link href="/account">{t(lang, "account")}</Link>
            <Link href="/order">{t(lang, "track")}</Link>
          </div>
          <Heading as="h3">{t(lang, "originalMenus")}</Heading>
          <div className={styles.div13}>
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
        <div className={styles.col}>
          <Heading as="h2">{t(lang, "contact")}</Heading>
          <a
            className={styles.a2}
            href={TELEGRAM}
            target="_blank"
            rel="noreferrer"
          >
            <Send size={15} aria-hidden="true" />
            @sushi_hamburg_chat
          </a>
          <Text className={styles.note}>{t(lang, "catalogNote")}</Text>
        </div>
        <div className={styles.div14}>
          <Text as="span">© {new Date().getFullYear()} Sushi HH · Hamburg</Text>
          <div>
            <Link href="/privacy">{t(lang, "privacy")}</Link>
            <Link href="/legal">{t(lang, "legal")}</Link>
            {user?.admin && <Link href="/admin">{t(lang, "admin")}</Link>}
          </div>
        </div>
      </div>
    </footer>
  );
}
