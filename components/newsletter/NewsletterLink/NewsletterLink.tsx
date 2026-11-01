"use client";
import Link from "next/link";
import { useState } from "react";
import { useBrowserLocation } from "@/components/use-browser-state";
import { useShop } from "../../shop-context";
import { ShopShell } from "../../shop-shell";
import { send } from "@/lib/shop-api";
import { ot } from "@/lib/operations-copy";
import { t, errorText } from "@/lib/shop-copy";
import { Heading } from "@/components/primitives/Heading";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { styles } from "./NewsletterLink.styles";

export function NewsletterLink() {
  const { lang } = useShop(),
    [state, setState] = useState(""),
    [errorCode, setError] = useState("");
  const error = errorCode ? errorText(lang, errorCode) : "";
  const locationValue = useBrowserLocation();
  const params = locationValue ? new URLSearchParams(locationValue.split("#")[1] || "") : null;
  const action =
    params?.get("action") === "confirm" ? "confirm" : "unsubscribe";
  return (
    <ShopShell>
      <section className={styles.section}>
        <Heading as="h1">{ot(lang, "newsletter")}</Heading>
        <Text>{ot(lang, "consent")}</Text>
        {state ? (
          <FieldMessage >
            {ot(lang, state as "active" | "unsubscribed")}
          </FieldMessage>
        ) : (
          <Button
            className={styles.button2}
            disabled={!params}
            onClick={async () => {
              try {
                const s = await send<{ state: string }>(
                  "/newsletter/" +
                    (action === "confirm" ? "confirm" : "unsubscribe-link"),
                  { id: params?.get("id"), token: params?.get("token") },
                );
                setState(s.state);
              } catch (e) {
                setError(e instanceof Error ? e.message : "SERVER_ERROR");
              }
            }}
          >
            {ot(lang, action)}
          </Button>
        )}
        {error && (
          <FieldMessage
            tone="error"
            role="alert"
            className={styles.fieldMessage2}
          >
            {error}
          </FieldMessage>
        )}
        <Link href="/account">{t(lang, "account")}</Link>
      </section>
    </ShopShell>
  );
}
