"use client";

import Link from "next/link";
import { OrderMessages } from "@/components/order-messages";
import { orderCopy } from "@/components/order-messages/OrderMessages.copy";
import { formatArrival } from "@/components/order-messages/OrderEta.utils";
import { ot } from "@/lib/operations-copy";

import { ct } from "@/lib/commerce-copy";
import { TaxBreakdown } from "../tax-breakdown";
import { Check, Copy } from "lucide-react";
import { ShopShell } from "../shop-shell";

import { t, statusKey, errorText } from "@/lib/shop-copy";
import { money, TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { styles } from "./OrderTrackingView.styles";
import type { OrderTrackingViewProps } from "./OrderTrackingView.types";
import { OrderPaymentActions } from "./sections/OrderPaymentActions";

export function OrderTrackingView({
  lang,
  order,
  events,
  saved,
  id,
  token,
  error,
  setError,
  busy,
  copied,
  load,
  payment,
  copy,
}: OrderTrackingViewProps) {
  return (
    <ShopShell>
      <div className={styles.div}>
        <div>
          <Text as="span" className={styles.text}>
            ORDER / HH
          </Text>
          <Heading as="h1">{t(lang, "track")}</Heading>
        </div>
        {id && (
          <Button className={styles.button} onClick={load}>
            {t(lang, "refresh")}
          </Button>
        )}
      </div>
      {error && (
        <FieldMessage tone="error" className={styles.fieldMessage} role="alert">
          {error}
        </FieldMessage>
      )}
      {!id ? (
        <div>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              location.href =
                "/order?id=" +
                encodeURIComponent(
                  new FormData(e.currentTarget).get("id") as string,
                );
            }}
          >
            <Label>
              {t(lang, "orderNumber")}
              <Input name="id" required />
            </Label>
            <Button className={styles.button2}>{t(lang, "track")}</Button>
          </form>
          <Text className={styles.text2}>{t(lang, "privateNote")}</Text>
          {saved.map((s) => (
            <Link
              className={styles.a}
              href={`/order?id=${s.id}${s.token ? "#token=" + s.token : ""}`}
              key={s.id}
            >
              #{s.id.slice(0, 8).toUpperCase()}
            </Link>
          ))}
          <Link href="/account">{t(lang, "account")}</Link>
        </div>
      ) : !order ? (
        <Text>{!error && t(lang, "loading")}</Text>
      ) : (
        <>
          <div className={styles.div2}>
            <div className={styles.div3}>
              <Text as="span" className={styles.text3}>
                {t(lang, statusKey(order.status))}
              </Text>
              <Text as="b">#{order.id.slice(0, 8).toUpperCase()}</Text>
            </div>
            <Heading as="h2">
              {order.total === null
                ? t(lang, "requestSent")
                : t(lang, "orderReceived")}
            </Heading>
            <Text>
              {order.customer.name} · {order.date} / {order.time}
            </Text>
            {!["cancelled", "delivered"].includes(order.status) && <FieldMessage>
              {order.estimatedArrivalAt ? `${orderCopy(lang).eta}: ${formatArrival(order.estimatedArrivalAt, lang)}` : orderCopy(lang).etaPending}
            </FieldMessage>}
            <div className={styles.div4}>
              {[
                "new",
                "confirmed",
                "preparing",
                "out_for_delivery",
                "delivered",
              ].map((s, i) => {
                const active =
                  [
                    "new",
                    "confirmed",
                    "preparing",
                    "out_for_delivery",
                    "delivered",
                  ].indexOf(order.status) >= i;
                return (
                  <div key={s} className={active ? "complete" : ""}>
                    <Text as="span">
                      {active ? (
                        <Check size={15} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </Text>
                    <Text as="small">{t(lang, statusKey(s))}</Text>
                  </div>
                );
              })}
            </div>
            {order.status === "cancelled" && (
              <Text className={styles.text4}>{t(lang, "cancelled")}</Text>
            )}
            <div className={styles.div5}>
              {order.items.map((i) => (
                <div key={i.id}>
                  <Text as="span">
                    {i.quantity} × {i.name[lang]}
                  </Text>
                  <Text as="b">{money(i.price * i.quantity)}</Text>
                </div>
              ))}
              {order.discount > 0 && (
                <div>
                  <Text as="span">
                    {ct(lang, "discount")} · {order.couponCode}
                  </Text>
                  <Text as="b">−{money(order.discount)}</Text>
                </div>
              )}
              <div>
                <Text as="span">{t(lang, "fee")}</Text>
                <Text as="b">
                  {order.delivery === null
                    ? t(lang, "pending")
                    : money(order.delivery)}
                </Text>
              </div>
              <div className={styles.div6}>
                <Text as="strong">
                  {order.paid ? t(lang, "paid") : t(lang, "total")}
                </Text>
                <Text as="strong">
                  {order.total === null
                    ? t(lang, "pending")
                    : money(order.total)}
                </Text>
              </div>
            </div>
            <TaxBreakdown tax={order.tax} />
            <div className={styles.div7}>
              {(["invoice", "summary", "receipt"] as const).map((kind) => (
                <Button
                  key={kind}
                  className={styles.button3}
                  disabled={kind === "receipt" && !order.paid}
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        `/api/orders/${id}/documents/${kind}`,
                        { headers: token ? { "X-Order-Token": token } : {} },
                      );
                      if (!r.ok) throw new Error("SERVER_ERROR");
                      const url = URL.createObjectURL(await r.blob()),
                        a = document.createElement("a");
                      a.href = url;
                      a.download = `Sushi-HH-${kind}-${id.slice(0, 8)}.pdf`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    } catch (e) {
                      setError(errorText(lang, (e as Error).message));
                    }
                  }}
                >
                  {ot(lang, kind)}
                </Button>
              ))}
            </div>
            {!order.paid && (
              <Text className={styles.text5}>{ot(lang, "receiptNote")}</Text>
            )}
            <Button className={styles.button4} onClick={() => window.print()}>
              {ct(lang, "receipt")}
            </Button>
            {order.total === null && (
              <Text className={styles.text6}>{t(lang, "deliveryQuote")}</Text>
            )}
            {!order.paid &&
              order.payment !== "cash_on_delivery" &&
              order.total !== null &&
              order.status !== "cancelled" && (
                <OrderPaymentActions
                  lang={lang}
                  order={order}
                  token={token}
                  busy={busy}
                  load={load}
                  payment={payment}
                />
              )}
            <div className={styles.div9}>
              <Heading as="h3">{t(lang, "delivery")}</Heading>
              <Text>
                {order.customer.address}
                <br />
                {order.customer.postcode} {order.customer.city}
                <br />
                {order.customer.phone}
                <br />
                {order.customer.email}
              </Text>
              <Text>
                {t(lang, "utensils")}: {order.customer.utensils}
              </Text>
              {order.customer.notes && <Text>{order.customer.notes}</Text>}
            </div>
            {token && (
              <>
                <Button className={styles.button7} onClick={copy}>
                  <Copy size={16} />
                  {copied ? t(lang, "copied") : t(lang, "privateLink")}
                </Button>
                <Text className={styles.text7}>{t(lang, "privateNote")}</Text>
              </>
            )}
            <a href={TELEGRAM} target="_blank" rel="noreferrer">
              {t(lang, "contact")}
            </a>
          </div>
          <OrderMessages orderId={order.id} lang={lang} token={token} />
          <section className={styles.section}>
            <Heading as="h2">{t(lang, "updated")}</Heading>
            {events.map((e, i) => (
              <div key={i}>
                <time>
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: "short",
                    timeStyle: "short",
                    timeZone: "Europe/Berlin",
                  }).format(new Date(e.created_at))}
                </time>
                <Text as="span">{t(lang, statusKey(e.status))}</Text>
                {e.note && <Text>{e.note}</Text>}
              </div>
            ))}
          </section>
        </>
      )}
    </ShopShell>
  );
}
