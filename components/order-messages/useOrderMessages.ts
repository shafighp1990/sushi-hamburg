"use client";
import { useCallback, useEffect, useRef, useState, type SubmitEvent } from "react";
import { api } from "@/lib/shop-api";
import type { OrderMessage, OrderMessages as MessagePage } from "@/lib/shop-types";
import { errorText } from "@/lib/shop-copy";
import { orderCopy } from "./OrderMessages.copy";
import type { OrderMessagesProps } from "./OrderMessages.types";

function mergeMessages(current: OrderMessage[], incoming: OrderMessage[]) {
  const messages = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}
export function useOrderMessages({ orderId, lang, token, staff = false }: OrderMessagesProps) {
  const copy = orderCopy(lang);
  const endpoint = `${staff ? "/admin" : ""}/orders/${encodeURIComponent(orderId)}/messages`;
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const attempt = useRef<{ text: string; id: string } | null>(null);
  const fetchMessages = useCallback((before?: string, signal?: AbortSignal) =>
    api<MessagePage>(endpoint + (before ? `?before=${encodeURIComponent(before)}` : ""), {
      signal, headers: token ? { "X-Order-Token": token } : {},
    }), [endpoint, token]);
  const load = useCallback((before?: string) => fetchMessages(before).then((page) => {
    setMessages((current) => mergeMessages(current, page.messages));
    if (before) setCursor(page.nextCursor);
    else setCursor((current) => current === undefined ? page.nextCursor : current);
    setError("");
  }).catch((failure: unknown) => {
    setError(errorText(lang, failure instanceof Error ? failure.message : "SERVER_ERROR"));
  }).finally(() => setLoading(false)), [fetchMessages, lang]);
  useEffect(() => {
    const controller = new AbortController();
    const poll = () => {
      if (document.visibilityState !== "visible") return;
      void fetchMessages(undefined, controller.signal).then((page) => {
        if (controller.signal.aborted) return;
        setMessages((current) => mergeMessages(current, page.messages));
        setCursor((current) => current === undefined ? page.nextCursor : current);
        setError("");
        setLoading(false);
      }).catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(errorText(lang, failure instanceof Error ? failure.message : "SERVER_ERROR"));
        setLoading(false);
      });
    };
    poll();
    const timer = window.setInterval(poll, 15000);
    document.addEventListener("visibilitychange", poll);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", poll); };
  }, [fetchMessages, lang]);
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!attempt.current || attempt.current.text !== text) attempt.current = { text, id: crypto.randomUUID() };
    setSending(true); setError(""); setNotice("");
    try {
      const response = await api<{ message: OrderMessage }>(endpoint, {
        method: "POST", headers: token ? { "X-Order-Token": token } : {},
        body: JSON.stringify({ text, clientMessageId: attempt.current.id }),
      });
      setMessages((current) => mergeMessages(current, [response.message]));
      setDraft(""); attempt.current = null; setNotice(copy.sent);
    } catch (failure) {
      setError(errorText(lang, failure instanceof Error ? failure.message : "SERVER_ERROR"));
    } finally { setSending(false); }
  }
  return { lang, staff, copy, messages, cursor, draft, setDraft, loading, sending, error, notice, load, submit };
}
