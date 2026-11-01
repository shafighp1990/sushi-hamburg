"use client";
import { useBrowserMinute } from "@/components/use-browser-state";
import { useShop } from "../../shop-context";
import { acceptingNow, deliveryOptions, localDate } from "@/lib/operations";
import { ot } from "@/lib/operations-copy";
import { Text } from "@/components/primitives/Text";
import { styles } from "./HoursSummary.styles";

export function HoursSummary() {
  const { lang, settings } = useShop(),
    now = useBrowserMinute();
  if (!now) return null;
  const first = deliveryOptions(settings.schedule, now)[0];
  return (
    <Text as="span" className={styles.text}>
      {ot(
        lang,
        !settings.shopOpen
          ? "paused"
          : acceptingNow(settings.schedule, now)
            ? "open"
            : "closed",
      )}
      {first && (
        <Text as="small">
          {ot(lang, "firstDelivery")}: {localDate(first.date, lang)} ·{" "}
          {first.from}
        </Text>
      )}
    </Text>
  );
}
