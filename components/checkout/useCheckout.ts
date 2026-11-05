"use client";
import type * as ShopTypes from "@/lib/shop-types";
import { deliveryOptions, validSlot } from "@/lib/operations";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { useShop } from "../shop-context";
import { deliveryFee } from "@/lib/catalog";
import { errorText } from "@/lib/shop-copy";
import { readSavedOrders, readBrowserStorage, useBrowserMinute, useBrowserStorage, writeBrowserStorage } from "../use-browser-state";
import { api, send } from "@/lib/shop-api";

export function useCheckout() {
  const {
    lang,
    user,
    products,
    cart,
    count,
    subtotal,
    clear,
    ready,
    loading,
    settings,
    reviewMode,
  } = useShop();
  const [selectedMode, setMode] = useState<"guest" | "member" | null>(null);
  const mode = selectedMode ?? (user ? "member" : "guest");
  const [zone, setZone] = useState("unknown"),
    [selectedPayment, setPayment] = useState("cash_on_delivery"),
    [methods, setMethods] = useState<Record<string, boolean>>({ stripe: false, paypal: false, revolut: false, sumup: false }),
    [busy, setBusy] = useState(false),
    [errorCode, setError] = useState("");
  const payment = reviewMode || mode === "guest" ? "cash_on_delivery" : selectedPayment;
  const savedCoupon = useBrowserStorage("session", "sushi-coupon");
  const [editedCoupon, setCoupon] = useState<string | null>(null);
  const coupon = editedCoupon ?? savedCoupon;
  const [quote, setQuote] = useState<{ fingerprint: string; pricing: ShopTypes.Quote | null; error: string } | null>(null);
  const defaults = {
    name: user?.name || "", email: user?.email || "", phone: user?.phone || "",
    address: user?.address || "", city: user?.city || "Hamburg", postcode: user?.postcode || "",
    date: "", time: "18:00", utensils: "2", notes: "", accepted: false, saveAddress: true,
  };
  const [draft, setDraft] = useState<Partial<typeof defaults>>({});
  const current = { ...defaults, ...draft };
  const now = useBrowserMinute();
  const slots = now ? deliveryOptions(settings.schedule, now) : [];
  const dates = slots.map((day) => day.date);
  const day = slots.find((option) => option.date === current.date) || slots[0];
  const form = { ...current, date: day?.date || "", time: day?.times.includes(current.time) ? current.time : day?.from || "" };
  function set<K extends keyof typeof defaults>(key: K, value: typeof defaults[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  const attempt = useRef<{
    fingerprint: string;
    key: string;
    guestToken: string;
  } | null>(null);
  useEffect(() => {
    void api<ShopTypes.ShopStatus>("/status").then((status) => setMethods({
      stripe: status.stripe, paypal: status.paypal, revolut: status.revolut, sumup: status.sumup,
    })).catch(() => {});
  }, []);
  const quotePayload = JSON.stringify({
    mode, couponCode: coupon, zone,
    items: products.filter((product) => cart[product.id]).map((product) => ({ id: product.id, quantity: cart[product.id], price: product.price })),
  });
  const quoteFingerprint = JSON.stringify([quotePayload, user?.id, settings]);
  useEffect(() => {
    if (!count) return;
    let active = true;
    const timer = setTimeout(() => {
      void send<ShopTypes.Quote>("/quote", JSON.parse(quotePayload)).then((pricing) => {
        if (active) setQuote({ fingerprint: quoteFingerprint, pricing, error: "" });
      }).catch((cause: unknown) => {
        const message = cause instanceof Error ? cause.message : "SERVER_ERROR";
        if (active) setQuote({ fingerprint: quoteFingerprint, pricing: null, error: message });
      });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [quotePayload, quoteFingerprint, count]);
  const pricing = quote?.fingerprint === quoteFingerprint ? quote.pricing : null;
  const quoteError = quote?.fingerprint === quoteFingerprint && quote.error ? errorText(lang, quote.error) : "";
  const fee = settings.deliveryMode === "quote" ? null : deliveryFee(zone);
  const discount = pricing?.discount || 0;
  async function submit(e: SubmitEvent) {
    e.preventDefault();
    setError("");
    if (!ready) {
      setError("SHOP_UNAVAILABLE");
      return;
    }
    if (!validSlot(settings.schedule, form.date, form.time)) {
      setError("INVALID_DELIVERY");
      return;
    }
    if (mode === "member" && !user) {
      location.href = "/account?return=/checkout";
      return;
    }
    setBusy(true);
    try {
      const data = {
        mode,
        language: lang,
        payment,
        couponCode: coupon,
        saveAddress: mode === "member" && form.saveAddress,
        items: products
          .filter((p) => cart[p.id])
          .map((p) => ({ id: p.id, quantity: cart[p.id], price: p.price })),
        customer: {
          name: form.name,
          ...(mode === "member" ? { email: form.email } : {}),
          phone: form.phone,
          address: form.address,
          city: form.city,
          postcode: form.postcode,
          notes: form.notes,
          utensils: Number(form.utensils),
        },
        date: form.date,
        time: form.time,
        zone,
        accepted: form.accepted,
      };
      if (Object.keys(cart).some((id) => !products.some((p) => p.id === id)))
        throw new Error("PRODUCT_UNAVAILABLE");
      const fingerprint = JSON.stringify(data);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = {
          fingerprint,
          key: crypto.randomUUID(),
          guestToken: Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            (n) => n.toString(16).padStart(2, "0"),
          ).join(""),
        };
      const { key, guestToken } = attempt.current;
      const result = await send<{ order: ShopTypes.Order }>("/orders", { ...data, key, guestToken });
      const id = result.order.id;
      try {
        const saved = readSavedOrders(readBrowserStorage("local", "sushi-orders", "[]"));
        writeBrowserStorage("local",
          "sushi-orders",
          JSON.stringify(
            [
              {
                id,
                token: mode === "guest" ? guestToken : null,
                date: Date.now(),
              },
              ...saved.filter((savedOrder) => savedOrder.id !== id),
            ].slice(0, 20),
          ),
        );
      } catch {}
      clear();
      location.href = `/order?id=${id}${mode === "guest" ? "#token=" + guestToken : ""}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  return {
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
    error: errorCode ? errorText(lang, errorCode) : "",
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
  };
}
