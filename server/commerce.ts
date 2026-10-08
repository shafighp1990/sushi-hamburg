import postcodes from '../lib/hamburg-postcodes.json';
import {
  defaultSettings,
  allocate,
  totals,
  type ShopSettings,
  type Coupon,
} from '../lib/commerce';
import { berlinNow, deliveryFee, type Product } from '../lib/catalog';
import { fail, string } from './validation';
import type { ShopEnv } from './auth';
export async function getSettings(env: ShopEnv): Promise<ShopSettings> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='shop'",
  ).first<{ value: string }>();
  return row
    ? { ...defaultSettings, ...JSON.parse(row.value) }
    : defaultSettings;
}
export function validateSettings(raw: any): ShopSettings {
  if (
    !['solid', 'outline', 'rounded', 'ticket'].includes(raw.buttonStyle) ||
    !['carousel', 'editorial', 'tiles', 'focus'].includes(raw.galleryStyle) ||
    !['unset', 'regular', 'small_business'].includes(raw.taxMode) ||
    !['quote', 'zones'].includes(raw.deliveryMode) ||
    typeof raw.shopOpen !== 'boolean'
  )
    fail('INVALID_INPUT');
  const offer = raw.offer || {},
    title = {} as ShopSettings['offer']['title'],
    description = {} as ShopSettings['offer']['description'];
  for (const l of ['de', 'uk', 'en', 'fa'] as const) {
    title[l] = string(offer.title?.[l] || '', 100, !!offer.active);
    description[l] = string(offer.description?.[l] || '', 400, false);
  }
  const productIds = ids(offer.productIds);
  return {
    buttonStyle: raw.buttonStyle,
    galleryStyle: raw.galleryStyle,
    taxMode: raw.taxMode,
    deliveryMode: raw.deliveryMode,
    shopOpen: raw.shopOpen,
    offer: {
      active: offer.active === true,
      title,
      description,
      productIds,
      couponCode: string(offer.couponCode || '', 32, false).toUpperCase(),
    },
  };
}
function ids(v: any): string[] {
  if (
    !Array.isArray(v) ||
    v.length > 40 ||
    v.some((x) => typeof x !== 'string' || !/^[a-z0-9-]{1,80}$/.test(x))
  )
    fail('INVALID_INPUT');
  return [...new Set(v)] as string[];
}
export function validateCoupon(b: any): Coupon {
  const code = string(b.code, 32).toUpperCase();
  if (
    !/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code) ||
    !['percent', 'fixed'].includes(b.type) ||
    !Number.isInteger(b.amount) ||
    b.amount < 1 ||
    b.amount > (b.type === 'percent' ? 100 : 100000)
  )
    fail('INVALID_INPUT');
  for (const k of ['minSubtotal', 'usageLimit', 'perCustomerLimit', 'version'])
    if (!Number.isInteger(b[k]) || b[k] < 0 || b[k] > 100000)
      fail('INVALID_INPUT');
  const startsOn = string(b.startsOn || '', 10, false),
    endsOn = string(b.endsOn || '', 10, false);
  for (const d of [startsOn, endsOn])
    if (
      d &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(d) ||
        Number.isNaN(new Date(d).getTime()) ||
        new Date(d).toISOString().slice(0, 10) !== d)
    )
      fail('INVALID_INPUT');
  if (startsOn && endsOn && startsOn > endsOn) fail('INVALID_INPUT');
  return {
    code,
    type: b.type,
    amount: b.amount,
    startsOn,
    endsOn,
    minSubtotal: b.minSubtotal,
    usageLimit: b.usageLimit,
    perCustomerLimit: b.perCustomerLimit,
    customerId: string(b.customerId || '', 100, false),
    productIds: ids(b.productIds),
    active: b.active !== false,
    version: b.version,
  };
}
export async function getCoupon(
  env: ShopEnv,
  code: string,
  subtotal: number,
  userId: string | null,
  items: { id: string }[],
) {
  if (!code) return undefined;
  const row = await env.DB.prepare(
    'SELECT data,active,version FROM coupons WHERE code=?',
  )
    .bind(code.toUpperCase().trim())
    .first<any>();
  if (!row || !row.active) fail('INVALID_COUPON');
  const c = { ...JSON.parse(row.data), version: row.version } as Coupon;
  const today = berlinNow().date;
  if (
    (c.startsOn && today < c.startsOn) ||
    (c.endsOn && today > c.endsOn) ||
    subtotal < c.minSubtotal ||
    (c.productIds.length && !items.some((i) => c.productIds.includes(i.id)))
  )
    fail('INVALID_COUPON');
  if ((c.customerId || c.perCustomerLimit) && !userId)
    fail('COUPON_LOGIN_REQUIRED');
  if (c.customerId && c.customerId !== userId) fail('INVALID_COUPON');
  const count = await env.DB.prepare(
    'SELECT COUNT(*) n FROM coupon_redemptions WHERE code=? AND released=0',
  )
    .bind(c.code)
    .first<any>();
  if (c.usageLimit && count.n >= c.usageLimit) fail('COUPON_LIMIT');
  if (c.perCustomerLimit) {
    const n = await env.DB.prepare(
      'SELECT COUNT(*) n FROM coupon_redemptions WHERE code=? AND user_key=? AND released=0',
    )
      .bind(c.code, userId)
      .first<any>();
    if (n.n >= c.perCustomerLimit) fail('COUPON_LIMIT');
  }
  return c;
}
export function quoteItems(
  raw: any,
  catalog: Product[],
): {
  id: string;
  name: Product['name'];
  price: number;
  quantity: number;
  taxRate: number;
}[] {
  if (!Array.isArray(raw) || !raw.length || raw.length > 80) fail('EMPTY_CART');
  const seen = new Set();
  return raw.map((line: any) => {
    const p = catalog.find((p) => p.id === line.id);
    if (!p || p.active === false) fail('PRODUCT_UNAVAILABLE');
    if (
      seen.has(p!.id) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 50
    )
      fail('INVALID_QUANTITY');
    if (p!.price !== line.price) fail('PRICE_CHANGED', 409);
    seen.add(p!.id);
    return {
      id: p!.id,
      name: p!.name,
      price: p!.price,
      quantity: line.quantity,
      taxRate: p!.taxRate ?? 700,
    };
  });
}
export async function quote(
  env: ShopEnv,
  b: any,
  catalog: Product[],
  userId: string | null,
) {
  const settings = await getSettings(env),
    items = quoteItems(b.items, catalog),
    subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0);
  if (subtotal > 200000) fail('ORDER_TOO_LARGE');
  const coupon = await getCoupon(
    env,
    String(b.couponCode || '').slice(0, 33),
    subtotal,
    userId,
    items,
  );
  const pricing = totals(
    items,
    settings.deliveryMode === 'quote' ? null : deliveryFee(b.zone),
    settings,
    coupon,
  );
  const discountShares = allocate(
    pricing.discount,
    items.map((i) =>
      !coupon?.productIds.length || coupon.productIds.includes(i.id)
        ? i.price * i.quantity
        : 0,
    ),
  );
  return { ...pricing, items, discountShares, coupon, settings };
}
export function validateHamburg(customer: any) {
  if (
    String(customer?.city || '')
      .trim()
      .toLowerCase() !== 'hamburg' ||
    !/^\d{5}$/.test(String(customer?.postcode || ''))
  )
    fail('DELIVERY_AREA');
  if (!postcodes.includes(String(customer.postcode))) fail('DELIVERY_AREA');
  return { city: 'Hamburg', postcode: customer.postcode };
}
