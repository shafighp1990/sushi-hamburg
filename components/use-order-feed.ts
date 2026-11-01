"use client";
import { useEffect, useEffectEvent, useState } from "react";
import type { OrderFeed, OrderOverview } from "@/lib/shop-types";
import { api, type Order } from "@/lib/shop-api";
// One outstanding request per open restaurant desk. Each response immediately
// opens the next long poll; the server observes persisted order/payment changes.
export function useOrderFeed(
  enabled: boolean,
  onUpdate: (orders: Order[], overview: OrderOverview) => void,
  onDenied: () => void,
) {
  const update = useEffectEvent(onUpdate);
  const denied = useEffectEvent(onDenied);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let revision = "",
      timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const result = await api<OrderFeed>(
          "/admin/order-feed?revision=" + encodeURIComponent(revision),
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        revision = result.revision;
        setConnected(true);
        if (result.orders && result.overview) update(result.orders, result.overview);
        timer = setTimeout(poll, 0);
      } catch (e) {
        if (controller.signal.aborted) return;
        setConnected(false);
        if (
          ["SIGN_IN_REQUIRED", "FORBIDDEN", "ACCOUNT_DISABLED"].includes(
            (e as Error).message,
          )
        ) {
          denied();
          return;
        }
        timer = setTimeout(poll, 3000);
      }
    };
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled]);
  return enabled && connected;
}
