"use client";
import { ProductCard } from "../../ProductCard";
import { Search } from "lucide-react";


import { t, type CopyKey } from "@/lib/shop-copy";
import { TELEGRAM } from "@/lib/catalog";
import { Text } from "@/components/primitives/Text";
import { Heading } from "@/components/primitives/Heading";
import { Label } from "@/components/primitives/Label";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Button } from "@/components/primitives/Button";
import { styles } from "./ProductCatalog.styles";
import type { ProductCatalogProps } from "./ProductCatalog.types";

export function ProductCatalog({
  lang,
  cart,
  change,
  category,
  setCategory,
  query,
  setQuery,
  sort,
  setSort,
  found,
}: ProductCatalogProps) {
  return (
    <section className={styles.section2} id="menu">
      <div className={styles.div2}>
        <Label className={styles.label}>
          <Search size={19} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
            placeholder={t(lang, "search")}
            aria-label={t(lang, "search")}
          />
        </Label>
        <Label className={styles.label2}>
          <Text as="span">{t(lang, "sort")}</Text>
          <Select
            aria-label={t(lang, "sort")}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {["recommended", "priceLow", "priceHigh"].map((k) => (
              <option key={k} value={k}>
                {t(lang, k as CopyKey)}
              </option>
            ))}
          </Select>
        </Label>
      </div>
      <div className={styles.div3}>
        {(["signature", "sets", "new", "classics", "maki", "all"] as const).map(
          (c, i) => (
            <Button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              <Text as="small">{String(i + 1).padStart(2, "0")}</Text>
              {t(lang, c)}
            </Button>
          ),
        )}
      </div>
      <div className={styles.div4}>
        <Heading as="h2">{t(lang, category)}</Heading>
        <Text as="span">{String(found.length).padStart(2, "0")}</Text>
      </div>
      <div className={styles.div5}>
        {found.map((p, i) => (
          <ProductCard
            key={p.id}
            p={p}
            index={i}
            lang={lang}
            quantity={cart[p.id] || 0}
            onAdd={() => change(p.id, 1)}
          />
        ))}
      </div>
      {!found.length && (
        <div className={styles.div8}>
          <Heading as="h2">{t(lang, "noResults")}</Heading>
          <Button
            className={styles.button2}
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            {t(lang, "clear")}
          </Button>
        </div>
      )}
      <Text className={styles.text4}>
        {t(lang, "allergens")}{" "}
        <a href={TELEGRAM} target="_blank" rel="noreferrer">
          {t(lang, "contact")}
        </a>
      </Text>
    </section>
  );
}
