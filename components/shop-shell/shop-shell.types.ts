import type { Product } from "@/lib/catalog";
import type { ReactNode } from "react";

export type ShopShellProps = {
  children: ReactNode;
  wide?: boolean;
};

export type QuantityProps = { p: Product };

export type BasketProps = { checkout?: boolean };
