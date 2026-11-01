"use client";
import { NewsletterPreference } from "../../../newsletter";
import { ct } from "@/lib/commerce-copy";
import { t } from "@/lib/shop-copy";
import { send } from "@/lib/shop-api";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { styles } from "./AccountSettingsForms.styles";
import type { AccountSettingsFormsProps } from "./AccountSettingsForms.types";

export function AccountSettingsForms({
  lang,
  reviewMode,
  user,
  refreshUser,
  setNotice,
  busy,
  form,
  setForm,
  set,
  action,
}: AccountSettingsFormsProps) {
  if (!user) return null;
  return (
    <aside>
      {!reviewMode && <NewsletterPreference />}
      <form
        className={styles.form2}
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await send(
              "/me",
              {
                name: form.name,
                phone: form.phone,
                address: form.address,
                postcode: form.postcode,
                city: form.city,
                language: lang,
              },
              "PATCH",
            );
            await refreshUser();
            setNotice(t(lang, "saved"));
          });
        }}
      >
        <Heading as="h2">{t(lang, "profile")}</Heading>
        {(["name", "phone", "address"] as const).map((k) => (
          <Label key={k}>
            {t(lang, k)}
            <Input
              required={k === "name"}
              autoComplete={
                k === "phone"
                  ? "tel"
                  : k === "address"
                    ? "street-address"
                    : "name"
              }
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
            />
          </Label>
        ))}
        <Label>
          {ct(lang, "postcode")}
          <Input
            autoComplete="postal-code"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            value={form.postcode}
            onChange={(e) => set("postcode", e.target.value)}
          />
        </Label>
        <Label>
          {ct(lang, "city")}
          <Input autoComplete="address-level2" value={form.city} readOnly />
        </Label>
        {!reviewMode && <Label>
          {t(lang, "email")}
          <Input value={user.email} readOnly />
        </Label>}
        <Button className={styles.button4} disabled={busy} aria-busy={busy}>
          {t(lang, "save")}
        </Button>
      </form>
      {!reviewMode && <><form
        className={styles.form3}
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await send("/me/email", {
              email: form.newEmail,
              password: form.emailPassword,
            });
            await refreshUser();
            setForm((f) => ({
              ...f,
              email: f.newEmail,
              emailPassword: "",
            }));
            setNotice(t(lang, "saved"));
          });
        }}
      >
        <Heading as="h2">{t(lang, "email")}</Heading>
        <Label>
          {t(lang, "email")}
          <Input
            type="email"
            required
            autoComplete="email"
            value={form.newEmail}
            onChange={(e) => set("newEmail", e.target.value)}
          />
        </Label>
        <Label>
          {t(lang, "currentPassword")}
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={form.emailPassword}
            onChange={(e) => set("emailPassword", e.target.value)}
          />
        </Label>
        <Button className={styles.button5} disabled={busy} aria-busy={busy}>
          {t(lang, "save")}
        </Button>
      </form>
      <form
        className={styles.form4}
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await send("/auth/change-password", {
              currentPassword: form.currentPassword,
              newPassword: form.newPassword,
              revokeOtherSessions: true,
            });
            setForm((f) => ({
              ...f,
              currentPassword: "",
              newPassword: "",
              newEmail: "",
              emailPassword: "",
            }));
            setNotice(t(lang, "saved"));
          });
        }}
      >
        <Heading as="h2">{t(lang, "changePassword")}</Heading>
        <Label>
          {t(lang, "currentPassword")}
          <Input
            required
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => set("currentPassword", e.target.value)}
          />
        </Label>
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
        <Button className={styles.button6} disabled={busy} aria-busy={busy}>
          {t(lang, "changePassword")}
        </Button>
      </form></>}
    </aside>
  );
}
