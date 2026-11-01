"use client";
import { useShop } from "../../shop-context";
import { t } from "@/lib/shop-copy";
import { reviewCopy } from "../../review-copy";
import { styles } from "./ShopShell.styles";
import type { ShopShellProps } from "../shop-shell.types";
import { ShopHeader } from "../ShopHeader";
import { ShopFooter } from "../ShopFooter";

export function ShopShell({ children, wide = false }: ShopShellProps) {
  const { lang, reviewMode } = useShop();
  const copy = reviewCopy(lang);
  return (
    <>
      <a href="#content" className={styles.a3}>
        {t(lang, "menu")}
      </a>
      <ShopHeader />
      {reviewMode && <aside className="review-notice" aria-label={copy.title}><strong>{copy.title}</strong> {copy.notice}</aside>}
      <main id="content" className={`shop-main ${wide ? "shop-wide" : ""}`}>
        {children}
      </main>
      <ShopFooter />
    </>
  );
}
