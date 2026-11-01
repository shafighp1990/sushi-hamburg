"use client";
import { useCallback, useMemo, useSyncExternalStore } from "react";

const subscribeLocation = (listener: () => void) => {
  window.addEventListener("popstate", listener);
  window.addEventListener("hashchange", listener);
  window.addEventListener("pageshow", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("hashchange", listener);
    window.removeEventListener("pageshow", listener);
  };
};
const getLocation = () => window.location.search + window.location.hash;
const empty = () => "";
export function useBrowserLocation() {
  return useSyncExternalStore(subscribeLocation, getLocation, empty);
}
const subscribeClock = (listener: () => void) => {
  const interval = window.setInterval(listener, 60000);
  return () => window.clearInterval(interval);
};
const getMinute = () => Math.floor(Date.now() / 60000) * 60000;
const noMinute = () => null;
export function useBrowserMinute() {
  const minute = useSyncExternalStore(subscribeClock, getMinute, noMinute);
  return useMemo(() => minute === null ? null : new Date(minute), [minute]);
}

export type SavedOrder = { id: string; token: string | null; date: number };
export function readSavedOrders(value: string | null): SavedOrder[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SavedOrder => !!item && typeof item === "object" &&
      "id" in item && typeof item.id === "string" && "token" in item &&
      (typeof item.token === "string" || item.token === null) &&
      "date" in item && typeof item.date === "number");
  } catch { return []; }
}

const storageEvent = "sushi-browser-storage";
const memoryStorage = new Map<string, string>();
type StorageKind = "local" | "session";
function browserStorage(kind: StorageKind) {
  return kind === "local" ? window.localStorage : window.sessionStorage;
}
export function readBrowserStorage(kind: StorageKind, key: string, fallback = "") {
  try { return browserStorage(kind).getItem(key) ?? fallback; }
  catch { return memoryStorage.get(`${kind}:${key}`) ?? fallback; }
}
export function writeBrowserStorage(kind: StorageKind, key: string, value: string) {
  memoryStorage.set(`${kind}:${key}`, value);
  try { browserStorage(kind).setItem(key, value); } catch { /* Keep this tab usable when storage is unavailable. */ }
  window.dispatchEvent(new Event(storageEvent));
}
export function useBrowserStorage(kind: StorageKind, key: string, fallback = "") {
  const subscribe = useCallback((listener: () => void) => {
    window.addEventListener("storage", listener);
    window.addEventListener(storageEvent, listener);
    return () => { window.removeEventListener("storage", listener); window.removeEventListener(storageEvent, listener); };
  }, []);
  const snapshot = useCallback(() => readBrowserStorage(kind, key, fallback), [kind, key, fallback]);
  const serverSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
