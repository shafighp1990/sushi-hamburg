import { providers, type Provider } from '../lib/operations';
import type { PaymentEnv } from './payments';
import { privateSetting, savePrivate } from './secrets';
import { getSettings } from './commerce';
import { fail, string, record } from './validation';
export const connectionFields = {
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  paypal: [
    'PAYPAL_CLIENT_ID',
    'PAYPAL_CLIENT_SECRET',
    'PAYPAL_WEBHOOK_ID',
    'PAYPAL_MERCHANT_ID',
    'PAYPAL_ENV',
  ],
  revolut: ['REVOLUT_SECRET_KEY', 'REVOLUT_WEBHOOK_SECRET', 'REVOLUT_ENV'],
  sumup: ['SUMUP_API_KEY', 'SUMUP_MERCHANT_CODE'],
} as const;
export async function resolvePaymentEnv(env: PaymentEnv) {
  let result = { ...env };
  for (const p of providers)
    result = { ...result, ...(await privateSetting(env, 'payment:' + p)) };
  return {
    ...result,
    PAYMENT_ENABLED: (await getSettings(env)).paymentEnabled,
  };
}
export async function connectionStatus(env: PaymentEnv) {
  const resolved = await resolvePaymentEnv(env);
  return providers.map((provider) => ({
    provider,
    fields: connectionFields[provider].map((key) => ({
      key,
      present: !!resolved[key],
      ...(key.endsWith('_ENV') ? { value: resolved[key] || 'sandbox' } : {}),
    })),
  }));
}
export async function saveConnection(
  env: PaymentEnv,
  provider: string,
  input: unknown,
) {
  const raw = record(input);
  if (!providers.includes(provider as Provider)) fail('INVALID_INPUT');
  const p = provider as Provider;
  const value = await privateSetting(env, 'payment:' + p);
  for (const key of connectionFields[p]) {
    if (raw[key] === undefined || raw[key] === '') continue;
    const v = string(raw[key], 2000);
    if (key.endsWith('_ENV') && !['sandbox', 'live'].includes(v))
      fail('INVALID_INPUT');
    value[key] = v;
  }
  await savePrivate(env, 'payment:' + p, value);
}
