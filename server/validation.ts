import { deliveryFee, validateDelivery, type Product } from '../lib/catalog';
export class ShopError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export const fail = (code: string, status = 400): never => {
  throw new ShopError(code, status);
};
export const string = (value: unknown, max = 200, required = true) => {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    return fail('INVALID_INPUT');
  return value.trim();
};
export const email = (v: unknown) => {
  const value = string(v, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return fail('INVALID_EMAIL');
  return value;
};
export function validateOrder(body: any, catalog: Product[], now = new Date()) {
  if (!body || typeof body !== 'object') return fail('INVALID_INPUT');
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 80
  )
    return fail('EMPTY_CART');
  const seen = new Set<string>();
  const items = body.items.map((line: any) => {
    const p = catalog.find((p) => p.id === line.id);
    if (!p || p.active === false) return fail('PRODUCT_UNAVAILABLE');
    if (
      seen.has(p.id) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 50
    )
      return fail('INVALID_QUANTITY');
    seen.add(p.id);
    if (line.price !== p.price) return fail('PRICE_CHANGED', 409);
    return { id: p.id, name: p.name, price: p.price, quantity: line.quantity };
  });
  const c = body.customer || {};
  const customer = {
    name: string(c.name, 120),
    email: email(c.email),
    phone: string(c.phone, 40),
    address: string(c.address, 500),
    notes: string(c.notes ?? '', 1000, false),
    utensils: c.utensils,
    language: body.language,
  };
  if (!/^[+()\d\s-]{6,40}$/.test(customer.phone)) return fail('INVALID_PHONE');
  if (!Number.isInteger(c.utensils) || c.utensils < 0 || c.utensils > 50)
    return fail('INVALID_INPUT');
  if (!['de', 'uk', 'en', 'fa'].includes(body.language))
    return fail('INVALID_INPUT');
  if (!['A', 'B', 'C', 'D', 'E', 'unknown'].includes(body.zone))
    return fail('INVALID_ZONE');
  if (!validateDelivery(body.date, body.time, now))
    return fail('INVALID_DELIVERY');
  if (body.accepted !== true) return fail('CONSENT_REQUIRED');
  if (typeof body.key !== 'string' || !/^[a-f0-9-]{36}$/.test(body.key))
    return fail('INVALID_KEY');
  if (
    typeof body.guestToken !== 'string' ||
    !/^[a-f0-9]{64}$/.test(body.guestToken)
  )
    return fail('INVALID_KEY');
  const subtotal = items.reduce(
    (s: number, p: any) => s + p.price * p.quantity,
    0,
  );
  if (subtotal > 200000) return fail('ORDER_TOO_LARGE');
  const delivery = deliveryFee(body.zone);
  return {
    items,
    customer,
    subtotal,
    delivery,
    total: delivery === null ? null : subtotal + delivery,
    date: body.date,
    time: body.time,
    zone: body.zone,
  };
}
export const statuses = [
  'new',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;
export function validateProduct(raw: any): Product {
  const id = string(raw.id, 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return fail('INVALID_PRODUCT');
  if (
    !['sets', 'new', 'classics', 'maki', 'signature'].includes(raw.category) ||
    !Number.isInteger(raw.price) ||
    raw.price < 100 ||
    raw.price > 100000
  )
    return fail('INVALID_PRODUCT');
  const name = {} as Product['name'],
    description = {} as Product['description'];
  for (const l of ['de', 'uk', 'en', 'fa'] as const) {
    name[l] = string(raw.name?.[l], 160);
    description[l] = string(raw.description?.[l], 2000);
  }
  const image = string(raw.image ?? '', 250, false);
  if (
    image &&
    !/^\/(?:api\/media\/[a-f0-9-]+\.(?:jpg|png|webp)|(?:products|photos)\/[a-zA-Z0-9_-]+(?:-\d+)?\.(?:jpg|webp))$/.test(
      image,
    )
  )
    return fail('INVALID_IMAGE');
  const images = raw.images ?? (image ? [image] : []);
  if (
    !Array.isArray(images) ||
    images.length > 5 ||
    images.some(
      (v: any) =>
        typeof v !== 'string' ||
        !/^\/(?:api\/media\/[a-f0-9-]+\.(?:jpg|png|webp)|(?:products|photos)\/[a-zA-Z0-9_-]+\.(?:jpg|webp))$/.test(
          v,
        ),
    )
  )
    fail('INVALID_IMAGE');
  const taxRate = raw.taxRate ?? 700;
  if (![700, 1900].includes(taxRate)) fail('INVALID_PRODUCT');
  if (
    raw.weight !== undefined &&
    (!Number.isInteger(raw.weight) || raw.weight <= 0 || raw.weight > 10000)
  )
    return fail('INVALID_PRODUCT');
  return {
    id,
    category: raw.category,
    name,
    description,
    price: raw.price,
    weight: raw.weight,
    image: images[0] || image,
    images: [...new Set(images)] as string[],
    taxRate,
    active: raw.active !== false,
    poster: raw.poster || 'signature',
    crop: [0, 0, 1, 1],
  };
}
