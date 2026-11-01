'use client';
import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import type { ShopSettings } from '@/lib/commerce';
import type { Campaign } from '@/lib/shop-types';
import type {
  PaymentConnection,
  ConnectionResponse,
  NewsletterResponse,
  MailRecord,
  EmailState,
  SubscriberCount,
} from './OperationsAdmin.types';
import { useShop } from '../shop-context';
import { api, send } from '@/lib/shop-api';
import { t, errorText } from '@/lib/shop-copy';

import { type DayHours } from '@/lib/operations';
import type { Language } from '@/lib/catalog';

export function useOperationsAdmin() {
  const { lang, settings, reload } = useShop(),
    [tab, setTab] = useState<'hours' | 'payments' | 'newsletter' | 'documents'>(
      'hours',
    ),
    [editedDraft, setEditedDraft] = useState<{
      base: ShopSettings;
      value: ShopSettings;
    } | null>(null),
    [connections, setConnections] = useState<PaymentConnection[]>([]),
    [fields, setFields] = useState<Record<string, Record<string, string>>>({}),
    [date, setDate] = useState(''),
    [busy, setBusy] = useState(false),
    [errorCode, setError] = useState(''),
    [noticeKey, setNotice] = useState<'' | 'saved'>(''),
    [campaigns, setCampaigns] = useState<Campaign[]>([]),
    [campaign, setCampaign] = useState<Campaign>(() => ({
      subject: { de: '', uk: '', en: '', fa: '' },
      text: { de: '', uk: '', en: '', fa: '' },
      repeat: 'weekly',
      active: false,
      nextSendAt: Date.now() + 86400000,
    })),
    [language, setLanguage] = useState<Language>(lang),
    [messages, setMessages] = useState<MailRecord[]>([]),
    [preview, setPreview] = useState(''),
    [email, setEmail] = useState({ apiKey: '', from: '' }),
    [emailState, setEmailState] = useState<EmailState>({}),
    [stats, setStats] = useState<SubscriberCount[]>([]);
  const draft = editedDraft?.base === settings ? editedDraft.value : settings;
  function setDraft(update: SetStateAction<ShopSettings>) {
    setEditedDraft((previous) => ({
      base: settings,
      value:
        typeof update === 'function'
          ? update(previous?.base === settings ? previous.value : settings)
          : update,
    }));
  }
  const applyData = useCallback(
    ([p, n, m, e]: [
      ConnectionResponse,
      NewsletterResponse,
      { messages: MailRecord[] },
      EmailState,
    ]) => {
      setConnections(
        p.providers.map((provider) => ({
          ...provider,
          configured: p.methods[provider.provider],
        })),
      );
      setCampaigns(n.campaigns);
      setStats(n.subscribers);
      setMessages(m.messages);
      setEmailState(e);
      setEmail((value) => ({ ...value, from: e.from || '' }));
    },
    [],
  );
  const refresh = useCallback(async () => {
    applyData(await fetchOperations());
  }, [applyData]);
  useEffect(() => {
    let active = true;
    void fetchOperations()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((error: unknown) => {
        if (active)
          setError(error instanceof Error ? error.message : 'SERVER_ERROR');
      });
    return () => {
      active = false;
    };
  }, [applyData]);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice('saved');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "SERVER_ERROR");
    } finally {
      setBusy(false);
    }
  }
  const save = () =>
    run(async () => {
      await send('/admin/settings', draft);
      await reload();
    });
  const updateDay = (key: number | string, h: DayHours) =>
    setDraft((d) => ({
      ...d,
      schedule:
        typeof key === 'number'
          ? {
              ...d.schedule,
              weekly: d.schedule.weekly.map((v, i) => (i === key ? h : v)),
            }
          : {
              ...d.schedule,
              exceptions: { ...d.schedule.exceptions, [key]: h },
            },
    }));

  return {
    lang,
    tab,
    setTab,
    draft,
    setDraft,
    connections,
    fields,
    setFields,
    date,
    setDate,
    busy,
    error: errorCode ? errorText(lang, errorCode) : "",
    notice: noticeKey ? t(lang, noticeKey) : "",
    campaigns,
    campaign,
    setCampaign,
    language,
    setLanguage,
    messages,
    preview,
    setPreview,
    email,
    setEmail,
    emailState,
    stats,
    run,
    save,
    updateDay,
  };
}

function fetchOperations() {
  return Promise.all([
    api<ConnectionResponse>('/admin/connections'),
    api<NewsletterResponse>('/admin/newsletter'),
    api<{ messages: MailRecord[] }>('/admin/mail'),
    api<EmailState>('/admin/email'),
  ]);
}
