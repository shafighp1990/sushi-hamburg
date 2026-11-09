"use client";
import Image from "next/image";
import { useState } from "react";
import gallery from "@/lib/product-gallery.json";
import { ProductPhoto } from "../product-photo";
import { useShop } from "../shop-context";
import type { Product } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Button } from "@/components/primitives/Button";
import { styles } from "./product-gallery.styles";
import type { ProductGalleryProps } from "./product-gallery.types";

export function productPhotos(p: Product): string[] {
  if (p.images?.length) return p.images;
  if (p.image) return [p.image];
  return ((gallery as Record<string, { images: { basename: string }[] }>)[p.id]?.images || []).map(
    (i) => `/products/${i.basename}-2400.jpg`,
  );
}
export function ProductGallery({
  product: p,
  style: chosen,
}: ProductGalleryProps) {
  const { lang, settings } = useShop(),
    [index, setIndex] = useState(0);
  const images = productPhotos(p),
    style = chosen || settings.galleryStyle,
    active = Math.min(index, images.length - 1);
  if (!images.length) return <ProductPhoto product={p} lang={lang} />;
  return (
    <div
      className={`product-gallery gallery-${style}`}
      data-sample="services-35"
    >
      <div className={styles.div}>
        {(style === "tiles" || style === "editorial"
          ? images
          : [images[active]]
        ).map((src, i) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noreferrer"
            className={styles.a}
          >
            <Image unoptimized
              src={src}
              alt={`${p.name[lang]} · ${style === "tiles" || style === "editorial" ? i + 1 : active + 1}`}
              width="1600"
              height="1067"
              loading={i ? "lazy" : "eager"}
            />
          </a>
        ))}
      </div>
      <div className={styles.div2} aria-live="polite">
        <Text as="span">{p.name[lang]}</Text>
        <Text as="span" dir="ltr">
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(images.length).padStart(2, "0")}
        </Text>
      </div>
      {images.length > 1 && (
        <fieldset className={styles.div3} aria-label={p.name[lang]}>
          {images.map((src, i) => (
            <Button
              key={src}
              type="button"
              aria-label={`${p.name[lang]} · ${String(i + 1).padStart(2, "0")}`}
              aria-pressed={active === i}
              onClick={() => setIndex(i)}
            >
              {style === "focus" ? (
                String(i + 1).padStart(2, "0")
              ) : (
                <Image unoptimized
                  src={src.replace("-2400.", "-800.")}
                  alt=""
                  width="90"
                  height="60"
                />
              )}
              {style !== "focus" && (
                <Text as="span" className={styles.text}>
                  {String(i + 1).padStart(2, "0")}
                </Text>
              )}
            </Button>
          ))}
        </fieldset>
      )}
    </div>
  );
}
