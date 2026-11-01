import type { Product, Language } from "@/lib/catalog";
export type ProductCardProps = {
  p: Product;
  index: number;
  lang: Language;
  quantity: number;
  onAdd: () => void;
};
