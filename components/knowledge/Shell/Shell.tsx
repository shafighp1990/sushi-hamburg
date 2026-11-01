"use client";
import { ShopShell } from "../../shop-shell";
import { styles } from "./Shell.styles";
import type { ShellProps } from "../knowledge.types";

export function Shell({ children }: ShellProps) {
  return (
    <ShopShell>
      <div className={styles.div}>{children}</div>
    </ShopShell>
  );
}
