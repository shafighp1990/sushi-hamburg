import type { ShopEnv } from './auth';
import { fail } from './validation';
export type PaymentEnv = ShopEnv & {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_WEBHOOK_ID?: string;
  PAYPAL_ENV?: string;
  PAYPAL_MERCHANT_ID?: string;
  LOCAL_DEMO?: string;
};
const paypalBase = (env: PaymentEnv) =>
  env.PAYPAL_ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
export function paymentMethods(env: PaymentEnv) {
  return {
    stripe: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),
    paypal: !!(
      env.PAYPAL_CLIENT_ID &&
      env.PAYPAL_CLIENT_SECRET &&
      env.PAYPAL_WEBHOOK_ID
    ),
  };
}
async function paypalToken(env: PaymentEnv) {
  const r = await fetch(paypalBase(env) + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) fail('PAYMENT_UNAVAILABLE', 503);
  return ((await r.json()) as any).access_token;
}
async function pp(env: PaymentEnv, path: string, body?: unknown, key?: string) {
  const token = await paypalToken(env);
  const r = await fetch(paypalBase(env) + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(key ? { 'PayPal-Request-Id': key } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: any = await r.json();
  if (!r.ok) fail('PAYMENT_PROVIDER_ERROR', 502);
  return data;
}
async function stripe(
  env: PaymentEnv,
  path: string,
  form?: URLSearchParams,
  key?: string,
) {
  const r = await fetch('https://api.stripe.com/v1' + path, {
    method: form ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(key ? { 'Idempotency-Key': key } : {}),
    },
    ...(form ? { body: form } : {}),
  });
  const data: any = await r.json();
  if (!r.ok) fail('PAYMENT_PROVIDER_ERROR', 502);
  return data;
}
export async function startPayment(
  env: PaymentEnv,
  order: any,
  origin: string,
) {
  const methods = paymentMethods(env);
  if (order.paid) return { paid: true };
  if (order.status === 'cancelled' || order.total === null)
    fail('PAYMENT_NOT_READY');
  const provider = order.payment;
  if (provider !== 'stripe' && provider !== 'paypal') fail('PAYMENT_NOT_READY');
  if (!methods[provider as keyof typeof methods])
    fail('PAYMENT_UNAVAILABLE', 503);
  const now = Date.now();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO payments(order_id,provider,amount,attempt,created_at,updated_at) SELECT ?,?,?,?,?,? FROM orders WHERE id=? AND total=? AND status!='cancelled' AND paid=0",
  )
    .bind(
      order.id,
      provider,
      order.total,
      crypto.randomUUID(),
      now,
      now,
      order.id,
      order.total,
    )
    .run();
  let p = await env.DB.prepare('SELECT * FROM payments WHERE order_id=?')
    .bind(order.id)
    .first<any>();
  if (!p) fail('PAYMENT_NOT_READY');
  if (p.state === 'review_required') fail('PAYMENT_REVIEW_REQUIRED', 409);
  if (p.amount !== order.total) fail('PAYMENT_AMOUNT_CHANGED', 409);
  if (p.state === 'paid') return { paid: true };
  if (p.state === 'expired') {
    await env.DB.prepare(
      "UPDATE payments SET attempt=?,provider_id=NULL,state='started',checkout_url=NULL WHERE order_id=? AND state='expired'",
    )
      .bind(crypto.randomUUID(), order.id)
      .run();
    p = await env.DB.prepare('SELECT * FROM payments WHERE order_id=?')
      .bind(order.id)
      .first<any>();
  }
  if (p.checkout_url) return { url: p.checkout_url };
  const base = env.SHOP_ORIGIN || origin;
  let providerId: string, checkoutURL: string;
  if (provider === 'stripe') {
    const form = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': 'eur',
      'line_items[0][price_data][unit_amount]': String(p.amount),
      'line_items[0][price_data][product_data][name]': `Sushi HH · ${order.id.slice(0, 8).toUpperCase()}`,
      'line_items[0][quantity]': '1',
      client_reference_id: order.id,
      'metadata[order_id]': order.id,
      'payment_intent_data[metadata][order_id]': order.id,
      success_url: `${base}/order?id=${order.id}&payment=return`,
      cancel_url: `${base}/order?id=${order.id}&payment=cancel`,
      customer_email: JSON.parse(order.customer).email,
    });
    const s = await stripe(env, '/checkout/sessions', form, p.attempt);
    providerId = s.id;
    checkoutURL = s.url;
  } else {
    const s = await pp(
      env,
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: order.id,
            custom_id: order.id,
            amount: {
              currency_code: 'EUR',
              value: (p.amount / 100).toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'Sushi HH',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: `${base}/order?id=${order.id}&payment=return`,
              cancel_url: `${base}/order?id=${order.id}&payment=cancel`,
            },
          },
        },
      },
      p.attempt,
    );
    providerId = s.id;
    checkoutURL = s.links?.find(
      (l: any) => l.rel === 'payer-action' || l.rel === 'approve',
    )?.href;
  }
  if (typeof checkoutURL !== 'string' || !checkoutURL.startsWith('https://'))
    fail('PAYMENT_PROVIDER_ERROR', 502);
  await env.DB.prepare(
    "UPDATE payments SET provider_id=?,checkout_url=?,state='pending',updated_at=? WHERE order_id=? AND state!='paid'",
  )
    .bind(providerId, checkoutURL, Date.now(), order.id)
    .run();
  return { url: checkoutURL };
}
async function markPaid(env: PaymentEnv, p: any, capture: string) {
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO order_events(id,order_id,status,note,created_at) SELECT ?,id,status,?,? FROM orders WHERE id=? AND paid=0',
    ).bind(
      crypto.randomUUID(),
      'Payment confirmed · ' + p.provider,
      now,
      p.order_id,
    ),
    env.DB.prepare(
      'UPDATE orders SET paid=1,paid_at=?,updated_at=?,version=version+1 WHERE id=? AND paid=0',
    ).bind(now, now, p.order_id),
    env.DB.prepare(
      "UPDATE payments SET state='paid',capture_id=?,updated_at=? WHERE order_id=?",
    ).bind(capture, now, p.order_id),
  ]);
}
function cents(value: string) {
  const m = /^(\d+)\.(\d{2})$/.exec(value);
  return m ? Number(m[1]) * 100 + Number(m[2]) : -1;
}
export async function reconcilePayment(
  env: PaymentEnv,
  orderId: string,
  capture = false,
) {
  const p = await env.DB.prepare('SELECT * FROM payments WHERE order_id=?')
    .bind(orderId)
    .first<any>();
  if (!p?.provider_id) return { paid: false };
  if (p.state === 'review_required')
    return { paid: false, state: 'review_required' };
  if (p.state === 'paid') return { paid: true };
  if (p.provider === 'stripe') {
    const s = await stripe(
      env,
      '/checkout/sessions/' + encodeURIComponent(p.provider_id),
    );
    if (
      s.client_reference_id !== p.order_id ||
      s.metadata?.order_id !== p.order_id ||
      s.amount_total !== p.amount ||
      s.currency !== 'eur'
    )
      fail('PAYMENT_MISMATCH', 409);
    if (s.payment_status === 'paid') {
      await markPaid(
        env,
        p,
        typeof s.payment_intent === 'string' ? s.payment_intent : '',
      );
      return { paid: true };
    }
    if (s.status === 'expired')
      await env.DB.prepare(
        "UPDATE payments SET state='expired',checkout_url=NULL WHERE order_id=? AND state!='paid'",
      )
        .bind(orderId)
        .run();
    return { paid: false, state: s.status };
  }
  let s = await pp(
    env,
    '/v2/checkout/orders/' + encodeURIComponent(p.provider_id),
  );
  if (s.status === 'APPROVED' && capture) {
    try {
      s = await pp(
        env,
        `/v2/checkout/orders/${encodeURIComponent(p.provider_id)}/capture`,
        {},
        p.attempt.slice(0, 28) + '-capture',
      );
    } catch (e) {
      s = await pp(
        env,
        '/v2/checkout/orders/' + encodeURIComponent(p.provider_id),
      );
      if (s.status !== 'COMPLETED') throw e;
    }
  }
  const units = s.purchase_units;
  if (
    !Array.isArray(units) ||
    units.length !== 1 ||
    units[0].custom_id !== p.order_id ||
    units[0].reference_id !== p.order_id
  )
    fail('PAYMENT_MISMATCH', 409);
  if (
    env.PAYPAL_MERCHANT_ID &&
    units[0].payee?.merchant_id !== env.PAYPAL_MERCHANT_ID
  )
    fail('PAYMENT_MISMATCH', 409);
  const captures = units[0].payments?.captures || [];
  const paid = captures.filter((c: any) => c.status === 'COMPLETED');
  if (paid.length === 1) {
    const c = paid[0];
    if (c.amount?.currency_code !== 'EUR' || cents(c.amount.value) !== p.amount)
      fail('PAYMENT_MISMATCH', 409);
    await markPaid(env, p, c.id);
    return { paid: true };
  }
  return { paid: false, state: s.status };
}
function constantEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function paymentWebhook(
  req: Request,
  env: PaymentEnv,
  provider: string,
) {
  const raw = await req.text();
  if (raw.length > 1000000) fail('TOO_LARGE', 413);
  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    fail('INVALID_JSON');
  }
  if (provider === 'stripe') {
    if (!env.STRIPE_WEBHOOK_SECRET) fail('PAYMENT_UNAVAILABLE', 503);
    const parts = (req.headers.get('stripe-signature') || '')
      .split(',')
      .map((p) => p.split('='));
    const timestamp = parts.find(([k]) => k === 't')?.[1];
    if (
      !timestamp ||
      !/^\d+$/.test(timestamp) ||
      Math.abs(Date.now() / 1000 - Number(timestamp)) > 300
    )
      fail('INVALID_SIGNATURE', 400);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sig = Array.from(
      new Uint8Array(
        await crypto.subtle.sign(
          'HMAC',
          key,
          new TextEncoder().encode(timestamp + '.' + raw),
        ),
      ),
      (n) => n.toString(16).padStart(2, '0'),
    ).join('');
    if (!parts.some(([k, v]) => k === 'v1' && constantEqual(sig, v)))
      fail('INVALID_SIGNATURE', 400);
  } else if (provider === 'paypal') {
    if (!env.PAYPAL_WEBHOOK_ID) fail('PAYMENT_UNAVAILABLE', 503);
    const fields = {
      auth_algo: req.headers.get('paypal-auth-algo'),
      cert_url: req.headers.get('paypal-cert-url'),
      transmission_id: req.headers.get('paypal-transmission-id'),
      transmission_sig: req.headers.get('paypal-transmission-sig'),
      transmission_time: req.headers.get('paypal-transmission-time'),
      webhook_id: env.PAYPAL_WEBHOOK_ID,
    };
    if (Object.values(fields).some((v) => !v)) fail('INVALID_SIGNATURE');
    const token = await paypalToken(env);
    const verify = await fetch(
      paypalBase(env) + '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body:
          JSON.stringify(fields).slice(0, -1) + ',"webhook_event":' + raw + '}',
      },
    );
    const v: any = await verify.json();
    if (!verify.ok || v.verification_status !== 'SUCCESS')
      fail('INVALID_SIGNATURE', 400);
  } else fail('NOT_FOUND', 404);
  if (typeof event.id !== 'string') fail('INVALID_EVENT');
  const eventId = provider + ':' + event.id;
  if (
    await env.DB.prepare('SELECT id FROM payment_events WHERE id=?')
      .bind(eventId)
      .first()
  )
    return { ok: true };
  if (
    provider === 'stripe' &&
    [
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
    ].includes(event.type)
  ) {
    const p = await env.DB.prepare(
      "SELECT order_id FROM payments WHERE provider='stripe' AND provider_id=?",
    )
      .bind(event.data?.object?.id || '')
      .first<any>();
    if (p) await reconcilePayment(env, p.order_id);
  }
  if (
    provider === 'paypal' &&
    ['CHECKOUT.ORDER.APPROVED', 'PAYMENT.CAPTURE.COMPLETED'].includes(
      event.event_type,
    )
  ) {
    const providerId =
      event.event_type === 'CHECKOUT.ORDER.APPROVED'
        ? event.resource?.id
        : event.resource?.supplementary_data?.related_ids?.order_id;
    const p = await env.DB.prepare(
      "SELECT order_id FROM payments WHERE provider='paypal' AND provider_id=?",
    )
      .bind(providerId || '')
      .first<any>();
    if (p) await reconcilePayment(env, p.order_id, true);
  }
  const reversal =
    provider === 'stripe'
      ? ['charge.refunded', 'charge.dispute.created'].includes(event.type)
      : ['PAYMENT.CAPTURE.REFUNDED', 'PAYMENT.CAPTURE.REVERSED'].includes(
          event.event_type,
        );
  if (reversal) {
    const capture =
      provider === 'stripe'
        ? event.data?.object?.payment_intent
        : event.resource?.supplementary_data?.related_ids?.capture_id;
    const p = await env.DB.prepare(
      'SELECT order_id FROM payments WHERE provider=? AND capture_id=?',
    )
      .bind(provider, capture || '')
      .first<any>();
    if (p)
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE payments SET state='review_required',updated_at=? WHERE order_id=?",
        ).bind(Date.now(), p.order_id),
        env.DB.prepare(
          'UPDATE orders SET paid=0,updated_at=?,version=version+1 WHERE id=?',
        ).bind(Date.now(), p.order_id),
        env.DB.prepare(
          'INSERT INTO order_events(id,order_id,status,note,created_at) SELECT ?,id,status,?,? FROM orders WHERE id=?',
        ).bind(
          crypto.randomUUID(),
          'Payment refund/reversal — restaurant review required',
          Date.now(),
          p.order_id,
        ),
      ]);
  }
  await env.DB.prepare(
    'INSERT OR IGNORE INTO payment_events(id,provider,created_at) VALUES(?,?,?)',
  )
    .bind(eventId, provider, Date.now())
    .run();
  return { ok: true };
}
