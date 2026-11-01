import { isRecord } from '../lib/value-guards';
import type { ShopEnv } from './auth';
export const toBase64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
};
export const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function key(env: ShopEnv) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
    throw Error('AUTH_NOT_CONFIGURED');
  return crypto.subtle.importKey(
    'raw',
    await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode('sushi-private-v1:' + env.AUTH_SECRET),
    ),
    'AES-GCM',
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function seal(env: ShopEnv, value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12)),
    data = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await key(env),
      new TextEncoder().encode(JSON.stringify(value)),
    );
  return JSON.stringify({
    v: 1,
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(data)),
  });
}
export async function unseal<T = unknown>(
  env: ShopEnv,
  value: string,
): Promise<T> {
  const p: unknown = JSON.parse(value);
  if (
    !isRecord(p) ||
    p.v !== 1 ||
    typeof p.iv !== 'string' ||
    typeof p.data !== 'string'
  )
    throw Error('INVALID_PRIVATE_SETTING');
  return JSON.parse(
    new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(p.iv) },
        await key(env),
        fromBase64(p.data),
      ),
    ),
  );
}
export async function capability(env: ShopEnv, purpose: string) {
  const k = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return Array.from(
    new Uint8Array(
      await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(purpose)),
    ),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
}
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function privateSetting(
  env: ShopEnv,
  key: string,
): Promise<Record<string, string>> {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key=?')
    .bind('private:' + key)
    .first<{ value: string }>();
  if (!r) return {};
  const value: unknown = await unseal(env, r.value);
  if (
    !isRecord(value) ||
    !Object.values(value).every((v) => typeof v === 'string')
  )
    throw Error('INVALID_PRIVATE_SETTING');
  return value as Record<string, string>;
}
export async function savePrivate(env: ShopEnv, key: string, value: unknown) {
  await env.DB.prepare(
    'INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at',
  )
    .bind('private:' + key, await seal(env, value), Date.now())
    .run();
}
