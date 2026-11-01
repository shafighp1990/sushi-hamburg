"use client";
import { reviewCopy } from "../review-copy";
import Link from "next/link";
import { ShopShell } from "../shop-shell";
import { t } from "@/lib/shop-copy";
import { ct } from "@/lib/commerce-copy";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Button } from "@/components/primitives/Button";
import { styles } from "./AdminLoginView.styles";
import type { AdminLoginViewProps } from "./AdminLoginView.types";

export function AdminLoginView({
  lang,
  loading,
  reviewMode,
  username,
  setUsername,
  password,
  setPassword,
  error,
  busy,
  login,
}: AdminLoginViewProps) {
  return (
    <ShopShell>
      <div className={styles.div}>
        <div className={styles.div2}>
          <Text as="span" className={styles.text}>
            SUSHI HH / STAFF
          </Text>
          <Heading as="h1">{ct(lang, "staffLogin")}</Heading>
          <Text>{reviewMode ? reviewCopy(lang).login : ct(lang, "privateDesk")}</Text>
          <Link href="/menu">{t(lang, "menu")}</Link>
        </div>
        <form className={styles.form} onSubmit={login}>
          <Label>
            {reviewMode ? reviewCopy(lang).username : t(lang, "email")}
            <Input
              required
              type={reviewMode ? "text" : "email"}
              autoComplete="username"
              value={username}
              maxLength={254}
              onChange={(e) => setUsername(e.target.value)}
            />
          </Label>
          <Label>
            {t(lang, "password")}
            <Input
              required
              type="password"
              autoComplete="current-password"
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Label>
          {error && (
            <FieldMessage
              tone="error"
              className={styles.fieldMessage}
              role="alert"
            >
              {error}
            </FieldMessage>
          )}
          <Button
            className={styles.button}
            disabled={busy || loading}
            aria-busy={busy || loading}
          >
            {t(lang, "signIn")}
          </Button>
        </form>
      </div>
    </ShopShell>
  );
}
