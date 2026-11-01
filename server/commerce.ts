import { isOneOf } from '../lib/value-guards';
import type { CouponRow, CountRow } from './types';
import { defaultOperations, validateSchedule } from '../lib/operations';
import postcodes from '../lib/hamburg-postcodes.json';
import {
  defaultSettings,
  allocate,
  totals,
  type ShopSettings,
  type Coupon,
} from '../lib/commerce';
import { berlinNow, deliveryFee, type Product } from '../lib/catalog';
import { fail, string, record, integer } from './validation';
import type { ShopEnv } from './auth';
export async function getSettings(env: ShopEnv): Promise<ShopSettings> {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='shop'",
  ).first<{ value: string }>();
  return row
    ? {
        ...defaultSettings,
        ...JSON.parse(row.value),
        paymentEnabled: {
          ...defaultSettings.paymentEnabled,
          ...JSON.parse(row.value).paymentEnabled,
        },
      }
    : defaultSettings;
}
export function validateSettings(input: unknown): ShopSettings {
  const raw = record(input);
  if (
    !isOneOf(raw.buttonStyle, ['solid', 'outline', 'rounded', 'ticket']) ||
    !isOneOf(raw.galleryStyle, ['carousel', 'editorial', 'tiles', 'focus']) ||
    !isOneOf(raw.taxMode, ['unset', 'regular', 'small_business', 'no_vat']) ||
    !isOneOf(raw.deliveryMode, ['quote', 'zones']) ||
    typeof raw.shopOpen !== 'boolean'
  )
    fail('INVALID_INPUT');
  const schedule = raw.schedule || defaultOperations.schedule;
  if (!validateSchedule(schedule)) fail('INVALID_SCHEDULE');
  const paymentInput = record(raw.paymentEnabled || {}),
    issuerInput = record(raw.issuer || {});
  const paymentEnabled = Object.fromEntries(
    Object.entries(defaultOperations.paymentEnabled).map(([k, v]) => [
      k,
      paymentInput[k] ?? v,
    ]),
  ) as typeof defaultOperations.paymentEnabled;
  if (Object.values(paymentEnabled).some((v) => typeof v !== 'boolean'))
    fail('INVALID_INPUT');
  const issuer = Object.fromEntries(
    Object.keys(defaultOperations.issuer).map((k) => [k, issuerInput[k] || '']),
  ) as typeof defaultOperations.issuer;
  for (const k of Object.keys(defaultOperations.issuer))
    issuer[k as keyof typeof issuer] = string(
      issuer[k as keyof typeof issuer],
      k === 'address' ? 500 : 150,
      false,
    );
  const offer = record(raw.offer || {}),
    offerTitle = record(offer.title || {}),
    offerDescription = record(offer.description || {}),
    title = {} as ShopSettings['offer']['title'],
    description = {} as ShopSettings['offer']['description'];
  for (const l of ['de', 'uk', 'en', 'fa'] as const) {
    title[l] = string(offerTitle[l] || '', 100, !!offer.active);
    description[l] = string(offerDescription[l] || '', 400, false);
  }
  const productIds = ids(offer.productIds);
  return {
    schedule,
    paymentEnabled,
    issuer,
    newsletter: {
      newProducts: record(raw.newsletter || {}).newProducts === true,
    },
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
function ids(v: unknown): string[] {
  if (
    !Array.isArray(v) ||
    v.length > 40 ||
    v.some((x) => typeof x !== 'string' || !/^[a-z0-9-]{1,80}$/.test(x))
  )
    fail('INVALID_INPUT');
  return [...new Set(v)] as string[];
}
export function validateCoupon(input: unknown): Coupon {
  const b = record(input);
  const code = string(b.code, 32).toUpperCase();
  if (
    !/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(code) ||
    !isOneOf(b.type, ['percent', 'fixed']) ||
    typeof b.amount !== 'number' ||
    !Number.isInteger(b.amount) ||
    b.amount < 1 ||
    b.amount > (b.type === 'percent' ? 100 : 100000)
  )
    fail('INVALID_INPUT');
  const minSubtotal = integer(b.minSubtotal, 0, 100000),
    usageLimit = integer(b.usageLimit, 0, 100000),
    perCustomerLimit = integer(b.perCustomerLimit, 0, 100000),
    version = integer(b.version, 0, 100000);
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
    minSubtotal,
    usageLimit,
    perCustomerLimit,
    customerId: string(b.customerId || '', 100, false),
    productIds: ids(b.productIds),
    active: b.active !== false,
    version,
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
    .first<CouponRow>();
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
    .first<CountRow>();
  if (c.usageLimit && (count?.n || 0) >= c.usageLimit) fail('COUPON_LIMIT');
  if (c.perCustomerLimit) {
    const n = await env.DB.prepare(
      'SELECT COUNT(*) n FROM coupon_redemptions WHERE code=? AND user_key=? AND released=0',
    )
      .bind(c.code, userId)
      .first<CountRow>();
    if ((n?.n || 0) >= c.perCustomerLimit) fail('COUPON_LIMIT');
  }
  return c;
}
export function quoteItems(
  raw: unknown,
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
  return raw.map((input: unknown) => {
    const line = record(input);
    const p = catalog.find((p) => p.id === line.id);
    if (!p || p.active === false) fail('PRODUCT_UNAVAILABLE');
    if (
      seen.has(p!.id) ||
      typeof line.quantity !== 'number' ||
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
  input: unknown,
  catalog: Product[],
  userId: string | null,
) {
  const b = record(input);
  const settings = await getSettings(env),
    items = quoteItems(b.items, catalog),
    subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0);
  if (subtotal > 200000) fail('ORDER_TOO_LARGE');
  const coupon = await getCoupon(
    env,
    string(b.couponCode || '', 33, false),
    subtotal,
    userId,
    items,
  );
  let pricing = totals(
    items,
    settings.deliveryMode === 'quote'
      ? null
      : deliveryFee(string(b.zone || 'unknown', 20)),
    settings,
    coupon,
  );
  let discountShares = allocate(
    pricing.discount,
    items.map((i) =>
      !coupon?.productIds.length || coupon.productIds.includes(i.id)
        ? i.price * i.quantity
        : 0,
    ),
  );
  let newsletterDiscount = 0;
  if (userId) {
    const subscriber = await env.DB.prepare(
      "SELECT s.id FROM newsletter_subscribers s JOIN user u ON u.id=s.user_id WHERE s.user_id=? AND s.email=u.email AND s.state='active'",
    )
      .bind(userId)
      .first();
    if (subscriber) {
      const remaining = items.map(
        (i, n) => i.price * i.quantity - discountShares[n],
      );
      newsletterDiscount = Math.round(
        remaining.reduce((a, b) => a + b, 0) * 0.05,
      );
      const shares = allocate(newsletterDiscount, remaining);
      discountShares = discountShares.map((d, n) => d + shares[n]);
      pricing = totals(
        items.map((i, n) => ({ ...i, discountShare: discountShares[n] })),
        pricing.delivery,
        settings,
      );
    }
  }
  return {
    ...pricing,
    items,
    discountShares,
    newsletterDiscount,
    coupon,
    settings,
  };
}
export function validateHamburg(input: unknown) {
  const customer = record(input);
  if (
    string(customer.city || '', 80, false)
      .trim()
      .toLowerCase() !== 'hamburg' ||
    !/^\d{5}$/.test(string(customer.postcode || '', 5, false))
  )
    fail('DELIVERY_AREA');
  if (!postcodes.includes(string(customer.postcode, 5))) fail('DELIVERY_AREA');
  return { city: 'Hamburg', postcode: string(customer.postcode, 5) };
}
