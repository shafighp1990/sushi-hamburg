"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useShop } from "../shop-context";
import { api, type Order } from "@/lib/shop-api";
import type { OrderDetail, OrderEvent } from "@/lib/shop-types";
import { errorText } from "@/lib/shop-copy";
import { useBrowserLocation, useBrowserStorage, readSavedOrders, writeBrowserStorage } from "../use-browser-state";

export function useOrderTracking() {
  const { lang } = useShop();
  const locationState = useBrowserLocation();
  const [query, fragment = ""] = locationState.split("#");
  const params = new URLSearchParams(query);
  const id = params.get("id") || "";
  const paymentReturn = params.get("payment") === "return";
  const explicitToken = new URLSearchParams(fragment).get("token") || "";
  const storedOrders = useBrowserStorage("local", "sushi-orders", "[]");
  const saved = useMemo(() => readSavedOrders(storedOrders), [storedOrders]);
  const token = explicitToken || saved.find((entry) => entry.id === id)?.token || "";
  const [orderResult, setOrder] = useState<Order | null>(null),
    [events, setEvents] = useState<OrderEvent[]>([]),
    [errorCode, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  const order = orderResult?.id === id ? orderResult : null;
  useEffect(() => {
    if (id && explicitToken && saved.find((entry) => entry.id === id)?.token !== explicitToken) {
      writeBrowserStorage("local", "sushi-orders", JSON.stringify([
        { id, token: explicitToken, date: Date.now() }, ...saved.filter((entry) => entry.id !== id),
      ].slice(0, 20)));
    }
  }, [id, explicitToken, saved]);
  const load = useCallback((): Promise<void> => {
    if (!id) return Promise.resolve();
    return api<OrderDetail>("/orders/" + encodeURIComponent(id), {
      headers: token ? { "X-Order-Token": token } : {},
    }).then((result) => {
      setOrder(result.order); setEvents(result.events); setError("");
    }).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "SERVER_ERROR");
    });
  }, [id, token]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  const requestPayment = useCallback((action: "start" | "sync") => api<{ url?: string }>("/payments/" + action, {
    method: "POST", headers: token ? { "X-Order-Token": token } : {}, body: JSON.stringify({ orderId: id }),
  }), [id, token]);
  async function payment(action: "start" | "sync") {
    setBusy(true); setError("");
    try {
      const result = await requestPayment(action);
      if (result.url) location.assign(result.url);
      else await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "SERVER_ERROR");
    } finally { setBusy(false); }
  }
  useEffect(() => {
    if (!id || !paymentReturn) return;
    history.replaceState(null, "", `/order?id=${id}${token ? "#token=" + token : ""}`);
    void requestPayment("sync").then(() => load()).catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "SERVER_ERROR");
    });
  }, [id, paymentReturn, token, requestPayment, load]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/order?id=${id}${token ? "#token=" + token : ""}`);
      setCopied(true);
    } catch { setError("SERVER_ERROR"); }
  }
  return { lang, order, events, saved, id, token, error: errorCode ? errorText(lang, errorCode) : "", setError, busy, copied, load, payment, copy };
}
