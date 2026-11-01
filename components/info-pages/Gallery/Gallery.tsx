"use client";
import Image from "next/image";
import { ShopShell } from "../../shop-shell";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import photos from "@/lib/gallery.json";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { styles } from "./Gallery.styles";

export function Gallery() {
  const { lang } = useShop();
  return (
    <ShopShell>
      <div className={styles.div}>
        <Text as="span" className={styles.text}>
          {t(lang, "gallery")} / HH
        </Text>
        <Heading as="h1">{t(lang, "gallery")}</Heading>
      </div>
      <div className={styles.div2}>
        {photos.map((name, i) => (
          <figure key={name}>
            <a href={"/photos/" + name} target="_blank" rel="noreferrer">
              <Image unoptimized
                src={"/photos/" + name}
                alt={`Sushi HH · ${i + 1}`}
                width="1280"
                height="853"
                loading="lazy"
              />
            </a>
            <figcaption>{name.replace(".jpg", "")}</figcaption>
          </figure>
        ))}
      </div>
    </ShopShell>
  );
}
