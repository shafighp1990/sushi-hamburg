"use client";
import { useState } from "react";
import { useShop } from "../shop-context";
import { api } from "@/lib/shop-api";
import { deliveryOptions, validSlot, localDate } from "@/lib/operations";
import { ot } from "@/lib/operations-copy";
import { t, errorText } from "@/lib/shop-copy";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Select } from "@/components/primitives/Select";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Button } from "@/components/primitives/Button";
import { styles } from "./delivery-slot-change.styles";
import type { DeliverySlotChangeProps } from "./delivery-slot-change.types";

export function DeliverySlotChange({
  order,
  token,
  onSaved,
}: DeliverySlotChangeProps) {
  const { settings, lang } = useShop(),
    slots = deliveryOptions(settings.schedule),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (validSlot(settings.schedule, order.date, order.time)) return null;
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(`/orders/${order.id}/delivery`, {
            method: "PATCH",
            headers: token ? { "X-Order-Token": token } : {},
            body: JSON.stringify({ date, time }),
          });
          await onSaved();
        } catch (e) {
          setError(errorText(lang, (e as Error).message));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Text>{ot(lang, "slotExpired")}</Text>
      <Label>
        {t(lang, "date")}
        <Select
          required
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setTime("");
          }}
        >
          <option value="">—</option>
          {slots.map((d) => (
            <option value={d.date} key={d.date}>
              {localDate(d.date, lang)}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        {t(lang, "time")}
        <Select required value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="">—</option>
          {(slots.find((d) => d.date === date)?.times || []).map((t) => (
            <option value={t} key={t}>
              {t}
            </option>
          ))}
        </Select>
      </Label>
      {error && (
        <FieldMessage tone="error" className={styles.fieldMessage} role="alert">
          {error}
        </FieldMessage>
      )}
      <Button className={styles.button} disabled={busy} aria-busy={busy}>
        {t(lang, "save")}
      </Button>
    </form>
  );
}
