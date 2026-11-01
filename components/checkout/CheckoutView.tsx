"use client";

import Link from "next/link";
import { ShopShell, Basket } from "../shop-shell";

import { t } from "@/lib/shop-copy";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";

import { styles } from "./CheckoutView.styles";
import type { CheckoutViewProps } from "./CheckoutView.types";
import { CheckoutDetailsForm } from "./sections/CheckoutDetailsForm";

export function CheckoutView({
  lang,
  user,
  count,
  subtotal,
  ready,
  loading,
  settings,
  reviewMode,
  mode,
  setMode,
  dates,
  zone,
  setZone,
  payment,
  setPayment,
  methods,
  busy,
  error,
  coupon,
  setCoupon,
  pricing,
  quoteError,
  form,
  slots,
  fee,
  discount,
  set,
  submit,
}: CheckoutViewProps) {
  return (
    <ShopShell>
      <Link className={styles.a} href="/menu">
        {t(lang, "continue")}
      </Link>
      <div className={styles.div}>
        <Text as="span" className={styles.text}>
          CHECKOUT / HH
        </Text>
        <Heading as="h1">{t(lang, "checkout")}</Heading>
      </div>
      {!count ? (
        <div className={styles.div2}>
          <Heading as="h2">{t(lang, "empty")}</Heading>
          <Link className={styles.a2} href="/menu">
            {t(lang, "menu")}
          </Link>
        </div>
      ) : (
        <div className={styles.div3}>
          <CheckoutDetailsForm
            lang={lang}
            user={user}
            subtotal={subtotal}
            ready={ready}
            loading={loading}
            settings={settings}
            reviewMode={reviewMode}
            mode={mode}
            setMode={setMode}
            dates={dates}
            zone={zone}
            setZone={setZone}
            payment={payment}
            setPayment={setPayment}
            methods={methods}
            busy={busy}
            error={error}
            coupon={coupon}
            setCoupon={setCoupon}
            pricing={pricing}
            quoteError={quoteError}
            form={form}
            slots={slots}
            fee={fee}
            discount={discount}
            set={set}
            submit={submit}
          />
          <aside>
            <Basket checkout={false} />
          </aside>
        </div>
      )}
    </ShopShell>
  );
}
