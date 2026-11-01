export type {
  Customer,
  Order,
  OrderMessage,
  OrderMessages,
} from './shop-types';

function errorCode(value: unknown): string {
  if (!value || typeof value !== 'object') return 'SERVER_ERROR';
  const payload = value as Record<string, unknown>;
  if (typeof payload.code === 'string') return payload.code;
  if (typeof payload.error === 'string') return payload.error;
  if (
    payload.error &&
    typeof payload.error === 'object' &&
    'code' in payload.error &&
    typeof payload.error.code === 'string'
  )
    return payload.error.code;
  return 'SERVER_ERROR';
}
export async function api<T = unknown>(
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
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error('SHOP_UNAVAILABLE');
  }
  if (!response.ok) throw new Error(errorCode(result));
  // Call sites select the response contract for their endpoint. Unspecified responses remain unknown.
  return result as T;
}
export const send = <T = unknown>(
  path: string,
  body: unknown,
  method = 'POST',
) => api<T>(path, { method, body: JSON.stringify(body) });
