"use client";
import { ot } from "@/lib/operations-copy";
import { ShopShell } from "../../shop-shell";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./InfoPage.styles";
import type { InfoPageProps } from "../info-pages.types";
import { privacy, legal } from "../info-pages.shared";

export function InfoPage({ kind }: InfoPageProps) {
  const { lang } = useShop();
  return (
    <ShopShell>
      <article className={styles.article}>
        <Heading as="h1">{t(lang, kind)}</Heading>
        {kind === "privacy" ? (
          [
            ...privacy[lang].filter((_, i) => i !== 2),
            ot(lang, "privacyPayments"),
            ot(lang, "privacyNews"),
          ].map((p, i) => <Text key={i}>{p}</Text>)
        ) : (
          <Text>{legal[lang]}</Text>
        )}
        <a
          className={styles.a}
          href={TELEGRAM}
          target="_blank"
          rel="noreferrer"
        >
          {t(lang, "contact")}
        </a>
      </article>
    </ShopShell>
  );
}
