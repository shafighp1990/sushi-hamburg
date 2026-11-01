"use client";
import { DeliveryNotice } from "../../../delivery-notice";
import { DeliverySlotChange } from "../../../delivery-slot-change";
import { providerNames } from "@/lib/operations";
import { CreditCard } from "lucide-react";
import { t } from "@/lib/shop-copy";
import { money } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Button } from "@/components/primitives/Button";
import { styles } from "./OrderPaymentActions.styles";
import type { OrderPaymentActionsProps } from "./OrderPaymentActions.types";

export function OrderPaymentActions({
  lang,
  order,
  token,
  busy,
  load,
  payment,
}: OrderPaymentActionsProps) {
  if (!order || order.total === null) return null;
  return (
    <div className={styles.div8}>
      <DeliveryNotice date={order.date} time={order.time} />
      <DeliverySlotChange order={order} token={token} onSaved={load} />
      <Text>{providerNames[order.payment] || order.payment}</Text>
      <Button
        className={styles.button5}
        disabled={busy}
        aria-busy={busy}
        onClick={() => payment("start")}
      >
        <CreditCard size={18} />
        {busy
          ? t(lang, "loading")
          : lang === "fa"
            ? "پرداخت امن"
            : lang === "uk"
              ? "Безпечна оплата"
              : lang === "de"
                ? "Sicher bezahlen"
                : "Pay securely"}{" "}
        · {money(order.total)}
      </Button>
      <Button
        className={styles.button6}
        disabled={busy}
        aria-busy={busy}
        onClick={() => payment("sync")}
      >
        {t(lang, "refresh")}
      </Button>
    </div>
  );
}
