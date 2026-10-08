'use client';
import { useState } from 'react';
import gallery from '@/lib/product-gallery.json';
import { ProductPhoto } from './product-photo';
import { useShop } from './shop-context';
import type { Product } from '@/lib/catalog';
export function productPhotos(p: Product): string[] {
  if (p.images?.length) return p.images;
  if (p.image) return [p.image];
  return ((gallery as any)[p.id]?.images || []).map(
    (i: any) => `/products/${i.basename}-2400.jpg`,
  );
}
export function ProductGallery({
  product: p,
  style: chosen,
}: {
  product: Product;
  style?: string;
}) {
  const { lang, settings } = useShop(),
    [index, setIndex] = useState(0);
  const images = productPhotos(p),
    style = chosen || settings.galleryStyle,
    active = Math.min(index, images.length - 1);
  if (!images.length) return <ProductPhoto product={p} lang={lang} />;
  return (
    <div className={`product-gallery gallery-${style}`}>
      <div className="gallery-stage">
        {(style === 'tiles' || style === 'editorial'
          ? images
          : [images[active]]
        ).map((src, i) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noreferrer"
            className="gallery-frame"
          >
            <img
              src={src}
              alt={`${p.name[lang]} · ${style === 'tiles' || style === 'editorial' ? i + 1 : active + 1}`}
              width="1600"
              height="1067"
              loading={i ? 'lazy' : 'eager'}
            />
          </a>
        ))}
      </div>
      {images.length > 1 && (
        <div className="gallery-controls">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`${p.name[lang]} · ${i + 1}`}
              aria-pressed={active === i}
              onClick={() => setIndex(i)}
            >
              {style === 'focus' ? (
                String(i + 1).padStart(2, '0')
              ) : (
                <img
                  src={src.replace('-2400.', '-800.')}
                  alt=""
                  width="90"
                  height="60"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
