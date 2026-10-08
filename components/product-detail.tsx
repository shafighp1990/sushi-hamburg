'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Plus, Check } from 'lucide-react';
import { ShopShell, Quantity } from './shop-shell';
import { useShop } from './shop-context';
import { ProductGallery } from './product-gallery';
import { money, TELEGRAM } from '@/lib/catalog';
import {
  productIngredients,
  productTopics,
  setComponents,
} from '@/lib/knowledge';
import { t } from '@/lib/shop-copy';
import uiTranslations from '@/lib/knowledge-ui-translations.json';
export function LiveProductDetail({ id }: { id: string }) {
  const { lang, products, cart, change, loading } = useShop();
  const p = products.find((p) => p.id === id);
  const text = (key: string) => (uiTranslations as any)[key]?.[lang] || key;
  if (!p)
    return (
      <ShopShell>
        <p>{loading ? t(lang, 'loading') : t(lang, 'unavailable')}</p>
        <a href="/">{t(lang, 'menu')} ↗</a>
      </ShopShell>
    );
  const ingredients = productIngredients(p),
    topics = productTopics(p);
  const components = (setComponents[id] || [])
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  return (
    <ShopShell>
      <div className="product-detail-live">
        <a className="shop-back" href="/">
          <ArrowLeft size={16} />
          {t(lang, 'continue')}
        </a>
        <section className="product-detail-hero">
          <div className="detail-image">
            <ProductGallery product={p} />
          </div>
          <div>
            <span className="edition">SUSHI HH / {t(lang, p.category)}</span>
            <h1>{p.name[lang]}</h1>
            <div className="detail-price">
              <strong>{money(p.price)}</strong>
              {p.weight && <span>{p.weight} g</span>}
            </div>
            <p className="detail-intro">{p.description[lang]}</p>
            {cart[id] ? (
              <div className="detail-purchase">
                <Quantity p={p} />
                <a className="shop-primary" href="/checkout">
                  {t(lang, 'checkout')} ↗
                </a>
              </div>
            ) : (
              <button className="shop-primary" onClick={() => change(id, 1)}>
                <Plus size={18} />
                {t(lang, 'add')}
              </button>
            )}
            <p className="muted">
              {text(
                'Preis laut Karte, Lieferung zusätzlich. Die verfügbaren Zahlungsarten werden beim Bestellen angezeigt.',
              )}
            </p>
          </div>
        </section>
        <section className="product-knowledge">
          <div>
            <p className="eyebrow">{text('WAS STECKT DRIN?')}</p>
            <h2>{text('Die Zutaten verstehen.')}</h2>
            {ingredients.length ? (
              <>
                <p>
                  {text(
                    'Tippe auf eine Zutat, um mehr darüber zu erfahren. Diese Begriffe stammen aus der Originalkarte.',
                  )}
                </p>
                <div className="topic-links">
                  {ingredients.map((a) => (
                    <a href={`/wissen/${a.id}`} key={a.id}>
                      {a.title[lang]}
                      <ArrowUpRight size={14} />
                    </a>
                  ))}
                </div>
              </>
            ) : (
              <p>
                {text(
                  'Die Set-Karte nennt Rollen, aber keine vollständige Liste aller Einzelzutaten. Aus einem Rollennamen leiten wir keine Rezeptur ab. Den vollständigen Set-Inhalt und die Zutaten bitte bestätigen lassen.',
                )}
              </p>
            )}
            {components.length > 0 && (
              <div className="topic-links">
                {components.map((c) => (
                  <a key={c!.id} href={`/product?id=${c!.id}`}>
                    {c!.name[lang]} ↗
                  </a>
                ))}
              </div>
            )}
            <div className="ingredient-note">
              <h3>{text('Allergene & genaue Zusammensetzung')}</h3>
              <p>{t(lang, 'allergens')}</p>
              <a href={TELEGRAM} target="_blank" rel="noreferrer">
                {t(lang, 'contact')} ↗
              </a>
            </div>
          </div>
          <aside>
            <p className="eyebrow">{text('FORM & ZUBEREITUNG')}</p>
            <h2>{text('Mehr über diese Rolle.')}</h2>
            <p>
              {text(
                'Die Wissensartikel erklären allgemeine Stile und Handgriffe. Mengen, Saucenrezepturen und nicht ausdrücklich genannte Garstufen dieses Produkts wurden nicht übermittelt.',
              )}
            </p>
            <div className="topic-links">
              {topics.map((a) => (
                <a href={`/wissen/${a.id}`} key={a.id}>
                  {a.title[lang]}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
            {id === 'yakuza' && (
              <p>
                {text('Die Originalkarte bezeichnet diese Rolle als gebraten.')}
              </p>
            )}
            {id === 'sesame-shrimp' && (
              <p>
                {text(
                  'Die Garnele ist laut Karte gebraten; zum Lachs steht dort keine Garstufe.',
                )}
              </p>
            )}
            <a
              className="original-menu-link"
              href={`/menus/${p.poster}.jpg`}
              target="_blank"
              rel="noreferrer"
            >
              {text('Originalkarte ansehen')}
              <ArrowUpRight size={18} />
            </a>
          </aside>
        </section>
      </div>
    </ShopShell>
  );
}
export function DynamicProduct() {
  const [id, setId] = useState('');
  useEffect(
    () => setId(new URLSearchParams(location.search).get('id') || ''),
    [],
  );
  return <LiveProductDetail id={id} />;
}
