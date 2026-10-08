'use client';
import { ct } from '@/lib/commerce-copy';
import { TaxBreakdown } from './tax-breakdown';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  UserRound,
} from 'lucide-react';
import { ShopShell, Basket } from './shop-shell';
import { useShop } from './shop-context';
import {
  money,
  deliveryDates,
  deliveryFee,
  validateDelivery,
  TELEGRAM,
} from '@/lib/catalog';
import { t, errorText } from '@/lib/shop-copy';
import { api, send } from '@/lib/shop-api';
export function Checkout() {
  const {
    lang,
    user,
    products,
    cart,
    count,
    subtotal,
    clear,
    ready,
    loading,
    settings,
  } = useShop();
  const [mode, setMode] = useState('guest'),
    [dates, setDates] = useState<string[]>([]),
    [zone, setZone] = useState('unknown'),
    [payment, setPayment] = useState('cash_on_delivery'),
    [methods, setMethods] = useState({ stripe: false, paypal: false }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [coupon, setCoupon] = useState(''),
    [pricing, setPricing] = useState<any>(null),
    [quoteError, setQuoteError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: 'Hamburg',
    postcode: '',
    date: '',
    time: '18:00',
    utensils: '2',
    notes: '',
    accepted: false,
  });
  const attempt = useRef<{
    fingerprint: string;
    key: string;
    guestToken: string;
  } | null>(null);
  useEffect(() => {
    try {
      setCoupon(sessionStorage.getItem('sushi-coupon') || '');
    } catch {}
    const ds = deliveryDates();
    setDates(ds);
    setForm((f) => ({ ...f, date: ds[0] || '' }));
    api('/status')
      .then((s) => setMethods({ stripe: !!s.stripe, paypal: !!s.paypal }))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      setMode('member');
      setForm((f) => ({
        ...f,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      }));
    }
  }, [user]);
  useEffect(() => {
    let active = true;
    setPricing(null);
    setQuoteError('');
    if (!count) return;
    const timer = setTimeout(
      () =>
        send('/quote', {
          mode,
          couponCode: coupon,
          zone,
          items: products
            .filter((p) => cart[p.id])
            .map((p) => ({ id: p.id, quantity: cart[p.id], price: p.price })),
        })
          .then((r) => {
            if (active) setPricing(r);
          })
          .catch((e) => {
            if (active)
              setQuoteError(
                [
                  'INVALID_COUPON',
                  'COUPON_LOGIN_REQUIRED',
                  'COUPON_LIMIT',
                ].includes(e.message)
                  ? ct(
                      lang,
                      e.message === 'COUPON_LOGIN_REQUIRED'
                        ? 'couponLoginRequired'
                        : e.message === 'COUPON_LIMIT'
                          ? 'couponLimit'
                          : 'invalidCoupon',
                    )
                  : errorText(lang, e.message),
              );
          }),
      350,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cart, products, coupon, zone, mode, user?.id, settings, lang, count]);
  const fee = settings.deliveryMode === 'quote' ? null : deliveryFee(zone);
  const discount = pricing?.discount || 0;
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!ready) {
      setError(t(lang, 'unavailable'));
      return;
    }
    if (!validateDelivery(form.date, form.time)) {
      setError(errorText(lang, 'INVALID_DELIVERY'));
      setDates(deliveryDates());
      return;
    }
    if (mode === 'member' && !user) {
      location.href = '/account?return=/checkout';
      return;
    }
    setBusy(true);
    try {
      const data = {
        mode,
        language: lang,
        payment,
        couponCode: coupon,
        items: products
          .filter((p) => cart[p.id])
          .map((p) => ({ id: p.id, quantity: cart[p.id], price: p.price })),
        customer: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          postcode: form.postcode,
          notes: form.notes,
          utensils: Number(form.utensils),
        },
        date: form.date,
        time: form.time,
        zone,
        accepted: form.accepted,
      };
      if (Object.keys(cart).some((id) => !products.some((p) => p.id === id)))
        throw new Error('PRODUCT_UNAVAILABLE');
      const fingerprint = JSON.stringify(data);
      if (attempt.current?.fingerprint !== fingerprint)
        attempt.current = {
          fingerprint,
          key: crypto.randomUUID(),
          guestToken: Array.from(
            crypto.getRandomValues(new Uint8Array(32)),
            (n) => n.toString(16).padStart(2, '0'),
          ).join(''),
        };
      const { key, guestToken } = attempt.current;
      const result = await send('/orders', { ...data, key, guestToken });
      const id = result.order.id;
      try {
        const saved = JSON.parse(localStorage.getItem('sushi-orders') || '[]');
        localStorage.setItem(
          'sushi-orders',
          JSON.stringify(
            [
              {
                id,
                token: mode === 'guest' ? guestToken : null,
                date: Date.now(),
              },
              ...saved.filter((s: any) => s.id !== id),
            ].slice(0, 20),
          ),
        );
      } catch {}
      clear();
      location.href = `/order?id=${id}${mode === 'guest' ? '#token=' + guestToken : ''}`;
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ShopShell>
      <a className="shop-back" href="/">
        <ArrowLeft size={16} />
        {t(lang, 'continue')}
      </a>
      <div className="page-heading">
        <span className="edition">CHECKOUT / HH</span>
        <h1>{t(lang, 'checkout')}</h1>
      </div>
      {!count ? (
        <div className="shop-empty">
          <h2>{t(lang, 'empty')}</h2>
          <a className="shop-primary" href="/">
            {t(lang, 'menu')} ↗
          </a>
        </div>
      ) : (
        <div className="checkout-layout">
          <form className="shop-form" onSubmit={submit}>
            <fieldset className="checkout-mode">
              <legend>01 / {t(lang, 'account')}</legend>
              <div className="choice-row">
                <button
                  type="button"
                  aria-pressed={mode === 'guest'}
                  onClick={() => setMode('guest')}
                >
                  {t(lang, 'guest')}
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'member'}
                  onClick={() => setMode('member')}
                >
                  <UserRound size={16} />
                  {t(lang, 'member')}
                </button>
              </div>
              {mode === 'guest' ? (
                <p className="muted">{t(lang, 'guestNote')}</p>
              ) : user ? (
                <p>
                  {user.name} · {user.email}
                </p>
              ) : (
                <a className="shop-secondary" href="/account?return=/checkout">
                  {t(lang, 'signIn')} / {t(lang, 'signUp')} ↗
                </a>
              )}
            </fieldset>
            <fieldset>
              <legend>02 / {t(lang, 'delivery')}</legend>
              <div className="form-grid">
                <label>
                  {t(lang, 'name')}
                  <input
                    required
                    autoComplete="name"
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </label>
                <label>
                  {t(lang, 'email')}
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                  />
                </label>
                <label>
                  {t(lang, 'phone')}
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    maxLength={40}
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </label>
                {settings.deliveryMode === 'zones' && (
                  <label>
                    {t(lang, 'zone')}
                    <select
                      aria-label={t(lang, 'zone')}
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    >
                      <option value="unknown">{t(lang, 'zoneUnknown')}</option>
                      <option value="A">A · 6 €</option>
                      <option value="B">B · 9 €</option>
                      {['C', 'D', 'E'].map((z) => (
                        <option value={z} key={z}>
                          {z} · 0,70 € / km
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {ct(lang, 'city')}
                  <input readOnly value={form.city} />
                </label>
                <label>
                  {ct(lang, 'postcode')}
                  <input
                    required
                    inputMode="numeric"
                    pattern="[0-9]{5}"
                    maxLength={5}
                    autoComplete="postal-code"
                    value={form.postcode}
                    onChange={(e) => set('postcode', e.target.value)}
                  />
                </label>
                <label className="span-two">
                  {t(lang, 'address')}
                  <input
                    required
                    autoComplete="street-address"
                    maxLength={500}
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                  />
                </label>
                <label>
                  {t(lang, 'date')}
                  <select
                    aria-label={t(lang, 'date')}
                    required
                    value={form.date}
                    onChange={(e) => set('date', e.target.value)}
                  >
                    {dates.map((d) => (
                      <option key={d} value={d}>
                        {new Intl.DateTimeFormat(lang, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          timeZone: 'Europe/Berlin',
                        }).format(new Date(d + 'T12:00:00Z'))}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t(lang, 'time')}
                  <input
                    required
                    type="time"
                    max="21:00"
                    value={form.time}
                    onChange={(e) => set('time', e.target.value)}
                  />
                </label>
                <label>
                  {t(lang, 'utensils')}
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={form.utensils}
                    onChange={(e) => set('utensils', e.target.value)}
                  />
                </label>
                <label className="span-two">
                  {t(lang, 'notes')}
                  <textarea
                    maxLength={1000}
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </label>
              </div>
              <p className="muted">{ct(lang, 'hamburgOnly')}</p>
            </fieldset>
            <fieldset>
              <legend>03 / {t(lang, 'payment')}</legend>
              <div className="payment-choices">
                {[
                  ['cash_on_delivery', t(lang, 'payment'), true],
                  ['stripe', t(lang, 'card') + ' · Stripe', methods.stripe],
                  ['paypal', 'PayPal', methods.paypal],
                ].map(([id, label, enabled]) => (
                  <label
                    className={!enabled ? 'payment-disabled' : ''}
                    key={String(id)}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={String(id)}
                      checked={payment === id}
                      disabled={!enabled}
                      onChange={() => setPayment(String(id))}
                    />
                    <span>
                      <b>{String(label)}</b>
                      {!enabled && (
                        <small>
                          {lang === 'fa'
                            ? 'پس از اتصال حساب فروشگاه'
                            : lang === 'uk'
                              ? 'Після підключення рахунку'
                              : lang === 'de'
                                ? 'Nach Kontoverbindung verfügbar'
                                : 'Available after account connection'}
                        </small>
                      )}
                    </span>
                    <CreditCard size={20} />
                  </label>
                ))}
              </div>
              <p className="muted">{t(lang, 'paymentNote')}</p>
              {fee === null && (
                <p className="notice">{t(lang, 'deliveryQuote')}</p>
              )}
            </fieldset>
            <fieldset>
              <legend>{ct(lang, 'discounts')}</legend>
              <label>
                {ct(lang, 'code')}
                <input
                  value={coupon}
                  maxLength={32}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                />
              </label>
              {quoteError && (
                <p className="error" role="alert">
                  {quoteError}
                </p>
              )}
              {discount > 0 && (
                <p className="notice">
                  {ct(lang, 'discountPreview')} −{money(discount)}
                </p>
              )}
            </fieldset>
            <div className="checkout-summary">
              <div>
                <span>{t(lang, 'subtotal')}</span>
                <b>{money(subtotal)}</b>
              </div>
              {discount > 0 && (
                <div>
                  <span>{ct(lang, 'discount')}</span>
                  <b>−{money(discount)}</b>
                </div>
              )}
              <div>
                <span>{t(lang, 'fee')}</span>
                <b>{fee === null ? t(lang, 'pending') : money(fee)}</b>
              </div>
              <div>
                <strong>{t(lang, 'total')}</strong>
                <strong>
                  {fee === null
                    ? `${money(subtotal - discount)} + ${t(lang, 'pending')}`
                    : money(subtotal - discount + fee)}
                </strong>
              </div>
            </div>
            <TaxBreakdown tax={pricing?.tax} />
            <label className="checkbox-line">
              <input
                type="checkbox"
                required
                checked={form.accepted}
                onChange={(e) => set('accepted', e.target.checked)}
              />
              <span>
                {t(lang, 'consent')}{' '}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  {t(lang, 'privacy')} ↗
                </a>
              </span>
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {!loading && !ready && (
              <p className="error">
                {t(lang, 'unavailable')}{' '}
                <a href={TELEGRAM} target="_blank" rel="noreferrer">
                  {t(lang, 'contact')} ↗
                </a>
              </p>
            )}
            <button
              className="shop-primary full"
              disabled={
                busy ||
                loading ||
                !ready ||
                !pricing ||
                !!quoteError ||
                (mode === 'member' && !user)
              }
            >
              {busy
                ? t(lang, 'saving')
                : fee === null
                  ? t(lang, 'requestQuote')
                  : t(lang, 'placeOrder')}
              <ArrowUpRight size={20} />
            </button>
          </form>
          <aside>
            <Basket checkout={false} />
          </aside>
        </div>
      )}
    </ShopShell>
  );
}
