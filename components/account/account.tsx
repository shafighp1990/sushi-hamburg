"use client";
import type { AccountProps } from "./account.types";
import { useShop } from "../shop-context";
import { useAccount } from "./useAccount";
import { AccountView } from "./AccountView";

export function Account({ reset = false }: AccountProps) {
  const { user } = useShop();
  return <AccountSession key={`${user?.id || "guest"}:${reset}`} reset={reset} />;
}
function AccountSession({ reset = false }: AccountProps) {
  const model = useAccount({ reset });
  return <AccountView {...model} />;
}
