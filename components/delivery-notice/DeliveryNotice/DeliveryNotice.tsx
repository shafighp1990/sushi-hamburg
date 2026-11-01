"use client";
import { useBrowserMinute } from "@/components/use-browser-state";
import { useShop } from "../../shop-context";
import { acceptingNow, deliveryOptions, localDate } from "@/lib/operations";
import { ot } from "@/lib/operations-copy";
import { Text } from "@/components/primitives/Text";
import { styles } from "./DeliveryNotice.styles";
import type { DeliveryNoticeProps } from "../delivery-notice.types";

export function DeliveryNotice({ date, time }: DeliveryNoticeProps) {
  const { lang, settings } = useShop(),
    now = useBrowserMinute();
  if (!now) return null;
  const first = deliveryOptions(settings.schedule, now)[0];
  return (
    <aside className={styles.aside} aria-live="polite">
      <Text>{ot(lang, "lead")}</Text>
      {!acceptingNow(settings.schedule, now) && (
        <Text>
          <Text as="strong">{ot(lang, "preorder")}</Text>
        </Text>
      )}
      {first && (
        <Text>
          {ot(lang, "firstDelivery")}: {localDate(first.date, lang)} ·{" "}
          {first.from}
        </Text>
      )}
      {date && time && (
        <Text>
          <Text as="strong">
            {ot(lang, "selectedDelivery")}: {localDate(date, lang)} · {time}
          </Text>
        </Text>
      )}
    </aside>
  );
}
