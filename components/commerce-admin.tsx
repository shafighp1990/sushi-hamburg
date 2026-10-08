'use client';
import { useEffect, useState } from 'react';
import { useShop } from './shop-context';
import { ProductGallery } from './product-gallery';
import { ProductPhoto } from './product-photo';
import { ct } from '@/lib/commerce-copy';
import { t, errorText, languages } from '@/lib/shop-copy';
import { money, type Language } from '@/lib/catalog';
import type { ShopSettings, Coupon } from '@/lib/commerce';
import { api, send, type Order } from '@/lib/shop-api';
const newCoupon = (): Coupon => ({
  code: '',
  type: 'percent',
  amount: 10,
  startsOn: '',
  endsOn: '',
  minSubtotal: 0,
  usageLimit: 0,
  perCustomerLimit: 0,
  customerId: '',
  productIds: [],
  active: true,
  version: 0,
});
export function CommerceAdmin({ customers }: { customers: any[] }) {
  const { lang, settings, reload, products } = useShop(),
    [section, setSection] = useState('appearance'),
    [draft, setDraft] = useState<ShopSettings>(settings),
    [language, setLanguage] = useState<Language>(lang),
    [coupons, setCoupons] = useState<any[]>([]),
    [coupon, setCoupon] = useState<Coupon | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState<(Order & { paymentState?: string })[]>([]),
    [from, setFrom] = useState(new Date().toISOString().slice(0, 7) + '-01'),
    [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  useEffect(() => setDraft(settings), [settings]);
  useEffect(() => {
    api('/admin/coupons')
      .then((r) => setCoupons(r.coupons))
      .catch((e) => setError(errorText(lang, e.message)));
  }, []);
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
    const r = await api(
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
  return (
    <section className="commerce-admin">
      <nav className="commerce-tabs">
        {(
          ['appearance', 'offers', 'discounts', 'settings', 'reports'] as const
        ).map((k) => (
          <button
            key={k}
            aria-pressed={section === k}
            onClick={() => {
              setSection(k);
              setNotice('');
              setError('');
            }}
          >
            {ct(lang, k)}
          </button>
        ))}
      </nav>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {['appearance', 'offers', 'settings'].includes(section) && (
        <form
          className="shop-form"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await send('/admin/settings', draft);
              await reload();
            });
          }}
        >
          {section === 'appearance' && (
            <>
              <h2>{ct(lang, 'buttonStyle')}</h2>
              <div className="style-options">
                {(['solid', 'outline', 'rounded', 'ticket'] as const).map(
                  (style) => (
                    <button
                      type="button"
                      className={`style-example example-${style}`}
                      key={style}
                      aria-pressed={draft.buttonStyle === style}
                      onClick={() => setting('buttonStyle', style)}
                    >
                      <span>{ct(lang, style)}</span> ↗
                    </button>
                  ),
                )}
              </div>
              <h2>{ct(lang, 'galleryStyle')}</h2>
              <div className="choice-row">
                {(['carousel', 'editorial', 'tiles', 'focus'] as const).map(
                  (style) => (
                    <button
                      type="button"
                      key={style}
                      aria-pressed={draft.galleryStyle === style}
                      onClick={() => setting('galleryStyle', style)}
                    >
                      {ct(lang, style)}
                    </button>
                  ),
                )}
              </div>
              <div className="appearance-preview">
                <small>{ct(lang, 'preview')}</small>
                {preview && (
                  <ProductGallery
                    product={preview}
                    style={draft.galleryStyle}
                  />
                )}
              </div>
            </>
          )}
          {section === 'offers' && (
            <>
              <h2>{ct(lang, 'offerSection')}</h2>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={draft.offer.active}
                  onChange={(e) =>
                    setting('offer', {
                      ...draft.offer,
                      active: e.target.checked,
                    })
                  }
                />
                {ct(lang, 'enabled')}
              </label>
              <div className="shop-language">
                {languages.map((l) => (
                  <button
                    type="button"
                    key={l}
                    aria-pressed={l === language}
                    onClick={() => setLanguage(l)}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
              <label>
                {ct(lang, 'offerTitle')}
                <input
                  maxLength={100}
                  value={draft.offer.title[language]}
                  onChange={(e) =>
                    setting('offer', {
                      ...draft.offer,
                      title: {
                        ...draft.offer.title,
                        [language]: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <label>
                {ct(lang, 'offerDescription')}
                <textarea
                  maxLength={400}
                  value={draft.offer.description[language]}
                  onChange={(e) =>
                    setting('offer', {
                      ...draft.offer,
                      description: {
                        ...draft.offer.description,
                        [language]: e.target.value,
                      },
                    })
                  }
                />
              </label>
              <p className="muted">{ct(lang, 'allLanguages')}</p>
              <label>
                {ct(lang, 'code')}
                <select
                  value={draft.offer.couponCode}
                  onChange={(e) =>
                    setting('offer', {
                      ...draft.offer,
                      couponCode: e.target.value,
                    })
                  }
                >
                  <option value="">—</option>
                  {coupons
                    .filter((c) => c.active && !c.customerId)
                    .map((c) => (
                      <option key={c.code}>{c.code}</option>
                    ))}
                </select>
              </label>
              <fieldset>
                <legend>{ct(lang, 'featuredProducts')}</legend>
                <div className="product-checks">
                  {products.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={draft.offer.productIds.includes(p.id)}
                        onChange={(e) =>
                          setting('offer', {
                            ...draft.offer,
                            productIds: e.target.checked
                              ? [...draft.offer.productIds, p.id]
                              : draft.offer.productIds.filter(
                                  (id) => id !== p.id,
                                ),
                          })
                        }
                      />
                      {p.name[lang]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {section === 'settings' && (
            <>
              <h2>{ct(lang, 'settings')}</h2>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={draft.shopOpen}
                  onChange={(e) => setting('shopOpen', e.target.checked)}
                />
                {ct(lang, 'shopOpen')}
              </label>
              <label>
                {ct(lang, 'taxMode')}
                <select
                  aria-label={ct(lang, 'taxMode')}
                  value={draft.taxMode}
                  onChange={(e) =>
                    setting(
                      'taxMode',
                      e.target.value as ShopSettings['taxMode'],
                    )
                  }
                >
                  <option value="unset">{ct(lang, 'taxUnset')}</option>
                  <option value="regular">{ct(lang, 'taxRegular')}</option>
                  <option value="small_business">
                    {ct(lang, 'taxSmallBusiness')}
                  </option>
                </select>
              </label>
              <p className="notice">
                {ct(
                  lang,
                  draft.taxMode === 'small_business'
                    ? 'smallBusinessNotice'
                    : draft.taxMode === 'unset'
                      ? 'taxPending'
                      : 'notTaxPayable',
                )}
              </p>
              <a
                href="https://www.gesetze-im-internet.de/ustg_1980/__12.html"
                target="_blank"
                rel="noreferrer"
              >
                UStG § 12 ↗
              </a>
              <a
                href="https://www.gesetze-im-internet.de/ustg_1980/__19.html"
                target="_blank"
                rel="noreferrer"
              >
                UStG § 19 ↗
              </a>
              <label>
                {ct(lang, 'deliverySettings')}
                <select
                  value={draft.deliveryMode}
                  onChange={(e) =>
                    setting(
                      'deliveryMode',
                      e.target.value as ShopSettings['deliveryMode'],
                    )
                  }
                >
                  <option value="quote">{ct(lang, 'deliveryQuoteMode')}</option>
                  <option value="zones">{ct(lang, 'deliveryZoneMode')}</option>
                </select>
              </label>
              <p className="muted">{ct(lang, 'hamburgOnly')}</p>
            </>
          )}
          <button className="shop-primary" disabled={busy}>
            {ct(lang, 'saveSettings')}
          </button>
        </form>
      )}
      {section === 'discounts' && (
        <>
          <div className="heading-actions">
            <h2>{ct(lang, 'discounts')}</h2>
            <button
              className="shop-primary"
              onClick={() => setCoupon(newCoupon())}
            >
              {ct(lang, 'addDiscount')} ＋
            </button>
          </div>
          <p>{ct(lang, 'discountsHint')}</p>
          <div className="coupon-list">
            {coupons.map((c) => (
              <button
                key={c.code}
                className="coupon-card"
                onClick={() => setCoupon({ ...c })}
              >
                <b>
                  {c.code} {c.active ? '●' : '○'}
                </b>
                <strong>
                  {c.type === 'percent' ? `${c.amount}%` : money(c.amount)}
                </strong>
                <span>
                  {c.used} / {c.usageLimit || '∞'}
                </span>
                <small>{c.endsOn || '—'}</small>
              </button>
            ))}
          </div>
          {coupon && (
            <form
              className="shop-form coupon-editor"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await send('/admin/coupons', coupon);
                  setCoupons((await api('/admin/coupons')).coupons);
                  setCoupon(null);
                });
              }}
            >
              <h3>{coupon.code || ct(lang, 'addDiscount')}</h3>
              <div className="form-grid">
                <label>
                  {ct(lang, 'code')}
                  <input
                    required
                    pattern="[A-Za-z0-9][A-Za-z0-9-]{2,31}"
                    maxLength={32}
                    readOnly={coupon.version > 0}
                    value={coupon.code}
                    onChange={(e) =>
                      setCoupon({
                        ...coupon,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label>
                  {ct(lang, 'discount')}
                  <select
                    value={coupon.type}
                    onChange={(e) =>
                      setCoupon({
                        ...coupon,
                        type: e.target.value as Coupon['type'],
                        amount: 10,
                      })
                    }
                  >
                    <option value="percent">{ct(lang, 'percent')}</option>
                    <option value="fixed">{ct(lang, 'fixed')}</option>
                  </select>
                </label>
                <label>
                  {ct(lang, 'amount')} {coupon.type === 'percent' ? '%' : '€'}
                  <input
                    required
                    type="number"
                    min={coupon.type === 'percent' ? 1 : 0.01}
                    max={coupon.type === 'percent' ? 100 : 1000}
                    step={coupon.type === 'percent' ? 1 : 0.01}
                    value={
                      coupon.type === 'percent'
                        ? coupon.amount
                        : coupon.amount / 100
                    }
                    onChange={(e) =>
                      setCoupon({
                        ...coupon,
                        amount: Math.round(
                          Number(e.target.value) *
                            (coupon.type === 'percent' ? 1 : 100),
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  {ct(lang, 'minSubtotal')} €
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={coupon.minSubtotal / 100}
                    onChange={(e) =>
                      setCoupon({
                        ...coupon,
                        minSubtotal: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
                {(['startsOn', 'endsOn'] as const).map((k) => (
                  <label key={k}>
                    {ct(lang, k)}
                    <input
                      type="date"
                      value={coupon[k]}
                      onChange={(e) =>
                        setCoupon({ ...coupon, [k]: e.target.value })
                      }
                    />
                  </label>
                ))}
                {(['usageLimit', 'perCustomerLimit'] as const).map((k) => (
                  <label key={k}>
                    {ct(lang, k)} · 0 = ∞
                    <input
                      type="number"
                      min="0"
                      max="100000"
                      value={coupon[k]}
                      onChange={(e) =>
                        setCoupon({ ...coupon, [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <label className="span-two">
                  {ct(lang, 'customerOnly')}
                  <select
                    value={coupon.customerId}
                    onChange={(e) =>
                      setCoupon({ ...coupon, customerId: e.target.value })
                    }
                  >
                    <option value="">{ct(lang, 'allCustomers')}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="muted">{ct(lang, 'privateDiscountHint')}</p>
              <fieldset>
                <legend>{ct(lang, 'offerApplies')}</legend>
                <div className="product-checks">
                  {products.map((p) => (
                    <label key={p.id}>
                      <input
                        type="checkbox"
                        checked={coupon.productIds.includes(p.id)}
                        onChange={(e) =>
                          setCoupon({
                            ...coupon,
                            productIds: e.target.checked
                              ? [...coupon.productIds, p.id]
                              : coupon.productIds.filter((id) => id !== p.id),
                          })
                        }
                      />
                      {p.name[lang]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={coupon.active}
                  onChange={(e) =>
                    setCoupon({ ...coupon, active: e.target.checked })
                  }
                />
                {ct(lang, 'enabled')}
              </label>
              <div className="choice-row">
                <button className="shop-primary" disabled={busy}>
                  {t(lang, 'save')}
                </button>
                <button
                  type="button"
                  className="shop-secondary"
                  onClick={() => setCoupon(null)}
                >
                  {t(lang, 'cancel')}
                </button>
              </div>
            </form>
          )}
        </>
      )}
      {section === 'reports' && (
        <>
          <h2>{ct(lang, 'reports')}</h2>
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              run(report);
            }}
          >
            <label>
              {ct(lang, 'periodFrom')}
              <input
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              {ct(lang, 'periodTo')}
              <input
                type="date"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'refresh')}
            </button>
            <button
              type="button"
              className="shop-secondary"
              disabled={!orders.length}
              onClick={csv}
            >
              {ct(lang, 'downloadCsv')}
            </button>
          </form>
          <div className="admin-stats">
            <div>
              <span>{ct(lang, 'paidOrders')}</span>
              <strong>{paid.length}</strong>
            </div>
            <div>
              <span>{ct(lang, 'gross')}</span>
              <strong>
                {money(paid.reduce((s, o) => s + (o.total || 0), 0))}
              </strong>
            </div>
            <div>
              <span>{ct(lang, 'outputVat')}</span>
              <strong>{money(vat)}</strong>
            </div>
          </div>
          <p className="notice">{ct(lang, 'notTaxPayable')}</p>
          {paid.some((o) => !o.tax || o.tax.mode === 'unset') && (
            <p className="error">{ct(lang, 'taxPending')}</p>
          )}
          <div className="report-list">
            {orders.map((o) => (
              <a href={'/order?id=' + o.id} key={o.id}>
                <b>#{o.id.slice(0, 8)}</b>
                <span>
                  {o.paymentState === 'review_required'
                    ? ct(lang, 'paymentReview')
                    : o.tax?.mode === 'unset'
                      ? ct(lang, 'taxUnset')
                      : ct(lang, 'paidOrders')}
                </span>
                <strong>{money(o.total || 0)}</strong>
              </a>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
