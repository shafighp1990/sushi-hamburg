"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ShopShell, Quantity } from "../../shop-shell";
import { useShop } from "../../shop-context";
import { ProductGallery } from "../../product-gallery";
import { money, TELEGRAM } from "@/lib/catalog";
import {
  productIngredients,
  productTopics,
  setComponents,
} from "@/lib/knowledge";
import { t } from "@/lib/shop-copy";
import uiTranslations from "@/lib/knowledge-ui-translations.json";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { styles } from "./LiveProductDetail.styles";
import type { LiveProductDetailProps } from "../product-detail.types";

export function LiveProductDetail({ id }: LiveProductDetailProps) {
  const { lang, products, cart, change, loading } = useShop();
  const p = products.find((p) => p.id === id);
  const text = (key: string) => (uiTranslations as Record<string, Partial<Record<typeof lang, string>>>)[key]?.[lang] || key;
  if (!p)
    return (
      <ShopShell>
        <FieldMessage className={loading ? "sample-loading" : ""} >
          {loading ? t(lang, "loading") : t(lang, "unavailable")}
        </FieldMessage>
        <Link href="/menu">{t(lang, "menu")}</Link>
      </ShopShell>
    );
  const ingredients = productIngredients(p),
    topics = productTopics(p);
  const components = (setComponents[id] || [])
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);
  return (
    <ShopShell>
      <div className={styles.div}>
        <Link className={styles.a} href="/menu">
          {t(lang, "continue")}
        </Link>
        <section className={styles.section}>
          <div className={styles.div2}>
            <ProductGallery product={p} />
          </div>
          <div>
            <Text as="span" className={styles.text}>
              SUSHI HH / {t(lang, p.category)}
            </Text>
            <Heading as="h1">{p.name[lang]}</Heading>
            <div className={styles.div3}>
              <Text as="strong">{money(p.price)}</Text>
              {p.weight && <Text as="span">{p.weight} g</Text>}
            </div>
            <Text className={styles.text2}>{p.description[lang]}</Text>
            {cart[id] ? (
              <div className={styles.div4}>
                <Quantity p={p} />
                <Link className={styles.a2} href="/checkout">
                  {t(lang, "checkout")}
                </Link>
              </div>
            ) : (
              <Button className={styles.button} onClick={() => change(id, 1)}>
                <Plus size={18} />
                {t(lang, "add")}
              </Button>
            )}
            <Text className={styles.text3}>
              {text(
                "Preis laut Karte, Lieferung zusätzlich. Die verfügbaren Zahlungsarten werden beim Bestellen angezeigt.",
              )}
            </Text>
          </div>
        </section>
        <section className={styles.section2}>
          <div>
            <Text className={styles.text4}>{text("WAS STECKT DRIN?")}</Text>
            <Heading as="h2">{text("Die Zutaten verstehen.")}</Heading>
            {ingredients.length ? (
              <>
                <Text>
                  {text(
                    "Tippe auf eine Zutat, um mehr darüber zu erfahren. Diese Begriffe stammen aus der Originalkarte.",
                  )}
                </Text>
                <div className={styles.div5}>
                  {ingredients.map((a) => (
                    <Link href={`/wissen/${a.id}`} key={a.id}>
                      {a.title[lang]}
                    </Link>
                  ))}
                </div>
              </>
            ) : (
              <Text>
                {text(
                  "Die Set-Karte nennt Rollen, aber keine vollständige Liste aller Einzelzutaten. Aus einem Rollennamen leiten wir keine Rezeptur ab. Den vollständigen Set-Inhalt und die Zutaten bitte bestätigen lassen.",
                )}
              </Text>
            )}
            {components.length > 0 && (
              <div className={styles.div6}>
                {components.map((c) => (
                  <Link key={c!.id} href={`/product?id=${c!.id}`}>
                    {c!.name[lang]}
                  </Link>
                ))}
              </div>
            )}
            <div className={styles.div7}>
              <Heading as="h3">
                {text("Allergene & genaue Zusammensetzung")}
              </Heading>
              <Text>{t(lang, "allergens")}</Text>
              <a href={TELEGRAM} target="_blank" rel="noreferrer">
                {t(lang, "contact")}
              </a>
            </div>
          </div>
          <aside>
            <Text className={styles.text5}>{text("FORM & ZUBEREITUNG")}</Text>
            <Heading as="h2">{text("Mehr über diese Rolle.")}</Heading>
            <Text>
              {text(
                "Die Wissensartikel erklären allgemeine Stile und Handgriffe. Mengen, Saucenrezepturen und nicht ausdrücklich genannte Garstufen dieses Produkts wurden nicht übermittelt.",
              )}
            </Text>
            <div className={styles.div8}>
              {topics.map((a) => (
                <Link href={`/wissen/${a.id}`} key={a.id}>
                  {a.title[lang]}
                </Link>
              ))}
            </div>
            {id === "yakuza" && (
              <Text>
                {text("Die Originalkarte bezeichnet diese Rolle als gebraten.")}
              </Text>
            )}
            {id === "sesame-shrimp" && (
              <Text>
                {text(
                  "Die Garnele ist laut Karte gebraten; zum Lachs steht dort keine Garstufe.",
                )}
              </Text>
            )}
            <Link
              className={styles.a3}
              href={`/menus/${p.poster}.jpg`}
              target="_blank"
              rel="noreferrer"
            >
              {text("Originalkarte ansehen")}
            </Link>
          </aside>
        </section>
      </div>
    </ShopShell>
  );
}
