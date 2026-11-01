"use client";
import { Plus, Minus } from "lucide-react";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { Button } from "@/components/primitives/Button";
import { styles } from "./Quantity.styles";
import type { QuantityProps } from "../shop-shell.types";

export function Quantity({ p }: QuantityProps) {
  const { cart, change, lang } = useShop();
  return (
    <div className={styles.div15}>
      <Button
        aria-label={`${t(lang, "remove")} ${p.name[lang]}`}
        onClick={() => change(p.id, -1)}
      >
        <Minus size={14} />
      </Button>
      <output>{cart[p.id] || 0}</output>
      <Button
        aria-label={`${t(lang, "add")} ${p.name[lang]}`}
        disabled={(cart[p.id] || 0) >= 50}
        onClick={() => change(p.id, 1)}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}
