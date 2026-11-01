"use client";
import type * as ShopTypes from "@/lib/shop-types";
import { useEffect, useState, type SubmitEvent } from "react";
import { useShop } from "../shop-context";
import { api, send } from "@/lib/shop-api";
import { t, errorText } from "@/lib/shop-copy";

export function useAdminLogin() {
  const { lang, user, loading, reviewMode, refreshUser } = useShop();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [errorCode, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!loading && user?.admin) location.replace("/admin");
  }, [loading, user?.admin]);
  async function login(e: SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await send("/auth/sign-in/email", {
        email: username.trim(),
        password,
      });
      const me = await api<{ user: ShopTypes.Customer | null }>("/me");
      await refreshUser();
      if (!me.user?.admin) {
        setError("ADMIN_DENIED");
        return;
      }
      location.replace("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVER_ERROR");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }
  return {
    lang,
    loading,
    reviewMode,
    username,
    setUsername,
    password,
    setPassword,
    error: errorCode === "ADMIN_DENIED" ? t(lang, "adminDenied") : errorCode ? errorText(lang, errorCode) : "",
    busy,
    login,
  };
}
