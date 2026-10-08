'use client';
import { useState } from 'react';
import { useShop } from './shop-context';
import { ct } from '@/lib/commerce-copy';
import { t } from '@/lib/shop-copy';
import { money } from '@/lib/catalog';
import { ProductPhoto } from './product-photo';
export function OfferSection() {
  const { lang, settings, products } = useShop(),
    [copied, setCopied] = useState(false),
    o = settings.offer;
  if (!o.active) return null;
  return (
    <section className="shop-offer">
      <div>
        <span className="edition">{ct(lang, 'offerBadge')}</span>
        <h2>{o.title[lang]}</h2>
        <p>{o.description[lang]}</p>
        {o.couponCode && (
          <button
            className="shop-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(o.couponCode);
                sessionStorage.setItem('sushi-coupon', o.couponCode);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {o.couponCode} · {copied ? t(lang, 'copied') : ct(lang, 'copyCode')}
          </button>
        )}
      </div>
      <div className="offer-products">
        {o.productIds
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean)
          .map((p) => (
            <a href={'/product?id=' + p!.id} key={p!.id}>
              <ProductPhoto product={p!} lang={lang} />
              <span>{p!.name[lang]}</span>
              <b>{money(p!.price)}</b>
            </a>
          ))}
      </div>
    </section>
  );
}
