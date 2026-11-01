"use client";
import { useState } from "react";
import { useShop } from "../shop-context";
import { type Category } from "@/lib/catalog";
import photoMap from "@/lib/product-images.json";

export function useStorefront() {
  const { lang, products, cart, change, count, subtotal } = useShop();
  const [category, setCategory] = useState<Category | "all">("signature"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("recommended");
  const q = query.toLocaleLowerCase().trim();
  const found = products
    .filter(
      (p) =>
        (category === "all" || p.category === category) &&
        (!q ||
          `${p.name[lang]} ${p.description[lang]}`
            .toLocaleLowerCase()
            .includes(q)),
    )
    .sort((a, b) =>
      sort === "priceLow"
        ? a.price - b.price
        : sort === "priceHigh"
          ? b.price - a.price
          : Number(!!(b.image || (photoMap as Record<string, { basename: string | null }>)[b.id]?.basename)) -
            Number(!!(a.image || (photoMap as Record<string, { basename: string | null }>)[a.id]?.basename)),
    );
  return {
    lang,
    cart,
    change,
    count,
    subtotal,
    category,
    setCategory,
    query,
    setQuery,
    sort,
    setSort,
    found,
  };
}
