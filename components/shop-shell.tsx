'use client';
import { ct } from '@/lib/commerce-copy';
import {
  ShoppingBag,
  UserRound,
  ArrowUpRight,
  Clock3,
  Truck,
  Plus,
  Minus,
} from 'lucide-react';
import { Brand } from './brand';
import { useShop } from './shop-context';
import { t, languages } from '@/lib/shop-copy';
import { money, TELEGRAM, type Product } from '@/lib/catalog';
import type { ReactNode } from 'react';
export function ShopHeader() {
  const { lang, setLang, count, user } = useShop();
  return (
    <header className="shop-header">
      <div className="brand-cell">
        <Brand />
        <span>HAMBURG</span>
      </div>
      <div className="header-upper">
        <span className="hours-tag">
          <i />
          {t(lang, 'hours')}
          <small>{t(lang, 'cutoff')}</small>
        </span>
        <div className="shop-language" aria-label={t(lang, 'language')}>
          {languages.map((l) => (
            <button
              key={l}
              lang={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
            >
              {l === 'uk' ? 'UA' : l === 'fa' ? 'فا' : l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="header-lower">
        <nav aria-label={t(lang, 'menu')}>
          <a href="/">{t(lang, 'menu')}</a>
          <a href="/wissen">{t(lang, 'knowledge')}</a>
          <a href="/#delivery">{t(lang, 'delivery')}</a>
          {user?.admin && <a href="/admin">{t(lang, 'admin')}</a>}
        </nav>
        <div className="shop-tools">
          <a href="/account" aria-label={t(lang, 'account')}>
            <UserRound size={19} />
            <span>{user ? user.name.split(' ')[0] : t(lang, 'account')}</span>
          </a>
          <a
            className="bag-link"
            href="/checkout"
            aria-label={`${t(lang, 'cart')} · ${count}`}
          >
            <ShoppingBag size={18} />
            <b>{count}</b>
          </a>
        </div>
      </div>
    </header>
  );
}
export function ShopFooter() {
  const { lang } = useShop();
  return (
    <footer className="shop-footer">
      <div className="footer-ticket">
        <span className="ticket-label">SUSHI HH · HAMBURG</span>
        <div>
          <Clock3 size={20} />
          <span>
            {t(lang, 'hours')}
            <small>{t(lang, 'cutoff')}</small>
          </span>
        </div>
        <div>
          <Truck size={20} />
          <span>
            {ct(lang, 'hamburgOnly')}
            <small>{ct(lang, 'deliveryQuoteMode')}</small>
          </span>
        </div>
        <a href={TELEGRAM} target="_blank" rel="noreferrer">
          @sushi_hamburg_chat <ArrowUpRight size={20} />
        </a>
      </div>
      <div className="footer-links">
        <h2>{t(lang, 'contact')}</h2>
        <a href="/account">{t(lang, 'account')} ↗</a>
        <a href="/order">{t(lang, 'track')} ↗</a>
        <a href="/wissen">{t(lang, 'knowledge')} ↗</a>
        <a href="/gallery">{t(lang, 'gallery')} ↗</a>
      </div>
      <div className="footer-links">
        <h2>{t(lang, 'originalMenus')}</h2>
        {['signature', 'classics', 'new', 'sets'].map((p) => (
          <a href={`/menus/${p}.jpg`} target="_blank" rel="noreferrer" key={p}>
            {t(lang, p as 'signature')} ↗
          </a>
        ))}
        <a href="/privacy">{t(lang, 'privacy')} ↗</a>
        <a href="/legal">{t(lang, 'legal')} ↗</a>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SUSHI HH</span>
        <a href="/admin">{t(lang, 'admin')} ↗</a>
        <span>{t(lang, 'catalogNote')}</span>
      </div>
    </footer>
  );
}
export function ShopShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <a href="#content" className="skip-link">
        {t(useShop().lang, 'menu')}
      </a>
      <ShopHeader />
      <main id="content" className={`shop-main ${wide ? 'shop-wide' : ''}`}>
        {children}
      </main>
      <ShopFooter />
    </>
  );
}
export function Quantity({ p }: { p: Product }) {
  const { cart, change, lang } = useShop();
  return (
    <div className="quantity-control">
      <button
        aria-label={`${t(lang, 'remove')} ${p.name[lang]}`}
        onClick={() => change(p.id, -1)}
      >
        <Minus size={14} />
      </button>
      <output>{cart[p.id] || 0}</output>
      <button
        aria-label={`${t(lang, 'add')} ${p.name[lang]}`}
        disabled={(cart[p.id] || 0) >= 50}
        onClick={() => change(p.id, 1)}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function Basket({ checkout = true }: { checkout?: boolean }) {
  const { lang, products, cart, subtotal, count, change } = useShop();
  const lines = products.filter((p) => cart[p.id]);
  const missing = Object.keys(cart).filter(
    (id) => !products.some((p) => p.id === id),
  );
  return (
    <section className="basket">
      <header>
        <span>HH / {String(count).padStart(2, '0')}</span>
        <ShoppingBag size={21} />
      </header>
      <h2>{t(lang, 'cart')}</h2>
      {!count ? (
        <div className="empty-basket">
          <span>＋</span>
          <h3>{t(lang, 'empty')}</h3>
          <p>{t(lang, 'emptySub')}</p>
        </div>
      ) : (
        <>
          <div className="basket-lines">
            {lines.map((p) => (
              <div key={p.id} className="basket-line">
                <div>
                  <a href={`/product?id=${p.id}`}>{p.name[lang]}</a>
                  <b>{money(p.price * (cart[p.id] || 0))}</b>
                </div>
                <Quantity p={p} />
              </div>
            ))}
            {missing.map((id) => (
              <div key={id} className="error">
                {id} · {t(lang, 'unavailable')}
                <button onClick={() => change(id, -50)}>
                  {t(lang, 'remove')}
                </button>
              </div>
            ))}
          </div>
          <div className="basket-total">
            <span>{t(lang, 'subtotal')}</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p className="muted">{t(lang, 'catalogNote')}</p>
          {checkout && (
            <a className="shop-primary" href="/checkout">
              {t(lang, 'checkout')} <ArrowUpRight size={19} />
            </a>
          )}
        </>
      )}
      <div className="basket-stamp">
        <span>DO—SO</span>
        <small>HAMBURG</small>
      </div>
    </section>
  );
}
