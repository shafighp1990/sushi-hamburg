"use client";

import { useStorefront } from "./useStorefront";
import { StorefrontView } from "./StorefrontView";

export function Storefront() {
  const model = useStorefront();
  return <StorefrontView {...model} />;
}
