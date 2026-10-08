'use client';
import { OfferSection } from './offer-section';
import { ct } from '@/lib/commerce-copy';
import { useState } from 'react';
import { Search, Plus, ArrowUpRight } from 'lucide-react';
import { ShopShell, Basket, Quantity } from './shop-shell';
import { useShop } from './shop-context';
import { ProductPhoto } from './product-photo';
import { t, type CopyKey } from '@/lib/shop-copy';
import { money, TELEGRAM, type Category } from '@/lib/catalog';
import photoMap from '@/lib/product-images.json';
export function Storefront() {
  const { lang, products, cart, change, count, subtotal } = useShop();
  const [category, setCategory] = useState<Category | 'all'>('signature'),
    [query, setQuery] = useState(''),
    [sort, setSort] = useState('recommended');
  const q = query.toLocaleLowerCase().trim();
  const found = products
    .filter(
      (p) =>
        (category === 'all' || p.category === category) &&
        (!q ||
          `${p.name[lang]} ${p.description[lang]}`
            .toLocaleLowerCase()
            .includes(q)),
    )
    .sort((a, b) =>
      sort === 'priceLow'
        ? a.price - b.price
        : sort === 'priceHigh'
          ? b.price - a.price
          : Number(!!(b.image || (photoMap as any)[b.id]?.basename)) -
            Number(!!(a.image || (photoMap as any)[a.id]?.basename)),
    );
  return (
    <ShopShell wide>
      <section className="menu-opening">
        <div>
          <span className="edition">01 / SUSHI HH</span>
          <h1>{t(lang, 'menuTitle')}</h1>
        </div>
        <p>
          {t(lang, 'catalogNote')}
          <br />
          <a href="#delivery">
            {t(lang, 'hours')} <ArrowUpRight size={15} />
          </a>
        </p>
      </section>
      <OfferSection />
      <div className="store-layout">
        <section className="menu-catalog" id="menu">
          <div className="menu-toolbar">
            <label className="search-box">
              <Search size={19} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder={t(lang, 'search')}
                aria-label={t(lang, 'search')}
              />
            </label>
            <label className="sort-box">
              <span>{t(lang, 'sort')}</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                {['recommended', 'priceLow', 'priceHigh'].map((k) => (
                  <option key={k} value={k}>
                    {t(lang, k as CopyKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="shop-categories">
            {(
              ['signature', 'sets', 'new', 'classics', 'maki', 'all'] as const
            ).map((c, i) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
              >
                <small>{String(i + 1).padStart(2, '0')}</small>
                {t(lang, c)}
              </button>
            ))}
          </div>
          <div className="category-caption">
            <h2>{t(lang, category)}</h2>
            <span>{String(found.length).padStart(2, '0')}</span>
          </div>
          <div className="shop-product-grid">
            {found.map((p, i) => (
              <article className="shop-product" key={p.id}>
                <a className="product-image-link" href={`/product?id=${p.id}`}>
                  <ProductPhoto product={p} lang={lang} />
                  <span className="product-index">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {p.weight && (
                    <span className="product-weight">{p.weight} g</span>
                  )}
                </a>
                <div className="product-title-row">
                  <h3>
                    <a href={`/product?id=${p.id}`}>{p.name[lang]}</a>
                  </h3>
                  <strong>{money(p.price)}</strong>
                </div>
                <p>{p.description[lang]}</p>
                <div className="product-actions">
                  <a href={`/product?id=${p.id}`}>
                    {t(lang, 'details')}
                    <ArrowUpRight size={15} />
                  </a>
                  {cart[p.id] ? (
                    <Quantity p={p} />
                  ) : (
                    <button
                      className="add-product"
                      onClick={() => change(p.id, 1)}
                    >
                      <Plus size={17} />
                      {t(lang, 'add')}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!found.length && (
            <div className="shop-empty">
              <h2>{t(lang, 'noResults')}</h2>
              <button
                className="shop-secondary"
                onClick={() => {
                  setQuery('');
                  setCategory('all');
                }}
              >
                {t(lang, 'clear')}
              </button>
            </div>
          )}
          <p className="allergen-footnote">
            {t(lang, 'allergens')}{' '}
            <a href={TELEGRAM} target="_blank" rel="noreferrer">
              {t(lang, 'contact')} ↗
            </a>
          </p>
        </section>
        <aside className="desktop-basket">
          <Basket />
        </aside>
      </div>
      <section id="delivery" className="delivery-ledger">
        <div>
          <span className="edition">02 / HAMBURG</span>
          <h2>{t(lang, 'delivery')}</h2>
          <p>
            {t(lang, 'hours')}
            <br />
            {t(lang, 'cutoff')}
          </p>
          <a href={TELEGRAM} target="_blank" rel="noreferrer">
            {t(lang, 'contact')} ↗
          </a>
        </div>
        <div className="delivery-rates">
          <h3>{ct(lang, 'hamburgOnly')}</h3>
          <p>{ct(lang, 'deliveryQuoteMode')}</p>
        </div>
      </section>
      {count > 0 && (
        <a className="mobile-checkout" href="/checkout">
          <span>
            {count} · {t(lang, 'checkout')}
          </span>
          <strong>
            {money(subtotal)} <ArrowUpRight size={17} />
          </strong>
        </a>
      )}
    </ShopShell>
  );
}
