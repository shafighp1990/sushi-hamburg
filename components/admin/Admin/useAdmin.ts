"use client";
import type * as ShopTypes from "@/lib/shop-types";
import { useOrderFeed } from "../../use-order-feed";
import { mergeOrderVersions } from "@/lib/order-state";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShop } from "../../shop-context";
import { api, type Order } from "@/lib/shop-api";
import { t, errorText } from "@/lib/shop-copy";
import { type Product, type Language } from "@/lib/catalog";

export function useAdmin() {
  const { lang, user, loading, reload, refreshUser } = useShop();
  const seenOrders = useRef<Map<string, boolean> | null>(null);
  const [incoming, setIncoming] = useState<Order[]>([]);
  const [tab, setTab] = useState("overview"),
    [stats, setStats] = useState<ShopTypes.OrderOverview>({ orders: 0, pending: 0, revenue: 0 }),
    [orders, setOrders] = useState<Order[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [customers, setCustomers] = useState<ShopTypes.CustomerRecord[]>([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [editingProduct, setEditingProduct] = useState<Product | null>(null),
    [editingOrder, setEditingOrder] = useState<Order | null>(null),
    [editingCustomer, setEditingCustomer] = useState<(ShopTypes.CustomerRecord & { confirmEmail?: string }) | null>(null),
    [invite, setInvite] = useState(false),
    [link, setLink] = useState(""),
    [productLang, setProductLang] = useState<Language>("de"),
    [uploadReady, setUploadReady] = useState(false);
  const load = useCallback(() => Promise.all([
        api<ShopTypes.OrderOverview>("/admin/overview"),
        api<{ orders: ShopTypes.Order[] }>("/admin/orders"),
        api<ShopTypes.ProductResult>("/admin/products"),
        api<{ customers: ShopTypes.CustomerRecord[] }>("/admin/customers"),
      ]).then(([a, b, c, d]) => {
      if (seenOrders.current === null) {
        seenOrders.current = new Map(
          b.orders.map((o: Order) => [o.id, o.paid]),
        );
        setStats(a);
        setOrders(b.orders);
      }
      setProducts(c.products);
      setCustomers(d.customers);
    }).catch((e: unknown) => {
      setError(errorText(lang, e instanceof Error ? e.message : "SERVER_ERROR"));
    }), [lang]);
  useEffect(() => {
    api<ShopTypes.ShopStatus>("/status")
      .then((s) => setUploadReady(!!s.upload))
      .catch(() => {});
    if (user?.admin) {
      void load();
    }
  }, [user?.admin, load]);
  const connected = useOrderFeed(
    !!user?.admin,
    (next, overview) => {
      const previous = seenOrders.current;
      if (previous) {
        const fresh = next.filter(
          (o) =>
            o.status !== "cancelled" &&
            ((o.paid && previous.get(o.id) !== true) ||
              (!previous.has(o.id) && o.payment === "cash_on_delivery")),
        );
        if (fresh.length) setIncoming(fresh);
      }
      seenOrders.current = new Map(next.map((o) => [o.id, o.paid]));
      setOrders((current) => mergeOrderVersions(current, next));
      setStats(overview);
    },
    () => {
      setOrders([]);
      setCustomers([]);
      setIncoming([]);
      void refreshUser();
    },
  );
  useEffect(() => {
    if (!loading && !user) location.replace("/admin/login");
    if (!loading && user && !user.admin) location.replace("/account");
  }, [loading, user]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await load();
      await reload();
      setNotice(t(lang, "saved"));
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return {
    lang,
    user,
    loading,
    refreshUser,
    incoming,
    setIncoming,
    tab,
    setTab,
    stats,
    orders,
    setOrders,
    products,
    customers,
    query,
    setQuery,
    status,
    setStatus,
    error,
    setError,
    notice,
    setNotice,
    busy,
    editingProduct,
    setEditingProduct,
    editingOrder,
    setEditingOrder,
    editingCustomer,
    setEditingCustomer,
    invite,
    setInvite,
    link,
    setLink,
    productLang,
    setProductLang,
    uploadReady,
    load,
    connected,
    action,
  };
}
