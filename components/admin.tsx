'use client';
import { CommerceAdmin } from './commerce-admin';
import { productPhotos } from './product-gallery';
import { ct } from '@/lib/commerce-copy';
import gallery from '@/lib/gallery.json';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Plus,
  Search,
  ArrowUpRight,
  ClipboardList,
  Users,
  Package,
  LayoutDashboard,
  X,
  Upload,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { ShopShell } from './shop-shell';
import { useShop } from './shop-context';
import { ProductPhoto } from './product-photo';
import { api, send, type Order } from '@/lib/shop-api';
import {
  t,
  languages,
  statusKey,
  errorText,
  type CopyKey,
} from '@/lib/shop-copy';
import { money, type Product, type Language } from '@/lib/catalog';
const emptyProduct = (): Product => ({
  id: '',
  category: 'signature',
  name: { de: '', uk: '', en: '', fa: '' },
  description: { de: '', uk: '', en: '', fa: '' },
  price: 900,
  poster: 'signature',
  crop: [0, 0, 1, 1],
  active: true,
  version: 0,
});
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} className="shop-dialog" onCancel={close}>
      <div className="dialog-heading">
        <h2>{title}</h2>
        <button type="button" onClick={close} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Admin() {
  const { lang, user, loading, reload } = useShop();
  const [tab, setTab] = useState('overview'),
    [stats, setStats] = useState<any>({}),
    [orders, setOrders] = useState<Order[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [customers, setCustomers] = useState<any[]>([]),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('all'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [editingProduct, setEditingProduct] = useState<Product | null>(null),
    [editingOrder, setEditingOrder] = useState<Order | null>(null),
    [editingCustomer, setEditingCustomer] = useState<any>(null),
    [invite, setInvite] = useState(false),
    [link, setLink] = useState(''),
    [productLang, setProductLang] = useState<Language>('de'),
    [uploadReady, setUploadReady] = useState(false);
  const load = useCallback(async () => {
    try {
      const [a, b, c, d] = await Promise.all([
        api('/admin/overview'),
        api('/admin/orders'),
        api('/admin/products'),
        api('/admin/customers'),
      ]);
      setStats(a);
      setOrders(b.orders);
      setProducts(c.products);
      setCustomers(d.customers);
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    }
  }, [lang]);
  useEffect(() => {
    api('/status')
      .then((s) => setUploadReady(!!s.upload))
      .catch(() => {});
    if (user?.admin) {
      load();
      const timer = setInterval(() => {
        if (document.visibilityState === 'visible') load();
      }, 30000);
      return () => clearInterval(timer);
    }
  }, [user?.admin, load]);
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      await load();
      await reload();
      setNotice(t(lang, 'saved'));
    } catch (e) {
      setError(errorText(lang, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }
  if (loading)
    return (
      <ShopShell>
        <p>{t(lang, 'loading')}</p>
      </ShopShell>
    );
  if (!user)
    return (
      <ShopShell>
        <div className="shop-empty">
          <h1>{t(lang, 'admin')}</h1>
          <a className="shop-primary" href="/account?return=/admin">
            {t(lang, 'signIn')}
            <ArrowUpRight size={18} />
          </a>
        </div>
      </ShopShell>
    );
  if (!user.admin)
    return (
      <ShopShell>
        <div className="shop-empty">
          <h1>{t(lang, 'admin')}</h1>
          <p>{t(lang, 'adminDenied')}</p>
          <a href="/account">{t(lang, 'account')} ↗</a>
        </div>
      </ShopShell>
    );
  const q = query.toLocaleLowerCase();
  const filteredOrders = orders.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      `${o.id} ${o.customer.name} ${o.customer.phone} ${o.customer.email}`
        .toLocaleLowerCase()
        .includes(q),
  );
  return (
    <ShopShell wide>
      <div className="page-heading heading-actions">
        <div>
          <span className="edition">RESTAURANT DESK / HH</span>
          <h1>{t(lang, 'admin')}</h1>
        </div>
        <button className="shop-secondary" onClick={load}>
          <RefreshCw size={16} />
          {t(lang, 'refresh')}
        </button>
      </div>
      <div className="admin-tabs">
        {[
          ['overview', LayoutDashboard],
          ['orders', ClipboardList],
          ['products', Package],
          ['customers', Users],
        ].map(([key, Icon]: any) => (
          <button
            key={key}
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setQuery('');
            }}
          >
            <Icon size={18} />
            {t(lang, key)}
          </button>
        ))}
        <button
          aria-pressed={tab === 'commerce'}
          onClick={() => setTab('commerce')}
        >
          {ct(lang, 'offers')} / {ct(lang, 'settings')}
        </button>
      </div>
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
      {tab === 'commerce' ? (
        <CommerceAdmin customers={customers} />
      ) : tab === 'overview' ? (
        <>
          <div className="admin-stats">
            <button onClick={() => setTab('orders')}>
              <span>{t(lang, 'orders')}</span>
              <strong>{stats.orders || 0}</strong>
            </button>
            <button
              onClick={() => {
                setTab('orders');
                setStatus('new');
              }}
            >
              <span>{t(lang, 'pendingOrders')}</span>
              <strong>{stats.pending || 0}</strong>
            </button>
            <div>
              <span>{t(lang, 'revenue')}</span>
              <strong>{money(stats.revenue || 0)}</strong>
            </div>
            <button onClick={() => setTab('customers')}>
              <span>{t(lang, 'customers')}</span>
              <strong>{customers.length}</strong>
            </button>
          </div>
          <h2>{t(lang, 'pendingOrders')}</h2>
          <div className="admin-order-grid">
            {orders
              .filter((o) => !['cancelled', 'delivered'].includes(o.status))
              .slice(0, 12)
              .map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onClick={() => setEditingOrder({ ...o })}
                />
              ))}
          </div>
        </>
      ) : (
        <>
          <div className="admin-toolbar">
            <label className="search-box">
              <Search size={17} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(lang, tab as CopyKey)}
                aria-label={t(lang, 'search')}
              />
            </label>
            {tab === 'orders' && (
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label={t(lang, 'status')}
              >
                {[
                  'all',
                  'new',
                  'confirmed',
                  'preparing',
                  'out_for_delivery',
                  'delivered',
                  'cancelled',
                ].map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? t(lang, 'all') : t(lang, statusKey(s))}
                  </option>
                ))}
              </select>
            )}
            {tab === 'products' && (
              <button
                className="shop-primary"
                onClick={() => {
                  setEditingProduct(emptyProduct());
                  setProductLang('de');
                }}
              >
                <Plus size={17} />
                {t(lang, 'addProduct')}
              </button>
            )}
            {tab === 'customers' && (
              <button className="shop-primary" onClick={() => setInvite(true)}>
                <Plus size={17} />
                {t(lang, 'addCustomer')}
              </button>
            )}
          </div>
          {tab === 'orders' && (
            <div className="admin-order-grid">
              {filteredOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  onClick={() => setEditingOrder({ ...o })}
                />
              ))}
            </div>
          )}
          {tab === 'products' && (
            <div className="admin-product-list">
              {products
                .filter((p) =>
                  `${p.id} ${p.name[lang]}`.toLocaleLowerCase().includes(q),
                )
                .map((p) => (
                  <div
                    key={p.id}
                    className={p.active === false ? 'inactive' : ''}
                  >
                    <ProductPhoto product={p} lang={lang} />
                    <span>
                      <b>{p.name[lang]}</b>
                      <small>
                        {t(lang, p.category)} · {p.active === false ? '○' : '●'}
                      </small>
                    </span>
                    <strong>{money(p.price)}</strong>
                    <button
                      className="shop-secondary"
                      onClick={() =>
                        setEditingProduct({
                          ...JSON.parse(JSON.stringify(p)),
                          images: productPhotos(p),
                        })
                      }
                    >
                      {t(lang, 'edit')}
                    </button>
                  </div>
                ))}
            </div>
          )}
          {tab === 'customers' && (
            <>
              <p className="muted">{t(lang, 'noPassword')}</p>
              <div className="customer-list">
                {customers
                  .filter((c) =>
                    `${c.name} ${c.email} ${c.phone || ''}`
                      .toLocaleLowerCase()
                      .includes(q),
                  )
                  .map((c) => (
                    <div key={c.id}>
                      <span className="customer-avatar">
                        {c.name.slice(0, 1).toUpperCase()}
                      </span>
                      <span>
                        <b>
                          {c.name} {c.disabled ? '○' : ''}
                        </b>
                        <small dir="ltr">{c.email}</small>
                        <small>{c.phone}</small>
                      </span>
                      <span>
                        {c.orders} {t(lang, 'orders')}
                      </span>
                      <button
                        className="shop-secondary"
                        onClick={() => setEditingCustomer({ ...c })}
                      >
                        {t(lang, 'edit')}
                      </button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      {editingProduct && (
        <Modal
          title={editingProduct.id ? t(lang, 'edit') : t(lang, 'addProduct')}
          close={() => setEditingProduct(null)}
        >
          <form
            className="shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await send('/admin/products', editingProduct);
                setEditingProduct(null);
              });
            }}
          >
            <label>
              ID
              <input
                value={editingProduct.id}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                readOnly={products.some((p) => p.id === editingProduct.id)}
                onChange={(e) =>
                  setEditingProduct((p) => ({ ...p!, id: e.target.value }))
                }
              />
            </label>
            <div className="form-grid">
              <label>
                {t(lang, 'category')}
                <select
                  value={editingProduct.category}
                  onChange={(e) =>
                    setEditingProduct((p) => ({
                      ...p!,
                      category: e.target.value as Product['category'],
                    }))
                  }
                >
                  {['signature', 'sets', 'new', 'classics', 'maki'].map((c) => (
                    <option key={c} value={c}>
                      {t(lang, c as CopyKey)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t(lang, 'price')}
                <input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  max="1000"
                  value={editingProduct.price / 100}
                  onChange={(e) =>
                    setEditingProduct((p) => ({
                      ...p!,
                      price: Math.round(Number(e.target.value) * 100),
                    }))
                  }
                />
              </label>
              <label>
                {t(lang, 'weight')}
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={editingProduct.weight || ''}
                  onChange={(e) =>
                    setEditingProduct((p) => ({
                      ...p!,
                      weight: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </label>
            </div>
            <div className="shop-language">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={productLang === l}
                  onClick={() => setProductLang(l)}
                >
                  {l === 'uk' ? 'UA' : l === 'fa' ? 'فارسی' : l.toUpperCase()}
                </button>
              ))}
            </div>
            {languages.map((l) => (
              <div
                key={l}
                hidden={productLang !== l}
                dir={l === 'fa' ? 'rtl' : 'ltr'}
              >
                <label>
                  {t(l, 'productName')}
                  <input
                    required={productLang === l}
                    value={editingProduct.name[l]}
                    onChange={(e) =>
                      setEditingProduct((p) => ({
                        ...p!,
                        name: { ...p!.name, [l]: e.target.value },
                      }))
                    }
                  />
                </label>
                <label>
                  {t(l, 'description')}
                  <textarea
                    rows={4}
                    required={productLang === l}
                    value={editingProduct.description[l]}
                    onChange={(e) =>
                      setEditingProduct((p) => ({
                        ...p!,
                        description: { ...p!.description, [l]: e.target.value },
                      }))
                    }
                  />
                </label>
              </div>
            ))}
            <p className="muted">DE / UA / EN / FA</p>
            <ProductPhoto product={editingProduct} lang={lang} />
            <label>
              {ct(lang, 'taxRate')}
              <select
                value={editingProduct.taxRate ?? 700}
                onChange={(e) =>
                  setEditingProduct((p) => ({
                    ...p!,
                    taxRate: Number(e.target.value),
                  }))
                }
              >
                <option value={700}>7%</option>
                <option value={1900}>19%</option>
              </select>
            </label>
            <h3>
              {ct(lang, 'photos')} · {(editingProduct.images || []).length}/5
            </h3>
            <div className="photo-editor">
              {(editingProduct.images || []).map((src, i) => (
                <div key={src}>
                  <img src={src} alt={String(i + 1)} />
                  <button
                    type="button"
                    className="shop-secondary"
                    onClick={() =>
                      setEditingProduct((p) => ({
                        ...p!,
                        image: src,
                        images: [src, ...p!.images!.filter((s) => s !== src)],
                      }))
                    }
                  >
                    {i === 0 ? '✓ ' : ''}
                    {ct(lang, 'primaryPhoto')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingProduct((p) => {
                        const images = p!.images!.filter((s) => s !== src);
                        return { ...p!, images, image: images[0] || '' };
                      })
                    }
                  >
                    {ct(lang, 'removePhoto')}
                  </button>
                </div>
              ))}
            </div>
            <details>
              <summary>{t(lang, 'gallery')}</summary>
              <div className="admin-photo-picker">
                {gallery.map((name) => (
                  <button
                    type="button"
                    key={name}
                    aria-label={name}
                    onClick={() =>
                      setEditingProduct((p) => ({
                        ...p!,
                        images: [
                          ...new Set([...(p!.images || []), '/photos/' + name]),
                        ].slice(0, 5),
                        image: p!.images?.[0] || '/photos/' + name,
                      }))
                    }
                  >
                    <img
                      src={'/photos/' + name}
                      alt={name}
                      loading="lazy"
                      width="150"
                      height="100"
                    />
                  </button>
                ))}
              </div>
            </details>
            <label className="upload-control">
              <Upload size={18} />
              {t(lang, 'upload')}
              <input
                type="file"
                disabled={
                  !uploadReady || (editingProduct.images?.length || 0) >= 5
                }
                accept="image/jpeg,image/png,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await action(async () => {
                    if (file.size > 12000000) throw new Error('TOO_LARGE');
                    const r = await api('/admin/media', {
                      method: 'POST',
                      body: file,
                      headers: { 'Content-Type': file.type },
                    });
                    setEditingProduct((p) => ({
                      ...p!,
                      images: [...new Set([...(p!.images || []), r.url])].slice(
                        0,
                        5,
                      ),
                      image: p!.images?.[0] || r.url,
                    }));
                  });
                }}
              />
              <small>
                {uploadReady
                  ? t(lang, 'minPhoto')
                  : lang === 'fa'
                    ? 'برای آپلود عکس جدید، فضای عکس باید فعال شود؛ انتخاب از گالری آماده است.'
                    : lang === 'uk'
                      ? 'Для нових фото підключіть сховище. Можна обрати фото з галереї.'
                      : lang === 'de'
                        ? 'Für neue Uploads Bildspeicher verbinden. Die Galerie ist verfügbar.'
                        : 'Connect image storage for new uploads. Existing gallery photos are available.'}
              </small>
            </label>
            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={editingProduct.active !== false}
                onChange={(e) =>
                  setEditingProduct((p) => ({
                    ...p!,
                    active: e.target.checked,
                  }))
                }
              />
              {t(lang, 'active')}
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'save')}
            </button>
          </form>
        </Modal>
      )}
      {editingOrder && (
        <Modal
          title={'#' + editingOrder.id.slice(0, 8).toUpperCase()}
          close={() => setEditingOrder(null)}
        >
          <form
            className="shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(async () => {
                await send(
                  '/admin/orders/' + editingOrder.id,
                  {
                    status: editingOrder.status,
                    delivery: editingOrder.delivery,
                    paid: editingOrder.paid,
                    version: editingOrder.version,
                    note: f.get('note'),
                  },
                  'PATCH',
                );
                setEditingOrder(null);
              });
            }}
          >
            <h3>{editingOrder.customer.name}</h3>
            <p>
              {editingOrder.customer.address}
              <br />
              {editingOrder.customer.postcode} {editingOrder.customer.city}
              <br />
              <a href={'tel:' + editingOrder.customer.phone}>
                {editingOrder.customer.phone}
              </a>
              <br />
              {editingOrder.customer.email}
            </p>
            <p>
              {editingOrder.date} · {editingOrder.time} · {t(lang, 'zone')}{' '}
              {editingOrder.zone}
              <br />
              {t(lang, 'utensils')}: {editingOrder.customer.utensils}
            </p>
            {editingOrder.customer.notes && (
              <p className="notice">{editingOrder.customer.notes}</p>
            )}
            <div className="receipt-lines">
              {editingOrder.items.map((i) => (
                <div key={i.id}>
                  <span>
                    {i.quantity} × {i.name[lang]}
                  </span>
                  <b>{money(i.price * i.quantity)}</b>
                </div>
              ))}
            </div>
            <label>
              {t(lang, 'status')}
              <select
                value={editingOrder.status}
                onChange={(e) =>
                  setEditingOrder((o) => ({ ...o!, status: e.target.value }))
                }
              >
                {[
                  'new',
                  'confirmed',
                  'preparing',
                  'out_for_delivery',
                  'delivered',
                  'cancelled',
                ].map((s) => (
                  <option key={s} value={s}>
                    {t(lang, statusKey(s))}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t(lang, 'fee')} (€)
              <input
                type="number"
                min="0"
                max="300"
                step="0.01"
                value={
                  editingOrder.delivery === null
                    ? ''
                    : editingOrder.delivery / 100
                }
                onChange={(e) =>
                  setEditingOrder((o) => ({
                    ...o!,
                    delivery:
                      e.target.value === ''
                        ? null
                        : Math.round(Number(e.target.value) * 100),
                  }))
                }
              />
            </label>
            <p>
              {editingOrder.payment === 'cash_on_delivery'
                ? t(lang, 'payment')
                : editingOrder.payment === 'stripe'
                  ? 'Stripe · Card'
                  : 'PayPal'}
            </p>
            <label className="checkbox-line">
              <input
                type="checkbox"
                disabled={editingOrder.payment !== 'cash_on_delivery'}
                checked={editingOrder.paid}
                onChange={(e) =>
                  setEditingOrder((o) => ({ ...o!, paid: e.target.checked }))
                }
              />
              {t(lang, 'paid')}
            </label>
            <label>
              {t(lang, 'customerNote')}
              <textarea name="note" rows={3} maxLength={500} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'save')}
            </button>
          </form>
        </Modal>
      )}
      {editingCustomer && (
        <Modal
          title={editingCustomer.name}
          close={() => setEditingCustomer(null)}
        >
          <form
            className="shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              action(async () => {
                await send(
                  '/admin/customers/' + editingCustomer.id,
                  { ...editingCustomer, action: 'edit' },
                  'PATCH',
                );
                setEditingCustomer(null);
              });
            }}
          >
            {(['name', 'phone', 'address'] as const).map((k) => (
              <label key={k}>
                {t(lang, k)}
                <input
                  required={k === 'name'}
                  value={editingCustomer[k] || ''}
                  onChange={(e) =>
                    setEditingCustomer((c: any) => ({
                      ...c,
                      [k]: e.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <p dir="ltr">{editingCustomer.email}</p>
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'save')}
            </button>
            <button
              className="shop-secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const r = await send(
                    '/admin/customers/' + editingCustomer.id,
                    { action: 'reset' },
                    'PATCH',
                  );
                  setLink(r.link);
                  setEditingCustomer(null);
                })
              }
            >
              {t(lang, 'resetLink')}
            </button>
            <button
              className="shop-secondary"
              type="button"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  await send(
                    '/admin/customers/' + editingCustomer.id,
                    { action: editingCustomer.disabled ? 'enable' : 'disable' },
                    'PATCH',
                  );
                  setEditingCustomer(null);
                })
              }
            >
              {t(lang, editingCustomer.disabled ? 'enable' : 'disable')}
            </button>
            <details>
              <summary>{t(lang, 'deleteCustomer')}</summary>
              <p>{t(lang, 'deleteConfirm')}</p>
              <input
                type="email"
                aria-label={t(lang, 'email')}
                value={editingCustomer.confirmEmail || ''}
                onChange={(e) =>
                  setEditingCustomer((c: any) => ({
                    ...c,
                    confirmEmail: e.target.value,
                  }))
                }
              />
              <button
                type="button"
                className="shop-secondary danger"
                disabled={
                  busy || editingCustomer.confirmEmail !== editingCustomer.email
                }
                onClick={() =>
                  action(async () => {
                    await send(
                      '/admin/customers/' + editingCustomer.id,
                      { confirmEmail: editingCustomer.confirmEmail },
                      'DELETE',
                    );
                    setEditingCustomer(null);
                  })
                }
              >
                {t(lang, 'deleteCustomer')}
              </button>
            </details>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        </Modal>
      )}
      {invite && (
        <Modal title={t(lang, 'addCustomer')} close={() => setInvite(false)}>
          <form
            className="shop-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action(async () => {
                const r = await send('/admin/customers', {
                  name: f.get('name'),
                  email: f.get('email'),
                });
                setLink(r.link);
                setInvite(false);
              });
            }}
          >
            <label>
              {t(lang, 'name')}
              <input name="name" required maxLength={120} />
            </label>
            <label>
              {t(lang, 'email')}
              <input name="email" type="email" required maxLength={254} />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="shop-primary" disabled={busy}>
              {t(lang, 'addCustomer')}
            </button>
          </form>
        </Modal>
      )}
      {link && (
        <Modal title={t(lang, 'resetLink')} close={() => setLink('')}>
          <p>{t(lang, 'resetLinkNote')}</p>
          <textarea
            readOnly
            rows={5}
            value={link}
            className="private-link"
            dir="ltr"
          />
          <button
            className="shop-primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setNotice(t(lang, 'copied'));
              } catch {
                setError(t(lang, 'error'));
              }
            }}
          >
            <Copy size={16} />
            {t(lang, 'resetLink')}
          </button>
        </Modal>
      )}
    </ShopShell>
  );
}
function OrderCard({
  order: o,
  onClick,
}: {
  order: Order;
  onClick: () => void;
}) {
  const { lang } = useShop();
  return (
    <button className="order-card" onClick={onClick}>
      <div>
        <b>#{o.id.slice(0, 8).toUpperCase()}</b>
        <span className={`status-badge status-${o.status}`}>
          {t(lang, statusKey(o.status))}
        </span>
      </div>
      <h3>{o.customer.name}</h3>
      <p>
        {o.date} · {o.time}
      </p>
      <p>{o.items.map((i) => `${i.quantity} × ${i.name[lang]}`).join(' · ')}</p>
      <div>
        <span>
          {o.paid
            ? t(lang, 'paid')
            : o.payment === 'cash_on_delivery'
              ? t(lang, 'payment')
              : o.payment}
        </span>
        <strong>
          {o.total === null ? t(lang, 'pending') : money(o.total)}
        </strong>
      </div>
    </button>
  );
}
