'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, LogOut, KeyRound } from 'lucide-react';
import { ShopShell } from './shop-shell';
import { useShop } from './shop-context';
import { t, errorText, statusKey } from '@/lib/shop-copy';
import { api, send, type Order } from '@/lib/shop-api';
import { money } from '@/lib/catalog';
export function Account({ reset = false }: { reset?: boolean }) {
  const { lang, user, loading, refreshUser } = useShop();
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'forgot'>('signIn'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [orders, setOrders] = useState<Order[]>([]),
    [demo, setDemo] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    newEmail: '',
    emailPassword: '',
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  useEffect(() => {
    api('/status')
      .then((s) => setDemo(!!s.demo))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
      }));
      api('/orders')
        .then((r) => setOrders(r.orders))
        .catch((e) => setError(errorText(lang, e.message)));
    }
  }, [user, lang]);
  async function action(fn: () => Promise<void>) {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  async function auth(e: FormEvent) {
    e.preventDefault();
    await action(async () => {
      if (reset) {
        const token = new URLSearchParams(location.search).get('token');
        await send('/auth/reset-password', {
          token,
          newPassword: form.newPassword,
        });
        setNotice(t(lang, 'saved'));
        return;
      }
      const email =
        demo && form.email === 'admin' ? 'admin@local.invalid' : form.email;
      if (mode === 'forgot') {
        await send('/auth/request-password-reset', {
          email,
          redirectTo: location.origin + '/account/reset',
        });
        setNotice(t(lang, 'resetSent'));
        return;
      }
      await send(
        '/auth/' + (mode === 'signUp' ? 'sign-up' : 'sign-in') + '/email',
        {
          email,
          password: form.password,
          ...(mode === 'signUp' ? { name: form.name } : {}),
        },
      );
      await refreshUser();
      const target = new URLSearchParams(location.search).get('return');
      if (target === '/checkout' || target === '/admin') location.href = target;
    });
  }
  if (loading)
    return (
      <ShopShell>
        <p>{t(lang, 'loading')}</p>
      </ShopShell>
    );
  if (!user || reset)
    return (
      <ShopShell>
        <div className="auth-layout">
          <div className="auth-intro">
            <span className="edition">SUSHI HH / ACCOUNT</span>
            <h1>{reset ? t(lang, 'changePassword') : t(lang, 'account')}</h1>
            <p>{t(lang, 'signInHint')}</p>
            <div className="account-mark">
              <KeyRound size={36} />
              <span>HH</span>
            </div>
          </div>
          <form className="shop-form auth-form" onSubmit={auth}>
            {!reset && (
              <div className="choice-row">
                {(['signIn', 'signUp'] as const).map((m) => (
                  <button
                    type="button"
                    key={m}
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      setError('');
                      setNotice('');
                    }}
                  >
                    {t(lang, m)}
                  </button>
                ))}
              </div>
            )}
            {!reset && mode === 'signUp' && (
              <label>
                {t(lang, 'name')}
                <input
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </label>
            )}
            {!reset && (
              <label>
                {t(lang, 'email')}
                {demo && mode === 'signIn' ? ' / admin' : ''}
                <input
                  type={demo && mode === 'signIn' ? 'text' : 'email'}
                  required
                  autoComplete="username"
                  maxLength={254}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </label>
            )}
            {!reset && mode !== 'forgot' && (
              <label>
                {t(lang, 'password')}
                <input
                  required
                  type="password"
                  autoComplete={
                    mode === 'signUp' ? 'new-password' : 'current-password'
                  }
                  minLength={mode === 'signUp' ? 12 : undefined}
                  maxLength={128}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                {mode === 'signUp' && <small>{t(lang, 'passwordHint')}</small>}
              </label>
            )}
            {reset && (
              <label>
                {t(lang, 'newPassword')}
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  value={form.newPassword}
                  onChange={(e) => set('newPassword', e.target.value)}
                />
                <small>{t(lang, 'passwordHint')}</small>
              </label>
            )}
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
            <button className="shop-primary" disabled={busy}>
              {busy
                ? t(lang, 'saving')
                : reset
                  ? t(lang, 'save')
                  : mode === 'forgot'
                    ? t(lang, 'reset')
                    : t(lang, mode)}
              <ArrowUpRight size={18} />
            </button>
            {!reset && (
              <button
                type="button"
                className="text-button"
                onClick={() => setMode(mode === 'forgot' ? 'signIn' : 'forgot')}
              >
                {mode === 'forgot' ? t(lang, 'signIn') : t(lang, 'forgot')}
              </button>
            )}
            {reset && <a href="/account">{t(lang, 'signIn')} ↗</a>}
            {demo && (
              <p className="notice" dir="ltr">
                LOCAL PREVIEW · admin / admin
              </p>
            )}
          </form>
        </div>
      </ShopShell>
    );
  return (
    <ShopShell>
      <div className="page-heading heading-actions">
        <div>
          <span className="edition">ACCOUNT / HH</span>
          <h1>{user.name}</h1>
        </div>
        <div>
          {user.admin && (
            <a className="shop-primary" href="/admin">
              {t(lang, 'admin')} ↗
            </a>
          )}
          <button
            className="shop-secondary"
            onClick={() =>
              action(async () => {
                await send('/auth/sign-out', {});
                await refreshUser();
              })
            }
          >
            <LogOut size={16} />
            {t(lang, 'signOut')}
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="account-layout">
        <section>
          <h2>{t(lang, 'orders')}</h2>
          {!orders.length ? (
            <div className="shop-empty">
              <p>{t(lang, 'noOrders')}</p>
              <a href="/">{t(lang, 'menu')} ↗</a>
            </div>
          ) : (
            orders.map((o) => (
              <a key={o.id} className="order-card" href={`/order?id=${o.id}`}>
                <div>
                  <b>
                    {o.date} · {o.time}
                  </b>
                  <span className={`status-badge status-${o.status}`}>
                    {t(lang, statusKey(o.status))}
                  </span>
                </div>
                <p>
                  {o.items
                    .map((i) => `${i.quantity} × ${i.name[lang]}`)
                    .join(' · ')}
                </p>
                <div>
                  <small>#{o.id.slice(0, 8).toUpperCase()}</small>
                  <strong>
                    {o.total === null ? t(lang, 'pending') : money(o.total)}{' '}
                    <ArrowUpRight size={16} />
                  </strong>
                </div>
              </a>
            ))
          )}
        </section>
        <aside>
          <form
            className="shop-form panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await send(
                  '/me',
                  {
                    name: form.name,
                    phone: form.phone,
                    address: form.address,
                    language: lang,
                  },
                  'PATCH',
                );
                await refreshUser();
                setNotice(t(lang, 'saved'));
              });
            }}
          >
            <h2>{t(lang, 'profile')}</h2>
            {(['name', 'phone', 'address'] as const).map((k) => (
              <label key={k}>
                {t(lang, k)}
                <input
                  required={k === 'name'}
                  autoComplete={
                    k === 'phone'
                      ? 'tel'
                      : k === 'address'
                        ? 'street-address'
                        : 'name'
                  }
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
            <label>
              {t(lang, 'email')}
              <input value={user.email} readOnly />
            </label>
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'save')}
            </button>
          </form>
          <form
            className="shop-form panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await send('/me/email', {
                  email: form.newEmail,
                  password: form.emailPassword,
                });
                await refreshUser();
                setForm((f) => ({
                  ...f,
                  email: f.newEmail,
                  emailPassword: '',
                }));
                setNotice(t(lang, 'saved'));
              });
            }}
          >
            <h2>{t(lang, 'email')}</h2>
            <label>
              {t(lang, 'email')}
              <input
                type="email"
                required
                autoComplete="email"
                value={form.newEmail}
                onChange={(e) => set('newEmail', e.target.value)}
              />
            </label>
            <label>
              {t(lang, 'currentPassword')}
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.emailPassword}
                onChange={(e) => set('emailPassword', e.target.value)}
              />
            </label>
            <button className="shop-secondary" disabled={busy}>
              {t(lang, 'save')}
            </button>
          </form>
          <form
            className="shop-form panel"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await send('/auth/change-password', {
                  currentPassword: form.currentPassword,
                  newPassword: form.newPassword,
                  revokeOtherSessions: true,
                });
                setForm((f) => ({
                  ...f,
                  currentPassword: '',
                  newPassword: '',
                  newEmail: '',
                  emailPassword: '',
                }));
                setNotice(t(lang, 'saved'));
              });
            }}
          >
            <h2>{t(lang, 'changePassword')}</h2>
            <label>
              {t(lang, 'currentPassword')}
              <input
                required
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => set('currentPassword', e.target.value)}
              />
            </label>
            <label>
              {t(lang, 'newPassword')}
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                value={form.newPassword}
                onChange={(e) => set('newPassword', e.target.value)}
              />
              <small>{t(lang, 'passwordHint')}</small>
            </label>
            <button className="shop-secondary" disabled={busy}>
              {t(lang, 'changePassword')}
            </button>
          </form>
        </aside>
      </div>
    </ShopShell>
  );
}
