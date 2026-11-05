"use client";
import { orderCopy } from "@/components/order-messages/OrderMessages.copy";
import { formatArrival } from "@/components/order-messages/OrderEta.utils";
import { useShop } from "../../shop-context";
import { t, statusKey } from "@/lib/shop-copy";
import { money } from "@/lib/catalog";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { styles } from "./OrderCard.styles";
import type { OrderCardProps } from "../admin.types";

export function OrderCard({ order: o, onClick }: OrderCardProps) {
  const { lang } = useShop();
  return (
    <Button className={styles.button16} onClick={onClick}>
      <div>
        <Text as="b">#{o.id.slice(0, 8).toUpperCase()}</Text>
        <Text as="span" className={`status-badge status-${o.status}`}>
          {t(lang, statusKey(o.status))}
        </Text>
      </div>
      <Heading as="h3">{o.customer.name}</Heading>
      <Text>
        {o.date} · {o.time}
      </Text>
      {o.status === "new" && !o.userId && o.payment === "cash_on_delivery" && <Text>{t(lang, "phoneConfirmationRequired")}</Text>}
      {o.estimatedArrivalAt && !["delivered", "cancelled"].includes(o.status) && <Text>{orderCopy(lang).eta}: {formatArrival(o.estimatedArrivalAt, lang)}</Text>}
      <Text>
        {o.items.map((i) => `${i.quantity} × ${i.name[lang]}`).join(" · ")}
      </Text>
      <div>
        <Text as="span">
          {o.paid
            ? t(lang, "paid")
            : o.payment === "cash_on_delivery"
              ? t(lang, "payment")
              : o.payment}
        </Text>
        <Text as="strong">
          {o.total === null ? t(lang, "pending") : money(o.total)}
        </Text>
      </div>
    </Button>
  );
}
