"use client";

import { reviewCopy } from "../review-copy";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { ShopShell } from "../shop-shell";

import { t, statusKey } from "@/lib/shop-copy";
import { send } from "@/lib/shop-api";
import { money } from "@/lib/catalog";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";

import { styles } from "./AccountView.styles";
import type { AccountViewProps } from "./AccountView.types";
import { AccountAccessForm } from "./sections/AccountAccessForm";
import { AccountSettingsForms } from "./sections/AccountSettingsForms";

export function AccountView({
  reset,
  reviewMode,
  lang,
  user,
  loading,
  refreshUser,
  newsletter,
  setNewsletter,
  mode,
  setMode,
  error,
  setError,
  notice,
  setNotice,
  busy,
  orders,
  form,
  setForm,
  set,
  action,
  auth,
}: AccountViewProps) {
  if (loading)
    return (
      <ShopShell>
        <FieldMessage className={styles.fieldMessage} >
          {t(lang, "loading")}
        </FieldMessage>
      </ShopShell>
    );
  if (!user || reset)
    return (
      <ShopShell>
        <div className={styles.div}>
          <div className={styles.div2}>
            <Text as="span" className={styles.text}>
              SUSHI HH / ACCOUNT
            </Text>
            <Heading as="h1">
              {reset ? t(lang, "changePassword") : t(lang, "account")}
            </Heading>
            <Text>{reviewMode ? reviewCopy(lang).login : t(lang, "signInHint")}</Text>
            <div className={styles.div3}>
              <KeyRound size={36} />
              <Text as="span">HH</Text>
            </div>
          </div>
          <AccountAccessForm
            reset={reset}
            reviewMode={reviewMode}
            lang={lang}
            newsletter={newsletter}
            setNewsletter={setNewsletter}
            mode={mode}
            setMode={setMode}
            error={error}
            setError={setError}
            notice={notice}
            setNotice={setNotice}
            busy={busy}
            form={form}
            set={set}
            auth={auth}
          />
        </div>
      </ShopShell>
    );
  return (
    <ShopShell>
      <div className={styles.div5}>
        <div>
          <Text as="span" className={styles.text2}>
            ACCOUNT / HH
          </Text>
          <Heading as="h1">{user.name}</Heading>
        </div>
        <div>
          {user.admin && (
            <Link className={styles.a} href="/admin">
              {t(lang, "admin")}
            </Link>
          )}
          <Button
            className={styles.button3}
            onClick={() =>
              action(async () => {
                await send("/auth/sign-out", {});
                await refreshUser();
              })
            }
          >
            {t(lang, "signOut")}
          </Button>
        </div>
      </div>
      {error && (
        <FieldMessage
          tone="error"
          role="alert"
          className={styles.fieldMessage4}
        >
          {error}
        </FieldMessage>
      )}
      {notice && (
        <FieldMessage  className={styles.fieldMessage5}>
          {notice}
        </FieldMessage>
      )}
      <div className={styles.div6}>
        <section>
          <Heading as="h2">{t(lang, "orders")}</Heading>
          {!orders.length ? (
            <div className={styles.div7}>
              <Text>{t(lang, "noOrders")}</Text>
              <Link href="/menu">{t(lang, "menu")}</Link>
            </div>
          ) : (
            orders.map((o) => (
              <Link key={o.id} className={styles.a2} href={`/order?id=${o.id}`}>
                <div>
                  <Text as="b">
                    {o.date} · {o.time}
                  </Text>
                  <Text as="span" className={`status-badge status-${o.status}`}>
                    {t(lang, statusKey(o.status))}
                  </Text>
                </div>
                <Text>
                  {o.items
                    .map((i) => `${i.quantity} × ${i.name[lang]}`)
                    .join(" · ")}
                </Text>
                <div>
                  <Text as="small">#{o.id.slice(0, 8).toUpperCase()}</Text>
                  <Text as="strong">
                    {o.total === null
                      ? t(lang, "pending")
                      : money(o.total)}{" "}
                  </Text>
                </div>
              </Link>
            ))
          )}
        </section>
        <AccountSettingsForms
          lang={lang}
          reviewMode={reviewMode}
          user={user}
          refreshUser={refreshUser}
          setNotice={setNotice}
          busy={busy}
          form={form}
          setForm={setForm}
          set={set}
          action={action}
          auth={auth}
        />
      </div>
    </ShopShell>
  );
}
