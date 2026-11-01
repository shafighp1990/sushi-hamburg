"use client";

import { useCheckout } from "./useCheckout";
import { CheckoutView } from "./CheckoutView";

export function Checkout() {
  const model = useCheckout();
  return <CheckoutView {...model} />;
}
