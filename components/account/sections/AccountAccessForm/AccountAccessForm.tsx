"use client";
import { reviewCopy } from "../../../review-copy";
import Link from "next/link";
import { ot } from "@/lib/operations-copy";
import { t } from "@/lib/shop-copy";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Button } from "@/components/primitives/Button";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { styles } from "./AccountAccessForm.styles";
import type { AccountAccessFormProps } from "./AccountAccessForm.types";

export function AccountAccessForm({
  reset,
  reviewMode,
  lang,
  newsletter,
  setNewsletter,
  mode,
  setMode,
  error,
  setError,
  notice,
  setNotice,
  busy,
  form,
  set,
  auth,
}: AccountAccessFormProps) {
  return (
    <form className={styles.form} onSubmit={auth}>
      {!reset && !reviewMode && (
        <div className={styles.div4}>
          {(["signIn", "signUp"] as const).map((m) => (
            <Button
              type="button"
              key={m}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setError("");
                setNotice("");
              }}
            >
              {t(lang, m)}
            </Button>
          ))}
        </div>
      )}
      {!reset && mode === "signUp" && (
        <Label>
          {t(lang, "name")}
          <Input
            autoComplete="name"
            required
            maxLength={120}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Label>
      )}
      {!reset && (
        <Label>
          {reviewMode ? reviewCopy(lang).username : t(lang, "email")}

          <Input
            type={reviewMode ? "text" : "email"}
            required
            autoComplete="username"
            maxLength={254}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Label>
      )}
      {!reset && mode !== "forgot" && (
        <Label>
          {t(lang, "password")}
          <Input
            required
            type="password"
            autoComplete={
              mode === "signUp" ? "new-password" : "current-password"
            }
            minLength={mode === "signUp" ? 12 : undefined}
            maxLength={128}
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
          {mode === "signUp" && (
            <Text as="small">{t(lang, "passwordHint")}</Text>
          )}
        </Label>
      )}
      {reset && (
        <Label>
          {t(lang, "newPassword")}
          <Input
            required
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            value={form.newPassword}
            onChange={(e) => set("newPassword", e.target.value)}
          />
          <Text as="small">{t(lang, "passwordHint")}</Text>
        </Label>
      )}
      {mode === "signUp" && (
        <Label className={styles.label}>
          <Input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
          />
          {ot(lang, "consent")}
        </Label>
      )}
      {error && (
        <FieldMessage
          tone="error"
          className={styles.fieldMessage2}
          role="alert"
        >
          {error}
        </FieldMessage>
      )}
      {notice && (
        <FieldMessage className={styles.fieldMessage3} >
          {notice}
        </FieldMessage>
      )}
      <Button className={styles.button} disabled={busy} aria-busy={busy}>
        {busy
          ? t(lang, "saving")
          : reset
            ? t(lang, "save")
            : mode === "forgot"
              ? t(lang, "reset")
              : t(lang, mode)}
      </Button>
      {!reset && !reviewMode && (
        <Button
          type="button"
          className={styles.button2}
          onClick={() => setMode(mode === "forgot" ? "signIn" : "forgot")}
        >
          {mode === "forgot" ? t(lang, "signIn") : t(lang, "forgot")}
        </Button>
      )}
      {reset && <Link href="/account">{t(lang, "signIn")}</Link>}
    </form>
  );
}
