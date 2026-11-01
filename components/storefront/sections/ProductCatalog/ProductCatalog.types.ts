import type { StorefrontViewProps } from "../../StorefrontView.types";
export type ProductCatalogProps = Pick<
  StorefrontViewProps,
  | "lang"
  | "cart"
  | "change"
  | "category"
  | "setCategory"
  | "query"
  | "setQuery"
  | "sort"
  | "setSort"
  | "found"
>;
