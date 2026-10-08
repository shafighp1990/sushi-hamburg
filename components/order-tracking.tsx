'use client';
import { ct } from '@/lib/commerce-copy';
import { TaxBreakdown } from './tax-breakdown';
import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, Check, Copy, RefreshCw, CreditCard } from 'lucide-react';
import { ShopShell } from './shop-shell';
import { useShop } from './shop-context';
import { api, type Order } from '@/lib/shop-api';
import { t, statusKey, errorText } from '@/lib/shop-copy';
import { money, TELEGRAM } from '@/lib/catalog';
export function OrderTracking() {
  const { lang } = useShop();
  const [order, setOrder] = useState<Order | null>(null),
    [events, setEvents] = useState<any[]>([]),
    [saved, setSaved] = useState<any[]>([]),
    [id, setId] = useState(''),
    [token, setToken] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search),
      id = params.get('id') || '';
    let token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
    try {
      const saved = JSON.parse(localStorage.getItem('sushi-orders') || '[]');
      setSaved(saved);
      if (!token) token = saved.find((s: any) => s.id === id)?.token || '';
      if (id && token) {
        localStorage.setItem(
          'sushi-orders',
          JSON.stringify(
            [
              { id, token, date: Date.now() },
              ...saved.filter((s: any) => s.id !== id),
            ].slice(0, 20),
          ),
        );
      }
    } catch {}
    setId(id);
    setToken(token);
  }, []);
  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api('/orders/' + encodeURIComponent(id), {
        headers: token ? { 'X-Order-Token': token } : {},
      });
      setOrder(r.order);
      setEvents(r.events);
      setError('');
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    }
  }, [id, token, lang]);
  useEffect(() => {
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  async function payment(action: 'start' | 'sync') {
    setBusy(true);
    setError('');
    try {
      const r = await api('/payments/' + action, {
        method: 'POST',
        headers: token ? { 'X-Order-Token': token } : {},
        body: JSON.stringify({ orderId: id }),
      });
      if (r.url) location.assign(r.url);
      else await load();
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      order &&
      new URLSearchParams(location.search).get('payment') === 'return' &&
      !order.paid &&
      order.payment !== 'cash_on_delivery'
    ) {
      history.replaceState(
        null,
        '',
        `/order?id=${id}${token ? '#token=' + token : ''}`,
      );
      payment('sync');
    }
  }, [order?.id]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/order?id=${id}${token ? '#token=' + token : ''}`,
      );
      setCopied(true);
    } catch {
      setError(t(lang, 'error'));
    }
  }
  return (
    <ShopShell>
      <div className="page-heading heading-actions">
        <div>
          <span className="edition">ORDER / HH</span>
          <h1>{t(lang, 'track')}</h1>
        </div>
        {id && (
          <button className="shop-secondary" onClick={load}>
            <RefreshCw size={16} />
            {t(lang, 'refresh')}
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!id ? (
        <div>
          <form
            className="tracking-search shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              location.href =
                '/order?id=' +
                encodeURIComponent(
                  new FormData(e.currentTarget).get('id') as string,
                );
            }}
          >
            <label>
              {t(lang, 'orderNumber')}
              <input name="id" required />
            </label>
            <button className="shop-primary">{t(lang, 'track')}</button>
          </form>
          <p className="muted">{t(lang, 'privateNote')}</p>
          {saved.map((s) => (
            <a
              className="order-card"
              href={`/order?id=${s.id}${s.token ? '#token=' + s.token : ''}`}
              key={s.id}
            >
              #{s.id.slice(0, 8).toUpperCase()}
              <ArrowUpRight size={18} />
            </a>
          ))}
          <a href="/account">{t(lang, 'account')} ↗</a>
        </div>
      ) : !order ? (
        <p>{!error && t(lang, 'loading')}</p>
      ) : (
        <>
          <div className="order-receipt">
            <div className="receipt-top">
              <span className="status-badge">
                {t(lang, statusKey(order.status))}
              </span>
              <b>#{order.id.slice(0, 8).toUpperCase()}</b>
            </div>
            <h2>
              {order.total === null
                ? t(lang, 'requestSent')
                : t(lang, 'orderReceived')}
            </h2>
            <p>
              {order.customer.name} · {order.date} / {order.time}
            </p>
            <div className="order-timeline">
              {[
                'new',
                'confirmed',
                'preparing',
                'out_for_delivery',
                'delivered',
              ].map((s, i) => {
                const active =
                  [
                    'new',
                    'confirmed',
                    'preparing',
                    'out_for_delivery',
                    'delivered',
                  ].indexOf(order.status) >= i;
                return (
                  <div key={s} className={active ? 'complete' : ''}>
                    <span>
                      {active ? (
                        <Check size={15} />
                      ) : (
                        String(i + 1).padStart(2, '0')
                      )}
                    </span>
                    <small>{t(lang, statusKey(s))}</small>
                  </div>
                );
              })}
            </div>
            {order.status === 'cancelled' && (
              <p className="error">{t(lang, 'cancelled')}</p>
            )}
            <div className="receipt-lines">
              {order.items.map((i) => (
                <div key={i.id}>
                  <span>
                    {i.quantity} × {i.name[lang]}
                  </span>
                  <b>{money(i.price * i.quantity)}</b>
                </div>
              ))}
              {order.discount > 0 && (
                <div>
                  <span>
                    {ct(lang, 'discount')} · {order.couponCode}
                  </span>
                  <b>−{money(order.discount)}</b>
                </div>
              )}
              <div>
                <span>{t(lang, 'fee')}</span>
                <b>
                  {order.delivery === null
                    ? t(lang, 'pending')
                    : money(order.delivery)}
                </b>
              </div>
              <div className="receipt-total">
                <strong>
                  {order.paid ? t(lang, 'paid') : t(lang, 'total')}
                </strong>
                <strong>
                  {order.total === null
                    ? t(lang, 'pending')
                    : money(order.total)}
                </strong>
              </div>
            </div>
            <TaxBreakdown tax={order.tax} />
            <button
              className="shop-secondary print-receipt"
              onClick={() => window.print()}
            >
              {ct(lang, 'receipt')} ↓
            </button>
            {order.total === null && (
              <p className="notice">{t(lang, 'deliveryQuote')}</p>
            )}
            {!order.paid &&
              order.payment !== 'cash_on_delivery' &&
              order.total !== null &&
              order.status !== 'cancelled' && (
                <div className="online-pay">
                  <p>
                    {order.payment === 'stripe'
                      ? 'Stripe · Visa / Mastercard'
                      : 'PayPal'}
                  </p>
                  <button
                    className="shop-primary"
                    disabled={busy}
                    onClick={() => payment('start')}
                  >
                    <CreditCard size={18} />
                    {busy
                      ? t(lang, 'loading')
                      : lang === 'fa'
                        ? 'پرداخت امن'
                        : lang === 'uk'
                          ? 'Безпечна оплата'
                          : lang === 'de'
                            ? 'Sicher bezahlen'
                            : 'Pay securely'}{' '}
                    · {money(order.total)}
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => payment('sync')}
                  >
                    {t(lang, 'refresh')}
                  </button>
                </div>
              )}
            <div className="receipt-address">
              <h3>{t(lang, 'delivery')}</h3>
              <p>
                {order.customer.address}
                <br />
                {order.customer.postcode} {order.customer.city}
                <br />
                {order.customer.phone}
                <br />
                {order.customer.email}
              </p>
              <p>
                {t(lang, 'utensils')}: {order.customer.utensils}
              </p>
              {order.customer.notes && <p>{order.customer.notes}</p>}
            </div>
            {token && (
              <>
                <button className="shop-secondary" onClick={copy}>
                  <Copy size={16} />
                  {copied ? t(lang, 'copied') : t(lang, 'privateLink')}
                </button>
                <p className="muted">{t(lang, 'privateNote')}</p>
              </>
            )}
            <a href={TELEGRAM} target="_blank" rel="noreferrer">
              {t(lang, 'contact')} ↗
            </a>
          </div>
          <section className="order-history">
            <h2>{t(lang, 'updated')}</h2>
            {events.map((e, i) => (
              <div key={i}>
                <time>
                  {new Intl.DateTimeFormat(lang, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                    timeZone: 'Europe/Berlin',
                  }).format(new Date(e.created_at))}
                </time>
                <span>{t(lang, statusKey(e.status))}</span>
                {e.note && <p>{e.note}</p>}
              </div>
            ))}
          </section>
        </>
      )}
    </ShopShell>
  );
}
