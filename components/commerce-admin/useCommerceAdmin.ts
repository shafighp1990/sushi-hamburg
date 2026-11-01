'use client';
import { useEffect, useState, type SetStateAction } from 'react';
import type { CouponRecord } from '@/lib/shop-types';
import { useShop } from '../shop-context';
import { t, errorText } from '@/lib/shop-copy';
import { type Language } from '@/lib/catalog';
import type { ShopSettings, Coupon } from '@/lib/commerce';
import { api, type Order } from '@/lib/shop-api';
import type { CommerceAdminProps } from './commerce-admin.types';

export function useCommerceAdmin({ customers }: CommerceAdminProps) {
  const { lang, settings, reload, products } = useShop(),
    [section, setSection] = useState('appearance'),
    [editedDraft, setEditedDraft] = useState<{
      base: ShopSettings;
      value: ShopSettings;
    } | null>(null),
    [language, setLanguage] = useState<Language>(lang),
    [coupons, setCoupons] = useState<CouponRecord[]>([]),
    [coupon, setCoupon] = useState<Coupon | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState<(Order & { paymentState?: string })[]>([]),
    [from, setFrom] = useState(
      () => new Date().toISOString().slice(0, 7) + '-01',
    ),
    [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
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
  useEffect(() => {
    void api<{ coupons: CouponRecord[] }>('/admin/coupons')
      .then((r) => setCoupons(r.coupons))
      .catch((e) => setError(errorText(lang, e.message)));
  }, [lang]);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(t(lang, 'saved'));
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  function setting<K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) {
    setDraft((s) => ({ ...s, [k]: v }));
  }
  async function report() {
    // API bounds are UTC instants; the selected dates are Berlin calendar dates.
    const midnight = (d: string) => {
      const utc = Date.parse(d + 'T00:00:00Z');
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Berlin',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(utc));
      return utc - Number(parts) * 3600000;
    };
    const next = new Date(Date.parse(to + 'T12:00:00Z') + 86400000)
      .toISOString()
      .slice(0, 10);
    const r = await api<{ orders: (Order & { paymentState?: string })[] }>(
      `/admin/reports?from=${midnight(from)}&to=${midnight(next)}`,
    );
    setOrders(r.orders);
  }
  function csv() {
    const rows = [
      [
        'Order',
        'Paid at (Europe/Berlin)',
        'Status',
        'Payment review',
        'Tax mode',
        'Gross EUR',
        'Discount EUR',
        'Net EUR',
        'VAT EUR',
      ],
      ...orders.map((o) => [
        o.id,
        new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Berlin',
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(new Date(o.paidAt!)),
        o.status,
        o.paymentState === 'review_required' ? 'REVIEW' : '',
        o.tax?.mode || 'unset',
        o.total === null ? '' : (o.total / 100).toFixed(2),
        (o.discount / 100).toFixed(2),
        o.tax?.net == null ? '' : (o.tax.net / 100).toFixed(2),
        o.tax?.vat == null ? '' : (o.tax.vat / 100).toFixed(2),
      ]),
    ];
    const text =
        '\uFEFF' +
        rows
          .map((r) =>
            r
              .map(
                (c) =>
                  '"' +
                  String(c)
                    .replace(/^[=+@-]/, "'$&")
                    .replaceAll('"', '""') +
                  '"',
              )
              .join(';'),
          )
          .join('\r\n'),
      url = URL.createObjectURL(
        new Blob([text], { type: 'text/csv;charset=utf-8' }),
      );
    const a = document.createElement('a');
    a.href = url;
    a.download = `sushi-sales-${from}-${to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const paid = orders.filter((o) => o.paid && o.status !== 'cancelled'),
    vat = paid.reduce((s, o) => s + (o.tax?.vat || 0), 0),
    preview = products.find((p) => p.id === 'philadelphia') || products[0];
  return {
    customers,
    lang,
    settings,
    reload,
    products,
    section,
    setSection,
    draft,
    language,
    setLanguage,
    coupons,
    setCoupons,
    coupon,
    setCoupon,
    error,
    setError,
    notice,
    setNotice,
    busy,
    orders,
    from,
    setFrom,
    to,
    setTo,
    run,
    setting,
    report,
    csv,
    paid,
    vat,
    preview,
  };
}
