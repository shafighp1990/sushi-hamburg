"use client";
import Link from "next/link";
import { HoursSummary } from "../../delivery-notice";
import { ShoppingBag, UserRound, Menu, X } from "lucide-react";
import { Brand } from "../../brand";
import { useShop } from "../../shop-context";
import { t, languages } from "@/lib/shop-copy";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { Text } from "@/components/primitives/Text";
import { styles } from "./ShopHeader.styles";

/**
 * Sticky header: a quiet status strip (delivery status + languages) above a
 * single bar with the logo, centred navigation and account/basket tools.
 * Navigation collapses into a panel below 980px; Escape closes it.
 */
export function ShopHeader() {
  const { lang, setLang, count, user } = useShop();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    ["/", "home"],
    ["/menu", "menu"],
    ["/wissen", "knowledge"],
    ["/#delivery", "delivery"],
    ...(user?.admin ? [["/admin", "admin"]] : []),
  ] as [string, Parameters<typeof t>[1]][];
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  return (
    <header className={styles.header}>
      <div className={styles.div}>
        <div className={styles.div2}>
          <HoursSummary />
        </div>
        <div className={styles.div3} aria-label={t(lang, "language")}>
          {languages.map((l) => (
            <Button
              key={l}
              lang={l}
              onClick={() => setLang(l)}
              aria-pressed={lang === l}
            >
              {l === "uk" ? "UA" : l === "fa" ? "فا" : l.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
      <div className={styles.div4}>
        <div className={styles.div5}>
          <Brand />
          <Text as="span" className={styles.text}>
            <Text as="strong">Sushi HH</Text>
            <Text as="span">Hamburg</Text>
          </Text>
        </div>
        <nav
          id="shop-navigation"
          className={styles.nav}
          data-open={menuOpen}
          aria-label={t(lang, "menu")}
        >
          {links.map(([href, key]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                href === pathname ||
                (href === "/wissen" && pathname.startsWith("/wissen/"))
                  ? "page"
                  : undefined
              }
            >
              {t(lang, key)}
            </Link>
          ))}
        </nav>
        <div className={styles.div6}>
          <Link href="/account" aria-label={t(lang, "account")}>
            <UserRound size={18} />
            <Text as="span">
              {user ? user.name.split(" ")[0] : t(lang, "account")}
            </Text>
          </Link>
          <Link
            className={styles.a}
            href="/checkout"
            aria-label={`${t(lang, "cart")} · ${count}`}
          >
            <ShoppingBag size={17} />
            <Text as="b">{count}</Text>
          </Link>
          <Button
            type="button"
            className={styles.button}
            ref={menuButton}
            aria-label={t(lang, "menu")}
            aria-expanded={menuOpen}
            aria-controls="shop-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>
      </div>
    </header>
  );
}
