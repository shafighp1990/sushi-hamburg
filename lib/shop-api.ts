export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === 'string')
    headers.set('Content-Type', 'application/json');
  const response = await fetch('/api' + path, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  let result: any;
  try {
    result = await response.json();
  } catch {
    throw new Error('SHOP_UNAVAILABLE');
  }
  if (!response.ok)
    throw new Error(
      result.code || result.error?.code || result.error || 'SERVER_ERROR',
    );
  return result;
}
export const send = (path: string, body: unknown, method = 'POST') =>
  api(path, { method, body: JSON.stringify(body) });
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  language: string;
  admin: boolean;
};
export type Order = {
  discount: number;
  couponCode?: string;
  tax: import('./commerce').TaxSummary | null;
  paidAt?: number;
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postcode?: string;
    city?: string;
    notes: string;
    utensils: number;
    language: string;
  };
  items: {
    id: string;
    name: Record<string, string>;
    price: number;
    quantity: number;
  }[];
  subtotal: number;
  delivery: number | null;
  total: number | null;
  status: string;
  payment: string;
  paid: boolean;
  date: string;
  time: string;
  zone: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  userId: string | null;
};
