import { type Product } from "@/lib/catalog";
export const emptyProduct = (): Product => ({
  id: "product-" + crypto.randomUUID(),
  category: "signature",
  name: { de: "", uk: "", en: "", fa: "" },
  description: { de: "", uk: "", en: "", fa: "" },
  price: 900,
  taxRate: 0,
  poster: "signature",
  crop: [0, 0, 1, 1],
  active: true,
  version: 0,
});
