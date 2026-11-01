"use client";
import type * as ShopTypes from "@/lib/shop-types";
import { useEffect, useState, type SubmitEvent } from "react";
import { useShop } from "../shop-context";
import { t, errorText } from "@/lib/shop-copy";
import { api, send, type Order } from "@/lib/shop-api";
import type { AccountProps } from "./account.types";

export function useAccount({ reset = false }: AccountProps) {
  const { lang, user, loading, reviewMode, refreshUser } = useShop();
  const [newsletter, setNewsletter] = useState(false);
  const [mode, setMode] = useState<"signIn" | "signUp" | "forgot">("signIn"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    phone: user?.phone || "",
    address: user?.address || "",
    postcode: user?.postcode || "",
    city: user?.city || "Hamburg",
    currentPassword: "",
    newPassword: "",
    newEmail: "",
    emailPassword: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => {
    if (user) {
      api<{ orders: ShopTypes.Order[] }>("/orders")
        .then((r) => setOrders(r.orders))
        .catch((e) => setError(errorText(lang, e.message)));
    }
  }, [user, lang]);
  async function action(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function auth(e: SubmitEvent) {
    e.preventDefault();
    await action(async () => {
      if (reset && !reviewMode) {
        const token = new URLSearchParams(location.search).get("token");
        await send("/auth/reset-password", {
          token,
          newPassword: form.newPassword,
        });
        setNotice(t(lang, "saved"));
        return;
      }
      const email = form.email;
      if (mode === "forgot") {
        await send("/auth/request-password-reset", {
          email,
          redirectTo: location.origin + "/account/reset",
        });
        setNotice(t(lang, "resetSent"));
        return;
      }
      await send(
        "/auth/" + (mode === "signUp" ? "sign-up" : "sign-in") + "/email",
        {
          email,
          password: form.password,
          ...(mode === "signUp" ? { name: form.name } : {}),
        },
      );
      if (mode === "signUp" && newsletter) {
        await send<ShopTypes.NewsletterPreference>("/me/newsletter", {
          enabled: true,
          frequency: "weekly",
          language: lang,
        });
      }
      await refreshUser();
      const target = new URLSearchParams(location.search).get("return");
      if (target === "/checkout") location.href = target;
    });
  }
  return {
    reset: reset && !reviewMode,
    reviewMode,
    lang,
    user,
    loading,
    refreshUser,
    newsletter,
    setNewsletter,
    mode,
    setMode,
    error,
    setError,
    notice,
    setNotice,
    busy,
    orders,
    form,
    setForm,
    set,
    action,
    auth,
  };
}
