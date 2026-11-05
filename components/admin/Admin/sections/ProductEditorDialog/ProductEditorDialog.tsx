"use client";
import Image from "next/image";
import { ct } from "@/lib/commerce-copy";
import gallery from "@/lib/gallery.json";
import { ImagePlus } from "lucide-react";
import { ProductPhoto } from "../../../../product-photo";
import { api, send } from "@/lib/shop-api";
import { t, languages, type CopyKey } from "@/lib/shop-copy";
import { productForDisplay, type Product } from "@/lib/catalog";
import { Heading } from "@/components/primitives/Heading";
import { Button } from "@/components/primitives/Button";
import { FieldMessage } from "@/components/primitives/FieldMessage";
import { Text } from "@/components/primitives/Text";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Textarea } from "@/components/primitives/Textarea";
import { styles } from "./ProductEditorDialog.styles";
import { Modal } from "../../../Modal";
import type { ProductEditorDialogProps } from "./ProductEditorDialog.types";

export function ProductEditorDialog({
  lang,
  products,
  error,
  busy,
  editingProduct,
  setEditingProduct,
  productLang,
  setProductLang,
  uploadReady,
  action,
}: ProductEditorDialogProps) {
  if (!editingProduct) return null;
  const hasCompleteLanguage = languages.some(
    (language) =>
      editingProduct.name[language].trim() &&
      editingProduct.description[language].trim(),
  );
  return (
    <Modal
      title={
        products.some((product) => product.id === editingProduct.id)
          ? t(lang, "edit")
          : t(lang, "addProduct")
      }
      close={() => setEditingProduct(null)}
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            await send("/admin/products", editingProduct);
            setEditingProduct(null);
          });
        }}
      >
        <div className={styles.div14}>
          <Label>
            {t(lang, "category")}
            <Select
              value={editingProduct.category}
              onChange={(e) =>
                setEditingProduct((p) => ({
                  ...p!,
                  category: e.target.value as Product["category"],
                }))
              }
            >
              {["signature", "sets", "new", "classics", "maki"].map((c) => (
                <option key={c} value={c}>
                  {t(lang, c as CopyKey)}
                </option>
              ))}
            </Select>
          </Label>
          <Label>
            {t(lang, "price")}
            <Input
              required
              type="number"
              step="0.01"
              min="1"
              max="1000"
              value={editingProduct.price / 100}
              onChange={(e) =>
                setEditingProduct((p) => ({
                  ...p!,
                  price: Math.round(Number(e.target.value) * 100),
                }))
              }
            />
          </Label>
          <Label>
            {t(lang, "weight")}
            <Input
              type="number"
              min="1"
              max="10000"
              value={editingProduct.weight || ""}
              onChange={(e) =>
                setEditingProduct((p) => ({
                  ...p!,
                  weight: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </Label>
        </div>
        <Text id="product-translations-hint" className={styles.text4}>
          {t(lang, "productTranslationHint")}
        </Text>
        <div className={styles.div15}>
          {languages.map((l) => (
            <Button
              key={l}
              type="button"
              aria-pressed={productLang === l}
              onClick={() => setProductLang(l)}
            >
              {l === "uk" ? "UA" : l === "fa" ? "فارسی" : l.toUpperCase()}
            </Button>
          ))}
        </div>
        {languages.map((l) => (
          <div
            key={l}
            hidden={productLang !== l}
            dir={l === "fa" ? "rtl" : "ltr"}
          >
            <Label>
              {t(l, "productName")}
              <Input
                required={!hasCompleteLanguage && productLang === l}
                maxLength={160}
                aria-describedby="product-translations-hint"
                value={editingProduct.name[l]}
                onChange={(e) =>
                  setEditingProduct((p) => ({
                    ...p!,
                    name: { ...p!.name, [l]: e.target.value },
                  }))
                }
              />
            </Label>
            <Label>
              {t(l, "description")}
              <Textarea
                rows={4}
                required={!hasCompleteLanguage && productLang === l}
                maxLength={2000}
                aria-describedby="product-translations-hint"
                value={editingProduct.description[l]}
                onChange={(e) =>
                  setEditingProduct((p) => ({
                    ...p!,
                    description: { ...p!.description, [l]: e.target.value },
                  }))
                }
              />
            </Label>
          </div>
        ))}
        <ProductPhoto product={productForDisplay(editingProduct)} lang={lang} />
        <Label>
          {ct(lang, "taxRate")}
          <Select
            value={editingProduct.taxRate ?? 0}
            onChange={(e) =>
              setEditingProduct((p) => ({
                ...p!,
                taxRate: Number(e.target.value),
              }))
            }
          >
            <option value={0}>0%</option>
            <option value={700}>7%</option>
            <option value={1900}>19%</option>
          </Select>
        </Label>
        <Heading as="h3">
          {ct(lang, "photos")} · {(editingProduct.images || []).length}/5
        </Heading>
        <div className={styles.div16}>
          {(editingProduct.images || []).map((src, i) => (
            <div key={src}>
              <Image unoptimized width={960} height={640} src={src} alt={String(i + 1)} />
              <Button
                type="button"
                className={styles.button7}
                onClick={() =>
                  setEditingProduct((p) => ({
                    ...p!,
                    image: src,
                    images: [src, ...p!.images!.filter((s) => s !== src)],
                  }))
                }
              >
                {i === 0 ? "✓ " : ""}
                {ct(lang, "primaryPhoto")}
              </Button>
              <Button
                type="button"
                onClick={() =>
                  setEditingProduct((p) => {
                    const images = p!.images!.filter((s) => s !== src);
                    return { ...p!, images, image: images[0] || "" };
                  })
                }
              >
                {ct(lang, "removePhoto")}
              </Button>
            </div>
          ))}
        </div>
        <details>
          <summary>{t(lang, "gallery")}</summary>
          <div className={styles.div17}>
            {gallery.map((name) => (
              <Button
                type="button"
                key={name}
                aria-label={name}
                onClick={() =>
                  setEditingProduct((p) => ({
                    ...p!,
                    images: [
                      ...new Set([...(p!.images || []), "/photos/" + name]),
                    ].slice(0, 5),
                    image: p!.images?.[0] || "/photos/" + name,
                  }))
                }
              >
                <Image unoptimized
                  src={"/photos/" + name}
                  alt={name}
                  loading="lazy"
                  width="150"
                  height="100"
                />
              </Button>
            ))}
          </div>
        </details>
        <Label className={styles.label2}>
          <ImagePlus size={18} />
          {t(lang, "upload")}
          <Input
            type="file"
            disabled={!uploadReady || (editingProduct.images?.length || 0) >= 5}
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              await action(async () => {
                if (file.size > 12000000) throw new Error("TOO_LARGE");
                const r = await api<{ url: string }>("/admin/media", {
                  method: "POST",
                  body: file,
                  headers: { "Content-Type": file.type },
                });
                setEditingProduct((p) => ({
                  ...p!,
                  images: [...new Set([...(p!.images || []), r.url])].slice(
                    0,
                    5,
                  ),
                  image: p!.images?.[0] || r.url,
                }));
              });
            }}
          />
          <Text as="small">
            {uploadReady
              ? t(lang, "minPhoto")
              : lang === "fa"
                ? "برای آپلود عکس جدید، فضای عکس باید فعال شود؛ انتخاب از گالری آماده است."
                : lang === "uk"
                  ? "Для нових фото підключіть сховище. Можна обрати фото з галереї."
                  : lang === "de"
                    ? "Für neue Uploads Bildspeicher verbinden. Die Galerie ist verfügbar."
                    : "Connect image storage for new uploads. Existing gallery photos are available."}
          </Text>
        </Label>
        <Label className={styles.label3}>
          <Input
            type="checkbox"
            checked={editingProduct.active !== false}
            onChange={(e) =>
              setEditingProduct((p) => ({
                ...p!,
                active: e.target.checked,
              }))
            }
          />
          {t(lang, "active")}
        </Label>
        {error && (
          <FieldMessage
            tone="error"
            className={styles.fieldMessage5}
            role="alert"
          >
            {error}
          </FieldMessage>
        )}
        <Button className={styles.button8} disabled={busy} aria-busy={busy}>
          {t(lang, "save")}
        </Button>
      </form>
    </Modal>
  );
}
