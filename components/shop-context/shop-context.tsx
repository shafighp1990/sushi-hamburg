"use client";
import type * as ShopTypes from "@/lib/shop-types";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  products as defaults,
  type Product,
  type Language,
  type Cart,
} from "@/lib/catalog";
import { api, type Customer } from "@/lib/shop-api";
import { defaultSettings, type ShopSettings } from "@/lib/commerce";
import { useLanguagePreference } from "./useLanguagePreference";
import { useBrowserStorage, writeBrowserStorage } from "../use-browser-state";
import type { ShopProviderProps } from "./shop-context.types";

type Context = {
  settings: ShopSettings;
  lang: Language;
  setLang: (l: Language) => void;
  products: Product[];
  cart: Cart;
  change: (id: string, delta: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  user: Customer | null;
  loading: boolean;
  ready: boolean;
  reviewMode: boolean;
  reload: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const ShopContext = createContext<Context | null>(null);
export function ShopProvider({ children, initialLanguage = "de" }: ShopProviderProps) {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const { lang, setLang } = useLanguagePreference(initialLanguage);
  const [products, setProducts] = useState<Product[]>(defaults),
    [reviewMode, setReviewMode] = useState(false),
    [user, setUser] = useState<Customer | null>(null),
    [loading, setLoading] = useState(true),
    [ready, setReady] = useState(false);
  const refreshUser = useCallback(() => api<{ user: ShopTypes.Customer | null }>("/me")
    .then((result) => setUser((previous) => JSON.stringify(previous) === JSON.stringify(result.user) ? previous : result.user))
    .catch(() => setUser(null)), []);
  const reload = useCallback(() => Promise.all([
    api<ShopTypes.ProductResult>("/products"),
    api<ShopTypes.ShopStatus>("/status"),
    api<{ settings: ShopSettings }>("/settings"),
  ]).then(([productResult, status, config]) => {
    setProducts(productResult.products); setReady(status.ready); setReviewMode(status.reviewMode); setSettings(config.settings);
  }).catch(() => setReady(false)), []);
  const storedCart = useBrowserStorage("local", "sushi-cart", "{}");
  const cart = useMemo<Cart>(() => {
    try {
      const value: unknown = JSON.parse(storedCart);
      if (!value || typeof value !== "object" || Array.isArray(value)) return {};
      return Object.fromEntries(Object.entries(value).filter(([id, quantity]) =>
        /^[a-z0-9-]{1,80}$/.test(id) && typeof quantity === "number" &&
        Number.isInteger(quantity) && quantity > 0 && quantity <= 50));
    } catch { return {}; }
  }, [storedCart]);
  useEffect(() => {
    void Promise.all([reload(), refreshUser()]).finally(() => setLoading(false));
  }, [reload, refreshUser]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => {
    document.documentElement.dataset.buttonStyle = settings.buttonStyle;
  }, [settings.buttonStyle]);
  useEffect(() => {
    const focus = () => {
      if (document.visibilityState === "visible") void refreshUser();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refreshUser]);
  function change(id: string, delta: number) {
    const next = { ...cart };
    const quantity = Math.max(0, Math.min(50, (cart[id] || 0) + delta));
    if (quantity) next[id] = quantity;
    else delete next[id];
    writeBrowserStorage("local", "sushi-cart", JSON.stringify(next));
  }

  const count = Object.values(cart).reduce((s, q) => s + q, 0),
    subtotal = products.reduce((s, p) => s + p.price * (cart[p.id] || 0), 0);
  return (
    <ShopContext.Provider
      value={{
        settings,
        lang,
        setLang,
        products,
        cart,
        change,
        clear: () => writeBrowserStorage("local", "sushi-cart", "{}"),
        count,
        subtotal,
        user,
        loading,
        ready,
        reviewMode,
        reload,
        refreshUser,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}
export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("ShopProvider is missing");
  return context;
}
