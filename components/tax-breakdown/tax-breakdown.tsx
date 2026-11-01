"use client";

import { ct } from "@/lib/commerce-copy";
import { money } from "@/lib/catalog";
import { useShop } from "../shop-context";
import { Text } from "@/components/primitives/Text";
import { styles } from "./tax-breakdown.styles";
import type { TaxBreakdownProps } from "./tax-breakdown.types";

export function TaxBreakdown({ tax }: TaxBreakdownProps) {
  const { lang } = useShop();
  if (!tax || tax.mode === "unset")
    return <Text className={styles.text}>{ct(lang, "taxPending")}</Text>;
  if (tax.mode === "no_vat")
    return <Text className={styles.text2}>{ct(lang, "noVatNotice")}</Text>;
  if (tax.mode === "small_business")
    return (
      <Text className={styles.text3}>{ct(lang, "smallBusinessNotice")}</Text>
    );
  return (
    <div className={styles.div}>
      {tax.groups.map((g) => (
        <div key={g.rate}>
          <Text as="span">
            {ct(lang, "vat")} {g.rate / 100}%
          </Text>
          <Text as="b">{money(g.vat)}</Text>
        </div>
      ))}
      {tax.net !== null && (
        <div>
          <Text as="span">{ct(lang, "net")}</Text>
          <Text as="b">{money(tax.net)}</Text>
        </div>
      )}
    </div>
  );
}
