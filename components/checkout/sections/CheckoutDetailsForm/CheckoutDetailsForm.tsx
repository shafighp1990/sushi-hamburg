"use client";
import { reviewCopy } from "../../../review-copy";
import Link from "next/link";
import { DeliveryNotice } from "../../../delivery-notice";
import { ot } from "@/lib/operations-copy";
import { ct } from "@/lib/commerce-copy";
import { TaxBreakdown } from "../../../tax-breakdown";
import { CreditCard, UserRound } from "lucide-react";
import { money, TELEGRAM } from "@/lib/catalog";
import { t } from "@/lib/shop-copy";
import { Text } from "@/components/primitives/Text";
import { Button } from "@/components/primitives/Button";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { styles } from "./CheckoutDetailsForm.styles";
import type { CheckoutDetailsFormProps } from "./CheckoutDetailsForm.types";

export function CheckoutDetailsForm({
  lang,
  user,
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
}: CheckoutDetailsFormProps) {
  return (
    <form className={styles.form} onSubmit={submit}>
      <fieldset className={styles.fieldset}>
        <legend>01 / {t(lang, "account")}</legend>
        {!reviewMode && <div className={styles.div4}>
          <Button
            type="button"
            aria-pressed={mode === "guest"}
            onClick={() => setMode("guest")}
          >
            {t(lang, "guest")}
          </Button>
          <Button
            type="button"
            aria-pressed={mode === "member"}
            onClick={() => setMode("member")}
          >
            <UserRound size={16} />
            {t(lang, "member")}
          </Button>
        </div>}
        {mode === "guest" ? (
          <Text className={styles.text2}>{t(lang, "guestNote")}</Text>
        ) : user ? (
          <Text>
            {user.name}{!reviewMode && ` · ${user.email}`}
          </Text>
        ) : (
          <Link className={styles.a3} href="/account?return=/checkout">
            {t(lang, "signIn")}{!reviewMode && ` / ${t(lang, "signUp")}`}
          </Link>
        )}
      </fieldset>
      <fieldset>
        <legend>02 / {t(lang, "delivery")}</legend>
        <div className={styles.div5}>
          <Label>
            {t(lang, "name")}
            <Input
              required
              autoComplete="name"
              maxLength={120}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Label>
          {!reviewMode && <Label>
            {t(lang, "email")}
            <Input
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Label>}
          <Label>
            {t(lang, "phone")}
            <Input
              required
              type="tel"
              autoComplete="tel"
              maxLength={40}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Label>
          {settings.deliveryMode === "zones" && (
            <Label>
              {t(lang, "zone")}
              <Select
                aria-label={t(lang, "zone")}
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              >
                <option value="unknown">{t(lang, "zoneUnknown")}</option>
                <option value="A">A · 6 €</option>
                <option value="B">B · 9 €</option>
                {["C", "D", "E"].map((z) => (
                  <option value={z} key={z}>
                    {z} · 0,70 € / km
                  </option>
                ))}
              </Select>
            </Label>
          )}
          <Label>
            {ct(lang, "city")}
            <Input readOnly value={form.city} />
          </Label>
          <Label>
            {ct(lang, "postcode")}
            <Input
              required
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              autoComplete="postal-code"
              value={form.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </Label>
          <Label className={styles.label}>
            {t(lang, "address")}
            <Input
              required
              autoComplete="street-address"
              maxLength={500}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Label>
          <Label>
            {t(lang, "date")}
            <Select
              aria-label={t(lang, "date")}
              required
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {new Intl.DateTimeFormat(lang, {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    timeZone: "Europe/Berlin",
                  }).format(new Date(d + "T12:00:00Z"))}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            {t(lang, "time")}
            <Select
              required
              aria-label={t(lang, "time")}
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
            >
              {(slots.find((d) => d.date === form.date)?.times || []).map(
                (time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ),
              )}
            </Select>
          </Label>
          <Label>
            {t(lang, "utensils")}
            <Input
              type="number"
              min="0"
              max="50"
              required
              value={form.utensils}
              onChange={(e) => set("utensils", e.target.value)}
            />
          </Label>
          <Label className={styles.label2}>
            {t(lang, "notes")}
            <Textarea
              maxLength={1000}
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Label>
        </div>
        {mode === "member" && user && (
          <Label className={styles.label3}>
            <Input
              type="checkbox"
              checked={form.saveAddress}
              onChange={(e) => set("saveAddress", e.target.checked)}
            />
            {ct(lang, "saveAddress")}
          </Label>
        )}
        <Text className={styles.text3}>{ct(lang, "hamburgOnly")}</Text>
      </fieldset>
      <fieldset>
        <legend>03 / {t(lang, "payment")}</legend>
        <DeliveryNotice date={form.date} time={form.time} />
        {pricing && pricing.newsletterDiscount > 0 && (
          <Text>
            {ot(lang, "newsletterDiscount")}: −
            {money(pricing.newsletterDiscount)}
          </Text>
        )}
        {mode === "guest" && (
          <Text>
            <Link href="/account?return=/checkout">
              {ot(lang, "newsletter")} · −5%
            </Link>
          </Text>
        )}
        <div className={styles.div6}>
          {[
            [
              "cash_on_delivery",
              t(lang, "payment"),
              settings.paymentEnabled.cash_on_delivery,
            ],
            [
              "stripe",
              t(lang, "card") + " · Stripe",
              settings.paymentEnabled.stripe,
            ],
            ["paypal", "PayPal", settings.paymentEnabled.paypal],
            ["revolut", "Revolut", settings.paymentEnabled.revolut],
            ["sumup", "SumUp", settings.paymentEnabled.sumup],
          ].filter(([id]) => !reviewMode || id === "cash_on_delivery").map(([id, label, enabled]) => (
            <Label
              className={!enabled ? "payment-disabled" : ""}
              key={String(id)}
            >
              <Input
                type="radio"
                name="payment"
                value={String(id)}
                checked={payment === id}
                disabled={!enabled}
                onChange={() => setPayment(String(id))}
              />
              <Text as="span">
                <Text as="b">{String(label)}</Text>
                {id !== "cash_on_delivery" && !methods[String(id)] && (
                  <Text as="small">
                    {lang === "fa"
                      ? "پس از اتصال حساب فروشگاه"
                      : lang === "uk"
                        ? "Після підключення рахунку"
                        : lang === "de"
                          ? "Nach Kontoverbindung verfügbar"
                          : "Available after account connection"}
                  </Text>
                )}
              </Text>
              <CreditCard size={20} />
            </Label>
          ))}
        </div>
        <Text className={styles.text4}>{t(lang, "paymentNote")}</Text>
        {fee === null && (
          <Text className={styles.text5}>{t(lang, "deliveryQuote")}</Text>
        )}
      </fieldset>
      <fieldset>
        <legend>{ct(lang, "discounts")}</legend>
        <Label>
          {ct(lang, "code")}
          <Input
            value={coupon}
            maxLength={32}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
        </Label>
        {quoteError && (
          <FieldMessage
            tone="error"
            className={styles.fieldMessage}
            role="alert"
          >
            {quoteError}
          </FieldMessage>
        )}
        {discount > 0 && (
          <Text className={styles.text6}>
            {ct(lang, "discountPreview")} −{money(discount)}
          </Text>
        )}
      </fieldset>
      <div className={styles.div7}>
        <div>
          <Text as="span">{t(lang, "subtotal")}</Text>
          <Text as="b">{money(subtotal)}</Text>
        </div>
        {discount > 0 && (
          <div>
            <Text as="span">{ct(lang, "discount")}</Text>
            <Text as="b">−{money(discount)}</Text>
          </div>
        )}
        <div>
          <Text as="span">{t(lang, "fee")}</Text>
          <Text as="b">{fee === null ? t(lang, "pending") : money(fee)}</Text>
        </div>
        <div>
          <Text as="strong">{t(lang, "total")}</Text>
          <Text as="strong">
            {fee === null
              ? `${money(subtotal - discount)} + ${t(lang, "pending")}`
              : money(subtotal - discount + fee)}
          </Text>
        </div>
      </div>
      <TaxBreakdown tax={pricing?.tax} />
      <Label className={styles.label4}>
        <Input
          type="checkbox"
          required
          checked={form.accepted}
          onChange={(e) => set("accepted", e.target.checked)}
        />
        <Text as="span">
          {t(lang, "consent")}{" "}
          <Link href="/privacy" target="_blank" rel="noreferrer">
            {t(lang, "privacy")}
          </Link>
        </Text>
      </Label>
      {error && (
        <FieldMessage
          tone="error"
          className={styles.fieldMessage2}
          role="alert"
        >
          {error}
        </FieldMessage>
      )}
      {!loading && !ready && (
        <Text className={styles.text7}>
          {t(lang, "unavailable")}{" "}
          <a href={TELEGRAM} target="_blank" rel="noreferrer">
            {t(lang, "contact")}
          </a>
        </Text>
      )}
      <Button
        className={styles.button}
        aria-busy={busy || loading}
        disabled={
          busy ||
          loading ||
          !ready ||
          !pricing ||
          !!quoteError ||
          (mode === "member" && !user)
        }
      >
        {busy
          ? t(lang, "saving")
          : reviewMode ? reviewCopy(lang).order : fee === null
            ? t(lang, "requestQuote")
            : t(lang, "placeOrder")}
      </Button>
    </form>
  );
}
