import type {Product, Language} from '@/lib/catalog';
import photoMapping from '@/lib/product-images.json';

type PhotoEntry = {source: string | null; basename: string | null; status: string};
const mapping: Record<string, PhotoEntry> = photoMapping;
const pending: Record<string, string> = {
  de: 'Produktfotografie folgt',
  uk: 'Фото цієї страви незабаром',
  en: 'Dish photograph coming soon',
  fa: 'عکس این غذا به‌زودی اضافه می‌شود',
};

/** Real gallery photographs, with enough resolution for retina product details. */
export function ProductPhoto({product, lang = 'de'}: {product: Product & {image?: string}; lang?: Language}) {
  const entry = mapping[product.id];
  const custom = product.image && /^\/(?:api\/media\/|products\/|photos\/)/.test(product.image) ? product.image : undefined;
  const name = product.name[lang] || product.name.de;
  if (!custom && !entry?.basename) {
    return <div className="product-photo product-photo-pending" style={{aspectRatio: '3 / 2', display: 'grid', placeContent: 'center', textAlign: 'center', padding: '28px', background: '#181714', color: '#bbae96', gap: '12px'}}>
      <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{marginInline: 'auto', color: '#d2b17a'}}><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M7 5V3h4v2"/></svg>
      <span style={{fontSize: 13, lineHeight: 1.6}}>{pending[lang] || pending.de}</span>
    </div>;
  }
  const base = `/products/${entry?.basename}`;
  return <picture className="product-photo" style={{display: 'block', aspectRatio: '3 / 2', background: '#090a09'}}>
    {!custom && <source type="image/webp" srcSet={`${base}-800.webp 800w, ${base}-1600.webp 1600w, ${base}-2400.webp 2400w`} sizes="(min-width: 1200px) 620px, (min-width: 760px) 50vw, 100vw"/>}
    <img src={custom || `${base}-1600.jpg`} srcSet={custom ? undefined : `${base}-800.jpg 800w, ${base}-1600.jpg 1600w, ${base}-2400.jpg 2400w`} sizes="(min-width: 1200px) 620px, (min-width: 760px) 50vw, 100vw" alt={name} width={1600} height={1067} loading="lazy" decoding="async" style={{display: 'block', width: '100%', height: '100%', objectFit: 'contain', aspectRatio: '3 / 2'}}/>
  </picture>;
}
