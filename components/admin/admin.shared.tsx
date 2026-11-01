import { type Product } from "@/lib/catalog";
export const emptyProduct = (): Product => ({
  id: "",
  category: "signature",
  name: { de: "", uk: "", en: "", fa: "" },
  description: { de: "", uk: "", en: "", fa: "" },
  price: 900,
  poster: "signature",
  crop: [0, 0, 1, 1],
  active: true,
  version: 0,
});
