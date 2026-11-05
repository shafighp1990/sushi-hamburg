import type { Language } from './catalog';
import { defaultOperations, type Schedule } from './operations';
export type Localized = Record<Language, string>;
export type ShopSettings = {
  buttonStyle: 'solid' | 'outline' | 'rounded' | 'ticket';
  galleryStyle: 'carousel' | 'editorial' | 'tiles' | 'focus';
  taxMode: 'unset' | 'regular' | 'small_business' | 'no_vat';
  deliveryMode: 'quote' | 'zones';
  shopOpen: boolean;
  schedule: Schedule;
  paymentEnabled: typeof defaultOperations.paymentEnabled;
  issuer: typeof defaultOperations.issuer;
  newsletter: typeof defaultOperations.newsletter;
  offer: {
    active: boolean;
    title: Localized;
    description: Localized;
    productIds: string[];
    couponCode: string;
  };
};
export const defaultSettings: ShopSettings = {
  buttonStyle: 'solid',
  galleryStyle: 'carousel',
  taxMode: 'small_business',
  ...defaultOperations,
  deliveryMode: 'quote',
  shopOpen: true,
  offer: {
    active: false,
    title: { de: '', uk: '', en: '', fa: '' },
    description: { de: '', uk: '', en: '', fa: '' },
    productIds: [],
    couponCode: '',
  },
};
export type Coupon = {
  code: string;
  type: 'percent' | 'fixed';
  amount: number;
  startsOn: string;
  endsOn: string;
  minSubtotal: number;
  usageLimit: number;
  perCustomerLimit: number;
  customerId: string;
  productIds: string[];
  active: boolean;
  version: number;
};
export type TaxSummary = {
  mode: ShopSettings['taxMode'];
  gross: number | null;
  net: number | null;
  vat: number | null;
  groups: { rate: number; gross: number; net: number; vat: number }[];
};
// Largest-remainder allocation conserves every cent across mixed VAT-rate groups.
export function allocate(amount: number, weights: number[]): number[] {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / total),
    result = raw.map(Math.floor);
  const rest = amount - result.reduce((a, b) => a + b, 0);
  const order = raw
    .map((n, i) => ({ i, fraction: n - Math.floor(n) }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  for (let i = 0; i < rest; i++) result[order[i].i]++;
  return result;
}
export function totals(
  items: {
    id: string;
    price: number;
    quantity: number;
    taxRate?: number;
    discountShare?: number;
  }[],
  delivery: number | null,
  settings: ShopSettings,
  coupon?: Pick<Coupon, 'type' | 'amount' | 'productIds'>,
) {
  const weights = items.map((i) => i.price * i.quantity),
    subtotal = weights.reduce((a, b) => a + b, 0),
    eligible = weights.map((w, i) =>
      !coupon?.productIds.length || coupon.productIds.includes(items[i].id)
        ? w
        : 0,
    ),
    base = eligible.reduce((a, b) => a + b, 0);
  const snapshot = items.every((i) => i.discountShare !== undefined);
  const discount = snapshot
    ? items.reduce((s, i) => s + (i.discountShare || 0), 0)
    : coupon
      ? Math.min(
          base,
          coupon.type === 'percent'
            ? Math.round((base * coupon.amount) / 100)
            : coupon.amount,
        )
      : 0;
  const allocations = snapshot
      ? items.map((i) => i.discountShare || 0)
      : allocate(discount, eligible),
    food = weights.map((w, i) => w - allocations[i]),
    total = delivery === null ? null : subtotal - discount + delivery;
  const tax: TaxSummary = {
    mode: settings.taxMode,
    gross: total,
    net: null,
    vat: null,
    groups: [],
  };
  if (
    total !== null &&
    (settings.taxMode === 'small_business' || settings.taxMode === 'no_vat')
  ) {
    tax.net = total;
    tax.vat = 0;
  }
  if (total !== null && settings.taxMode === 'regular') {
    const deliveryParts = allocate(
      delivery || 0,
      food.reduce((a, b) => a + b, 0) ? food : weights,
    );
    const groups = new Map<number, number>();
    items.forEach((p, i) => {
      const rate = p.taxRate ?? 0;
      groups.set(rate, (groups.get(rate) || 0) + food[i] + deliveryParts[i]);
    });
    tax.groups = [...groups]
      .sort(([a], [b]) => a - b)
      .map(([rate, gross]) => {
        const vat = Math.floor((gross * rate) / (10000 + rate) + 0.5);
        return { rate, gross, vat, net: gross - vat };
      });
    tax.vat = tax.groups.reduce((s, g) => s + g.vat, 0);
    tax.net = total - tax.vat;
  }
  return { subtotal, discount, delivery, total, tax };
}
