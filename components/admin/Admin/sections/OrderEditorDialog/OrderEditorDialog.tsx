"use client";
import { useRef } from "react";
import { OrderMessages } from "@/components/order-messages";
import { orderCopy } from "@/components/order-messages/OrderMessages.copy";
import { arrivalInput, parseArrival } from "@/components/order-messages/OrderEta.utils";
import { providerNames } from "@/lib/operations";
import { mergeOrderVersions } from "@/lib/order-state";
import type { Order, OrderStatus } from "@/lib/shop-types";
import { send } from "@/lib/shop-api";
import { t, statusKey } from "@/lib/shop-copy";
import { money } from "@/lib/catalog";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { styles } from "./OrderEditorDialog.styles";
import { Modal } from "../../../Modal";
import type { OrderEditorDialogProps } from "./OrderEditorDialog.types";

export function OrderEditorDialog({
  lang,
  setIncoming,
  setOrders,
  error,
  busy,
  editingOrder,
  setEditingOrder,
  action,
}: OrderEditorDialogProps) {
  const copy = orderCopy(lang);
  const arrivalField = useRef<HTMLInputElement>(null);
  if (!editingOrder) return null;
  return (
    <Modal
      title={"#" + editingOrder.id.slice(0, 8).toUpperCase()}
      close={() => setEditingOrder(null)}
    >
      <form
        className={styles.form2}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action(async () => {
            const result = await send<{ order: Order }>(
              "/admin/orders/" + editingOrder.id,
              {
                status: editingOrder.status,
                delivery: editingOrder.delivery,
                paid: editingOrder.paid,
                version: editingOrder.version,
                estimatedArrivalAt: editingOrder.estimatedArrivalAt,
                note: f.get("note"),
              },
              "PATCH",
            );
            // Use the committed version before the dialog can be reopened.
            // The live feed may still contain a snapshot from before this save.
            setOrders((current) => mergeOrderVersions(current, [result.order]));
            setIncoming((current) =>
              current.map((o) => (o.id === result.order.id ? result.order : o)),
            );
            setEditingOrder(null);
          });
        }}
      >
        <Heading as="h3">{editingOrder.customer.name}</Heading>
        <Text>
          {editingOrder.customer.address}
          <br />
          {editingOrder.customer.postcode} {editingOrder.customer.city}
          <br />
          <a href={"tel:" + editingOrder.customer.phone}>
            {editingOrder.customer.phone}
          </a>
          <br />
          {editingOrder.customer.email}
        </Text>
        <Text>
          {editingOrder.date} · {editingOrder.time} · {t(lang, "zone")}{" "}
          {editingOrder.zone}
          <br />
          {t(lang, "utensils")}: {editingOrder.customer.utensils}
        </Text>
        {editingOrder.customer.notes && (
          <Text className={styles.text5}>{editingOrder.customer.notes}</Text>
        )}
        <div className={styles.div18}>
          {editingOrder.items.map((i) => (
            <div key={i.id}>
              <Text as="span">
                {i.quantity} × {i.name[lang]}
              </Text>
              <Text as="b">{money(i.price * i.quantity)}</Text>
            </div>
          ))}
        </div>
        <Label>
          {t(lang, "status")}
          <Select
            aria-label={t(lang, "status")}
            value={editingOrder.status}
            onChange={(e) =>
              setEditingOrder((o) => ({ ...o!, status: e.target.value as OrderStatus }))
            }
          >
            {[
              "new",
              "confirmed",
              "preparing",
              "out_for_delivery",
              "delivered",
              "cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {t(lang, statusKey(s))}
              </option>
            ))}
          </Select>
        </Label>
        <Label>
          {copy.eta} (Europe/Berlin)
          <Input ref={arrivalField} type="datetime-local" value={arrivalInput(editingOrder.estimatedArrivalAt)}
            onChange={(event) => {
              const value = event.target.value;
              const timestamp = value ? parseArrival(value) : null;
              event.currentTarget.setCustomValidity(value && timestamp === null ? copy.invalidEta : "");
              if (!value || timestamp !== null) setEditingOrder((order) => order ? { ...order, estimatedArrivalAt: timestamp } : order);
            }} />
        </Label>
        <Text className="order-eta-note">{copy.etaHelp}</Text>
        <div className="order-eta-controls">
          {[15, 30, 45, 60, 90].map((minutes) => <Button key={minutes} type="button" disabled={busy}
            onClick={() => {
              arrivalField.current?.setCustomValidity("");
              setEditingOrder((order) => order ? { ...order, estimatedArrivalAt: Date.now() + minutes * 60000 } : order);
            }}>
            {minutes} {copy.minutes}
          </Button>)}
          <Button type="button" disabled={busy || !editingOrder.estimatedArrivalAt} onClick={() => { arrivalField.current?.setCustomValidity(""); setEditingOrder((order) => order ? { ...order, estimatedArrivalAt: null } : order); }}>{copy.clearEta}</Button>
        </div>
        <Label>
          {t(lang, "fee")} (€)
          <Input
            type="number"
            min="0"
            max="300"
            step="0.01"
            value={
              editingOrder.delivery === null ? "" : editingOrder.delivery / 100
            }
            onChange={(e) =>
              setEditingOrder((o) => ({
                ...o!,
                delivery:
                  e.target.value === ""
                    ? null
                    : Math.round(Number(e.target.value) * 100),
              }))
            }
          />
        </Label>
        <Text>
          {editingOrder.payment === "cash_on_delivery"
            ? t(lang, "payment")
            : providerNames[editingOrder.payment] || editingOrder.payment}
        </Text>
        <Label className={styles.label4}>
          <Input
            type="checkbox"
            disabled={editingOrder.payment !== "cash_on_delivery"}
            checked={editingOrder.paid}
            onChange={(e) =>
              setEditingOrder((o) => ({ ...o!, paid: e.target.checked }))
            }
          />
          {t(lang, "paid")}
        </Label>
        <Label>
          {t(lang, "customerNote")}
          <Textarea name="note" rows={3} maxLength={500} />
        </Label>
        {error && (
          <FieldMessage
            tone="error"
            className={styles.fieldMessage6}
            role="alert"
          >
            {error}
          </FieldMessage>
        )}
        <Button className={styles.button9} disabled={busy} aria-busy={busy}>
          {t(lang, "save")}
        </Button>
      </form>
      <OrderMessages orderId={editingOrder.id} lang={lang} staff />
    </Modal>
  );
}
