import type { Product, Language } from "@/lib/catalog";

export type ProductPhotoProps = {
  product: Product & { image?: string };
  lang?: Language;
};
