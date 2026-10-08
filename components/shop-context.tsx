'use client';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  products as defaults,
  type Product,
  type Language,
  type Cart,
} from '@/lib/catalog';
import { api, type Customer } from '@/lib/shop-api';
import { defaultSettings, type ShopSettings } from '@/lib/commerce';
import { languages } from '@/lib/shop-copy';
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
  reload: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const ShopContext = createContext<Context | null>(null);
export function ShopProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [lang, setLanguage] = useState<Language>('de'),
    [products, setProducts] = useState<Product[]>(defaults),
    [cart, setCart] = useState<Cart>({}),
    [hydrated, setHydrated] = useState(false),
    [user, setUser] = useState<Customer | null>(null),
    [loading, setLoading] = useState(true),
    [ready, setReady] = useState(false);
  const refreshUser = useCallback(async () => {
    try {
      const r = await api('/me');
      setUser(r.user);
    } catch {
      setUser(null);
    }
  }, []);
  const reload = useCallback(async () => {
    try {
      const [p, s, c] = await Promise.all([
        api('/products'),
        api('/status'),
        api('/settings'),
      ]);
      setProducts(p.products);
      setReady(s.ready);
      setSettings(c.settings);
    } catch {
      setReady(false);
    }
  }, []);
  useEffect(() => {
    try {
      const l = localStorage.getItem('sushi-lang');
      if (languages.includes(l as Language)) setLanguage(l as Language);
      const c = JSON.parse(localStorage.getItem('sushi-cart') || '{}');
      if (c && typeof c === 'object' && !Array.isArray(c))
        setCart(
          Object.fromEntries(
            Object.entries(c).filter(
              ([id, q]) =>
                /^[a-z0-9-]{1,80}$/.test(id) &&
                Number.isInteger(q) &&
                Number(q) > 0 &&
                Number(q) <= 50,
            ),
          ) as Cart,
        );
    } catch {}
    setHydrated(true);
    Promise.all([reload(), refreshUser()]).finally(() => setLoading(false));
  }, [reload, refreshUser]);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    if (hydrated)
      try {
        localStorage.setItem('sushi-lang', lang);
      } catch {}
  }, [lang, hydrated]);
  useEffect(() => {
    if (hydrated)
      try {
        localStorage.setItem('sushi-cart', JSON.stringify(cart));
      } catch {}
  }, [cart, hydrated]);
  useEffect(() => {
    document.documentElement.dataset.buttonStyle = settings.buttonStyle;
  }, [settings.buttonStyle]);
  function change(id: string, delta: number) {
    setCart((c) => {
      const next = { ...c },
        q = Math.max(0, Math.min(50, (c[id] || 0) + delta));
      if (q) next[id] = q;
      else delete next[id];
      return next;
    });
  }
  const count = Object.values(cart).reduce((s, q) => s + q, 0),
    subtotal = products.reduce((s, p) => s + p.price * (cart[p.id] || 0), 0);
  return (
    <ShopContext.Provider
      value={{
        settings,
        lang,
        setLang: setLanguage,
        products,
        cart,
        change,
        clear: () => setCart({}),
        count,
        subtotal,
        user,
        loading,
        ready,
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
  if (!context) throw new Error('ShopProvider is missing');
  return context;
}
