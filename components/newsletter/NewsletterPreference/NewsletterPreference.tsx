"use client";

import type * as ShopTypes from "@/lib/shop-types";
import { useEffect, useState } from "react";
import { useShop } from "../../shop-context";
import { api, send } from "@/lib/shop-api";
import { ot } from "@/lib/operations-copy";
import { t, errorText } from "@/lib/shop-copy";
import { Heading } from "@/components/primitives/Heading";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Button } from "@/components/primitives/Button";
import { styles } from "./NewsletterPreference.styles";

export function NewsletterPreference() {
  const { lang } = useShop(),
    [state, setState] = useState("unsubscribed"),
    [enabled, setEnabled] = useState(false),
    [frequency, setFrequency] = useState("weekly"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api<ShopTypes.NewsletterPreference>("/me/newsletter")
      .then((s) => {
        setState(s.state);
        setEnabled(s.state !== "unsubscribed");
        setFrequency(s.frequency);
      })
      .catch((e) => setError(errorText(lang, e.message)));
  }, [lang]);
  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const s = await send<ShopTypes.NewsletterPreference>("/me/newsletter", {
            enabled,
            frequency,
            language: lang,
          });
          setState(s.state);
        } catch (e) {
          setError(errorText(lang, (e as Error).message));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Heading as="h2">{ot(lang, "newsletter")}</Heading>
      <FieldMessage >
        {ot(lang, state as "active" | "pending" | "unsubscribed")}
      </FieldMessage>
      <Label className={styles.label}>
        <Input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        {ot(lang, "consent")}
      </Label>
      <Label>
        {ot(lang, "frequency")}
        <Select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
        >
          {(["daily", "weekly", "monthly"] as const).map((f) => (
            <option value={f} key={f}>
              {ot(lang, f)}
            </option>
          ))}
        </Select>
      </Label>
      {error && (
        <FieldMessage tone="error" role="alert" className={styles.fieldMessage}>
          {error}
        </FieldMessage>
      )}
      <Button disabled={busy} aria-busy={busy} className={styles.button}>
        {t(lang, "save")}
      </Button>
    </form>
  );
}
