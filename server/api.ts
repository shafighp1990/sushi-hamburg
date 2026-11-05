import { isReviewRequest } from './review';
import type { Order, OrderCustomer, OrderItem } from '../lib/shop-types';
import type { TaxSummary, Coupon } from '../lib/commerce';
import type {
  OrderRow,
  ProfileRow,
  CatalogRow,
  CampaignRow,
  CouponRow,
} from './types';
import {
  createOrderMessage,
  listOrderMessages,
  validateEstimatedArrival,
} from './order-messages';
import {
  resolvePaymentEnv,
  connectionStatus,
  saveConnection,
} from './connections';
import {
  capability,
  equal,
  privateSetting,
  savePrivate,
  unseal,
} from './secrets';
import {
  newsletterStatus,
  subscribe,
  confirmSubscription,
  unsubscribeToken,
  unsubscribe,
  validateCampaign,
  newProductCampaign,
} from './newsletter';
import { mailEnvironment, dispatchMail } from './mail';
import { deliveryOptions, acceptingNow, validSlot } from '../lib/operations';
import {
  getSettings,
  validateSettings,
  validateCoupon,
  quote,
  validateHamburg,
} from './commerce';
import { totals, defaultSettings } from '../lib/commerce';
import { verifyPassword } from 'better-auth/crypto';
import {
  paymentMethods,
  startPayment,
  reconcilePayment,
  paymentWebhook,
  type PaymentEnv,
} from './payments';
import { authFor } from './auth';
import { products, productForDisplay } from '../lib/catalog';
import {
  ShopError,
  fail,
  string,
  email,
  validateOrder,
  validateProduct,
  statuses,
} from './validation';
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
async function limitedBytes(
  req: Pick<Request, 'headers' | 'body'>,
  max: number,
) {
  if (Number(req.headers.get('content-length') || 0) > max)
    fail('TOO_LARGE', 413);
  if (!req.body) fail('INVALID_INPUT');
  const reader = req.body!.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      fail('TOO_LARGE', 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  return bytes;
}
async function body(req: Pick<Request, 'headers' | 'body'>) {
  const text = new TextDecoder().decode(await limitedBytes(req, 60000));
  try {
    return JSON.parse(text);
  } catch {
    return fail('INVALID_JSON');
  }
}
async function catalogue(env: PaymentEnv, all = false) {
  const rows = await env.DB.prepare(
    'SELECT id,data,active,version FROM catalog',
  ).all<CatalogRow>();
  const overrides = new Map(rows.results.map((r) => [r.id, r]));
  const result = products.map((p) =>
    overrides.has(p.id)
      ? {
          ...JSON.parse(overrides.get(p.id)!.data),
          active: !!overrides.get(p.id)!.active,
          version: overrides.get(p.id)!.version,
        }
      : { ...p, active: true, version: 0 },
  );
  for (const r of rows.results)
    if (!products.some((p) => p.id === r.id))
      result.push({
        ...JSON.parse(r.data),
        active: !!r.active,
        version: r.version,
      });
  return all
    ? result
    : result.filter((p) => p.active !== false).map(productForDisplay);
}
async function identity(req: Request, env: PaymentEnv) {
  const s = await authFor(env, new URL(req.url).origin).api.getSession({
    headers: req.headers,
  });
  if (!s) return null;
  const p = await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?')
    .bind(s.user.id)
    .first<ProfileRow>();
  if (p?.disabled) fail('ACCOUNT_DISABLED', 403);
  const role = await env.DB.prepare('SELECT user_id FROM staff WHERE user_id=?')
    .bind(s.user.id)
    .first();
  return {
    ...s.user,
    phone: p?.phone || '',
    address: p?.address || '',
    postcode: p?.postcode || '',
    city: p?.city || 'Hamburg',
    language: p?.language || 'de',
    admin: !!role,
  };
}
async function mustUser(req: Request, env: PaymentEnv) {
  const u = await identity(req, env);
  if (!u) return fail('SIGN_IN_REQUIRED', 401);
  return u;
}
async function mustAdmin(req: Request, env: PaymentEnv) {
  const u = await mustUser(req, env);
  if (!u.admin) return fail('FORBIDDEN', 403);
  return u;
}
const audit = (
  env: PaymentEnv,
  actor: string,
  action: string,
  target: string,
) =>
  env.DB.prepare(
    'INSERT INTO audit(id,actor,action,target,created_at) VALUES(?,?,?,?,?)',
  ).bind(crypto.randomUUID(), actor, action, target, Date.now());
async function throttle(
  req: Request,
  env: PaymentEnv,
  scope: string,
  max = 15,
) {
  const key = await hash(
    `${scope}:${req.headers.get('CF-Connecting-IP') || 'local'}`,
  );
  const now = Date.now();
  const row = await env.DB.prepare(
    'INSERT INTO throttle(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<? THEN 1 ELSE count+1 END,expires_at=CASE WHEN expires_at<? THEN ? ELSE expires_at END RETURNING count',
  )
    .bind(key, now + 600000, now, now, now + 600000)
    .first<{ count: number }>();
  if (!row || row.count > max) fail('TOO_MANY_REQUESTS', 429);
}
function orderJSON(row: OrderRow | null): Order {
  if (!row) return fail('NOT_FOUND', 404);
  return {
    id: row.id,
    userId: row.user_id,
    customer: JSON.parse(row.customer) as OrderCustomer,
    items: JSON.parse(row.items) as OrderItem[],
    subtotal: row.subtotal,
    discount: row.discount || 0,
    couponCode: row.coupon_code || undefined,
    tax: row.tax ? (JSON.parse(row.tax) as TaxSummary) : null,
    paidAt: row.paid_at,
    delivery: row.delivery,
    total: row.total,
    status: row.status,
    payment: row.payment,
    paid: !!row.paid,
    date: row.date,
    time: row.time,
    zone: row.zone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    estimatedArrivalAt: row.estimated_arrival_at ?? null,
  };
}
export async function handleShop(
  req: Request,
  env: PaymentEnv,
  ctx?: { waitUntil(p: Promise<unknown>): void },
): Promise<Response> {
  try {
    const url = new URL(req.url),
      path = url.pathname.replace(/\/$/, '');
    const method = req.method;
    if (path === '/api/newsletter/unsubscribe' && method === 'POST')
      return json(
        await unsubscribeToken(
          env,
          string(url.searchParams.get('id'), 80),
          string(url.searchParams.get('token'), 100),
        ),
      );
    if (
      path === '/api/status' ||
      path === '/api/orders' ||
      path.startsWith('/api/payments/') ||
      path.startsWith('/api/webhooks/')
    )
      env = await resolvePaymentEnv(env);
    if (path.startsWith('/api/webhooks/') && method === 'POST') {
      await throttle(req, env, 'webhook-' + path.split('/').pop(), 300);
      const result = await paymentWebhook(req, env, path.split('/').pop()!);
      if (ctx)
        ctx.waitUntil(import('./jobs').then((m) => m.runJobs(env, url.origin)));
      return json(result);
    }
    if (!['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'].includes(method))
      return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    if (!['GET', 'HEAD'].includes(method)) {
      const origin = req.headers.get('origin');
      if (!origin || origin !== (env.SHOP_ORIGIN || url.origin))
        return json({ error: 'INVALID_ORIGIN' }, 403);
      if (req.headers.get('sec-fetch-site') === 'cross-site')
        return json({ error: 'INVALID_ORIGIN' }, 403);
    }
    if (!env.DB) return json({ error: 'SHOP_UNAVAILABLE' }, 503);
    if (path === '/api/status')
      return json({
        ready:
          (await getSettings(env)).shopOpen &&
          !!env.AUTH_SECRET &&
          !!(await env.DB.prepare('SELECT user_id FROM staff LIMIT 1').first()),
        email:
          env.REVIEW_MODE !== '1' && !!(env.RESEND_API_KEY && env.EMAIL_FROM),
        reviewMode: isReviewRequest(env, url.origin),
        payment: 'cash_on_delivery',
        ...paymentMethods(env),
        paymentEnabled: (await getSettings(env)).paymentEnabled,
        accepting: acceptingNow((await getSettings(env)).schedule),
        deliveryOptions: deliveryOptions((await getSettings(env)).schedule),
        upload: !!env.BUCKET,
        demo:
          env.LOCAL_DEMO === '1' &&
          ['localhost', '127.0.0.1'].includes(url.hostname),
      });
    if (path.startsWith('/api/auth/')) {
      if (
        env.REVIEW_MODE === '1' &&
        ![
          '/api/auth/sign-in/email',
          '/api/auth/sign-out',
          '/api/auth/get-session',
        ].includes(path)
      )
        return json({ error: 'REVIEW_ACCOUNT_LOCKED' }, 403);
      env = await mailEnvironment(env);
      if (
        path.endsWith('/request-password-reset') &&
        (env.REVIEW_MODE === '1' || !env.RESEND_API_KEY || !env.EMAIL_FROM)
      )
        return json({ error: 'EMAIL_NOT_CONFIGURED' }, 503);
      if (path.endsWith('/sign-in/email') && method === 'POST') {
        const b = await body(req.clone());
        if (
          isReviewRequest(env, url.origin) &&
          typeof b.email === 'string' &&
          /^[a-z0-9_-]{1,40}$/i.test(b.email.trim())
        ) {
          const alias = await env.DB.prepare(
            'SELECT u.email FROM review_accounts r JOIN user u ON u.id=r.user_id WHERE r.alias=?',
          )
            .bind(b.email.trim().toLowerCase())
            .first<{ email: string }>();
          if (!alias) return json({ error: 'INVALID_CREDENTIALS' }, 401);
          b.email = alias.email;
          req = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(b),
          });
        }

        const u = await env.DB.prepare(
          'SELECT p.disabled FROM profiles p JOIN user u ON u.id=p.user_id WHERE u.email=?',
        )
          .bind(String(b.email || '').toLowerCase())
          .first<{ disabled: number }>();
        if (u?.disabled) return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }
      return await authFor(env, url.origin).handler(req);
    }
    if (path === '/api/newsletter/confirm' && method === 'POST') {
      await throttle(req, env, 'confirm', 20);
      const b = await body(req);
      return json(
        await confirmSubscription(env, string(b.id, 80), string(b.token, 100)),
      );
    }
    if (path === '/api/newsletter/unsubscribe-link' && method === 'POST') {
      const b = await body(req);
      return json(
        await unsubscribeToken(env, string(b.id, 80), string(b.token, 100)),
      );
    }
    if (path === '/api/me/newsletter') {
      const u = await mustUser(req, env);
      if (method === 'GET') return json(await newsletterStatus(env, u.id));
      if (method === 'POST') {
        await throttle(req, env, 'subscribe', 10);
        const result = await subscribe(env, u, await body(req), url.origin);
        if (ctx) ctx.waitUntil(dispatchMail(env, url.origin));
        return json(result);
      }
    }
    if (path === '/api/admin/connections') {
      const u = await mustAdmin(req, env);
      if (method === 'POST') {
        const b = await body(req);
        await saveConnection(env, string(b.provider, 20), b.fields || {});
        await audit(env, u.id, 'payment.connection', b.provider).run();
      }
      return json({
        providers: await connectionStatus(env),
        methods: paymentMethods(await resolvePaymentEnv(env)),
      });
    }
    if (path === '/api/admin/email') {
      await mustAdmin(req, env);
      if (method === 'POST') {
        const b = await body(req),
          value = await privateSetting(env, 'email');
        if (b.apiKey) value.RESEND_API_KEY = string(b.apiKey, 500);
        if (b.from) value.EMAIL_FROM = email(b.from);
        await savePrivate(env, 'email', value);
      }
      const e = await mailEnvironment(env);
      return json({
        configured: !!(e.RESEND_API_KEY && e.EMAIL_FROM),
        from: e.EMAIL_FROM || '',
        local: env.LOCAL_DEMO === '1' || env.REVIEW_MODE === '1',
        preview:
          env.LOCAL_DEMO === '1' &&
          ['127.0.0.1', 'localhost'].includes(url.hostname),
      });
    }
    if (path === '/api/admin/newsletter') {
      await mustAdmin(req, env);
      if (method === 'POST') {
        const b = await body(req),
          d = { ...validateCampaign(b), revision: Date.now() },
          id = b.id ? string(b.id, 80) : crypto.randomUUID();
        await env.DB.prepare(
          "UPDATE mail_outbox SET state='cancelled' WHERE kind='marketing' AND id LIKE ? AND state IN ('queued','retry')",
        )
          .bind('campaign-' + id + '-%')
          .run();
        await env.DB.prepare(
          'INSERT INTO newsletter_campaigns(id,data,active,next_send_at,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,active=excluded.active,next_send_at=excluded.next_send_at,updated_at=excluded.updated_at',
        )
          .bind(
            id,
            JSON.stringify(d),
            d.active ? 1 : 0,
            d.nextSendAt,
            Date.now(),
            Date.now(),
          )
          .run();
      }
      const campaigns = await env.DB.prepare(
        'SELECT * FROM newsletter_campaigns ORDER BY created_at DESC LIMIT 100',
      ).all<CampaignRow>();
      const subscribers = await env.DB.prepare(
        'SELECT state,COUNT(*) n FROM newsletter_subscribers GROUP BY state',
      ).all();
      return json({
        campaigns: campaigns.results.map((c) => ({
          ...JSON.parse(c.data),
          id: c.id,
          active: !!c.active,
          nextSendAt: c.next_send_at,
        })),
        subscribers: subscribers.results,
      });
    }
    if (path === '/api/admin/mail' && method === 'GET') {
      await mustAdmin(req, env);
      const messages = await env.DB.prepare(
        'SELECT id,kind,recipient,state,attempts,error,created_at,sent_at FROM mail_outbox ORDER BY created_at DESC LIMIT 100',
      ).all();
      return json({ messages: messages.results });
    }
    if (path === '/api/admin/mail/process' && method === 'POST') {
      await mustAdmin(req, env);
      const { runJobs } = await import('./jobs');
      return json(await runJobs(env, url.origin));
    }
    if (path === '/api/admin/mail/preview' && method === 'POST') {
      await mustAdmin(req, env);
      if (
        env.LOCAL_DEMO !== '1' ||
        !['127.0.0.1', 'localhost'].includes(url.hostname)
      )
        fail('NOT_FOUND', 404);
      const b = await body(req),
        row = await env.DB.prepare('SELECT payload FROM mail_outbox WHERE id=?')
          .bind(string(b.id, 200))
          .first<{ payload: string }>();
      if (!row) fail('NOT_FOUND', 404);
      return json(await unseal(env, row.payload));
    }
    if (path === '/api/settings' && method === 'GET')
      return json({ settings: await getSettings(env) });
    if (path === '/api/quote' && method === 'POST') {
      await throttle(req, env, 'quote', 100);
      const b = await body(req),
        u = b.mode === 'guest' ? null : await identity(req, env);
      const q = await quote(env, b, await catalogue(env), u?.id || null);
      return json({
        subtotal: q.subtotal,
        discount: q.discount,
        newsletterDiscount: q.newsletterDiscount,
        delivery: q.delivery,
        total: q.total,
        tax: q.tax,
        couponCode: q.coupon?.code || '',
      });
    }
    if (path === '/api/admin/settings' && method === 'POST') {
      const u = await mustAdmin(req, env),
        s = validateSettings(await body(req));
      if (s.offer.couponCode) {
        const c = await env.DB.prepare(
          'SELECT data,active FROM coupons WHERE code=?',
        )
          .bind(s.offer.couponCode)
          .first<Pick<CouponRow, 'data' | 'active'>>();
        if (!c || !c.active || JSON.parse(c.data).customerId)
          fail('INVALID_COUPON');
      }
      await env.DB.batch([
        env.DB.prepare(
          "INSERT INTO settings(key,value,updated_at) VALUES('shop',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
        ).bind(JSON.stringify(s), Date.now()),
        audit(env, u.id, 'settings.save', 'shop'),
      ]);
      return json({ settings: s });
    }
    if (path === '/api/admin/coupons' && method === 'GET') {
      await mustAdmin(req, env);
      const rows = await env.DB.prepare(
        'SELECT c.*,(SELECT COUNT(*) FROM coupon_redemptions r WHERE r.code=c.code AND r.released=0) AS used FROM coupons c ORDER BY updated_at DESC',
      ).all<CouponRow>();
      return json({
        coupons: rows.results.map((r) => ({
          ...JSON.parse(r.data),
          active: !!r.active,
          version: r.version,
          used: r.used,
        })),
      });
    }
    if (path === '/api/admin/coupons' && method === 'POST') {
      const u = await mustAdmin(req, env),
        c = validateCoupon(await body(req));
      if (
        c.customerId &&
        !(await env.DB.prepare('SELECT id FROM user WHERE id=?')
          .bind(c.customerId)
          .first())
      )
        fail('INVALID_INPUT');
      const row = await env.DB.prepare(
        'INSERT INTO coupons(code,data,active,version,updated_at) SELECT ?,?,?,1,? WHERE ?=0 OR EXISTS(SELECT 1 FROM coupons WHERE code=?) ON CONFLICT(code) DO UPDATE SET data=excluded.data,active=excluded.active,version=coupons.version+1,updated_at=excluded.updated_at WHERE coupons.version=? RETURNING code',
      )
        .bind(
          c.code,
          JSON.stringify(c),
          c.active ? 1 : 0,
          Date.now(),
          c.version,
          c.code,
          c.version,
        )
        .first();
      if (!row) fail('EDIT_CONFLICT', 409);
      await audit(env, u.id, 'coupon.save', c.code).run();
      return json({ ok: true });
    }
    if (path === '/api/admin/reports' && method === 'GET') {
      await mustAdmin(req, env);
      const from = Number(url.searchParams.get('from')),
        to = Number(url.searchParams.get('to'));
      if (
        !Number.isSafeInteger(from) ||
        !Number.isSafeInteger(to) ||
        from < 0 ||
        to <= from ||
        to - from > 370 * 86400000
      )
        fail('INVALID_INPUT');
      const rows = await env.DB.prepare(
        'SELECT o.*,p.state payment_state FROM orders o LEFT JOIN payments p ON p.order_id=o.id WHERE o.paid_at>=? AND o.paid_at<? ORDER BY o.paid_at',
      )
        .bind(from, to)
        .all<OrderRow & { payment_state: string | null }>();
      return json({
        orders: rows.results.map((r) => ({
          ...orderJSON(r),
          paymentState: r.payment_state,
        })),
      });
    }
    if (path === '/api/products' && method === 'GET')
      return json({ products: await catalogue(env) });
    if (path === '/api/me' && method === 'GET')
      return json({ user: await identity(req, env) });
    if (path === '/api/me' && method === 'PATCH') {
      const u = await mustUser(req, env),
        b = await body(req);
      const name = string(b.name, 120),
        phone = string(b.phone || '', 40, false),
        address = string(b.address || '', 500, false),
        postcode = string(b.postcode ?? u.postcode, 5, false),
        city = string(b.city ?? u.city, 80);
      if (postcode) validateHamburg({ city, postcode });
      if (!['de', 'uk', 'en', 'fa'].includes(b.language)) fail('INVALID_INPUT');
      await env.DB.batch([
        env.DB.prepare('UPDATE user SET name=?,updatedAt=? WHERE id=?').bind(
          name,
          Date.now(),
          u.id,
        ),
        env.DB.prepare(
          'INSERT INTO profiles(user_id,phone,address,language,postcode,city) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,address=excluded.address,language=excluded.language,postcode=excluded.postcode,city=excluded.city',
        ).bind(u.id, phone, address, b.language, postcode, city),
      ]);
      return json({ ok: true });
    }
    if (path === '/api/me/email' && method === 'POST') {
      const u = await mustUser(req, env);
      if (env.REVIEW_MODE === '1') fail('REVIEW_ACCOUNT_LOCKED', 403);
      await throttle(req, env, 'email-change', 5);
      const b = await body(req),
        newEmail = email(b.email);
      const credential = await env.DB.prepare(
        "SELECT password FROM account WHERE userId=? AND providerId='credential'",
      )
        .bind(u.id)
        .first<{ password: string | null }>();
      if (
        !credential?.password ||
        !(await verifyPassword({
          hash: credential.password,
          password: string(b.password, 128),
        }))
      )
        fail('INVALID_CREDENTIALS', 401);
      if (
        await env.DB.prepare('SELECT id FROM user WHERE email=? AND id!=?')
          .bind(newEmail, u.id)
          .first()
      )
        fail('USER_ALREADY_EXISTS', 409);
      await env.DB.batch([
        env.DB.prepare(
          'UPDATE user SET email=?,emailVerified=0,updatedAt=? WHERE id=?',
        ).bind(newEmail, Date.now(), u.id),
        env.DB.prepare('DELETE FROM session WHERE userId=?').bind(u.id),
      ]);
      const subscription = await env.DB.prepare(
        'SELECT id FROM newsletter_subscribers WHERE user_id=?',
      )
        .bind(u.id)
        .first<{ id: string }>();
      if (subscription) await unsubscribe(env, subscription.id);
      return json({ ok: true });
    }
    if (path === '/api/orders' && method === 'POST') {
      if (!(await env.DB.prepare('SELECT user_id FROM staff LIMIT 1').first()))
        fail('SHOP_UNAVAILABLE', 503);
      await throttle(req, env, 'checkout');
      const b = await body(req),
        u = b.mode === 'guest' ? null : await identity(req, env);
      if (b.mode !== 'guest' && !u) fail('SIGN_IN_REQUIRED', 401);
      if (
        !['cash_on_delivery', 'stripe', 'paypal', 'sumup', 'revolut'].includes(
          b.payment,
        )
      )
        fail('INVALID_PAYMENT');
      if (
        b.payment !== 'cash_on_delivery' &&
        !paymentMethods(env)[
          b.payment as 'stripe' | 'paypal' | 'sumup' | 'revolut'
        ]
      )
        fail('PAYMENT_UNAVAILABLE', 503);
      if (env.PAYMENT_ENABLED?.[b.payment] === false)
        fail('PAYMENT_DISABLED', 503);
      const fingerprint = await hash(JSON.stringify(b)),
        clientKey = await hash(b.key || '');
      const existing = await env.DB.prepare(
        'SELECT * FROM orders WHERE client_key=?',
      )
        .bind(clientKey)
        .first<OrderRow>();
      if (existing) {
        if (
          existing.request_hash !== fingerprint ||
          existing.user_id !== (u?.id ?? null)
        )
          fail('IDEMPOTENCY_CONFLICT', 409);
        return json({ order: orderJSON(existing) }, 200);
      }
      const catalog = await catalogue(env),
        o = validateOrder(
          b,
          catalog,
          new Date(),
          (await getSettings(env)).schedule,
        ),
        area = validateHamburg(b.customer),
        q = await quote(env, b, catalog, u?.id || null);
      if (!q.settings.shopOpen) fail('SHOP_UNAVAILABLE', 503);
      const id = crypto.randomUUID(),
        now = Date.now(),
        tokenHash = await hash(b.guestToken);
      const insert = env.DB.prepare(
        'INSERT INTO orders(id,user_id,guest_hash,client_key,request_hash,customer,items,subtotal,delivery,total,payment,date,time,zone,created_at,updated_at,discount,coupon_code,tax) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      ).bind(
        id,
        u?.id || null,
        u ? null : tokenHash,
        clientKey,
        fingerprint,
        JSON.stringify({
          ...o.customer,
          ...area,
          newsletterDiscount: q.newsletterDiscount,
          leadHours: [5, 6],
        }),
        JSON.stringify(
          q.items.map((item, i) => ({
            ...item,
            discountShare: q.discountShares[i],
          })),
        ),
        q.subtotal,
        q.delivery,
        q.total,
        b.payment,
        o.date,
        o.time,
        q.settings.deliveryMode === 'quote' ? 'unknown' : o.zone,
        now,
        now,
        q.discount,
        q.coupon?.code || null,
        JSON.stringify(q.tax),
      );
      try {
        await env.DB.batch([
          insert,
          ...(u && b.saveAddress === true
            ? [
                env.DB.prepare(
                  'INSERT INTO profiles(user_id,phone,address,language,postcode,city) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,address=excluded.address,language=excluded.language,postcode=excluded.postcode,city=excluded.city',
                ).bind(
                  u.id,
                  o.customer.phone,
                  o.customer.address,
                  b.language,
                  area.postcode,
                  area.city,
                ),
              ]
            : []),
          ...(q.coupon
            ? [
                env.DB.prepare(
                  'INSERT INTO coupon_redemptions(order_id,code,user_key,coupon_version,created_at) VALUES(?,?,?,?,?)',
                ).bind(id, q.coupon.code, u?.id || null, q.coupon.version, now),
              ]
            : []),
          env.DB.prepare(
            'INSERT INTO order_events(id,order_id,status,note,created_at) VALUES(?,?,?,?,?)',
          ).bind(crypto.randomUUID(), id, 'new', '', now),
        ]);
      } catch (e) {
        const race = await env.DB.prepare(
          'SELECT * FROM orders WHERE client_key=?',
        )
          .bind(clientKey)
          .first<OrderRow>();
        if (
          race &&
          race.request_hash === fingerprint &&
          race.user_id === (u?.id ?? null)
        )
          return json({ order: orderJSON(race) });
        if (String(e).includes('COUPON_')) fail('COUPON_LIMIT', 409);
        throw e;
      }
      return json(
        {
          order: orderJSON(
            await env.DB.prepare('SELECT * FROM orders WHERE id=?')
              .bind(id)
              .first(),
          ),
        },
        201,
      );
    }
    const messageRoute =
      /^\/api\/(admin\/)?orders\/([a-f0-9-]+)\/messages$/.exec(path);
    if (messageRoute && (method === 'GET' || method === 'POST')) {
      const staffRoute = !!messageRoute[1],
        id = messageRoute[2];
      const viewer = staffRoute
        ? await mustAdmin(req, env)
        : await identity(req, env);
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(id)
        .first<OrderRow>();
      if (!row) fail('NOT_FOUND', 404);
      if (!staffRoute) {
        const token = req.headers.get('X-Order-Token');
        const allowed = viewer && (viewer.id === row.user_id || viewer.admin);
        if (
          !allowed &&
          !(
            token &&
            row.guest_hash &&
            ((await hash(token)) === row.guest_hash ||
              equal(token, await capability(env, 'order:' + id)))
          )
        )
          fail('NOT_FOUND', 404);
      }
      await throttle(
        req,
        env,
        method === 'POST' ? 'order-message-send' : 'order-message-read',
        method === 'POST' ? 40 : 180,
      );
      if (method === 'GET')
        return json(
          await listOrderMessages(env, id, url.searchParams.get('before')),
        );
      const message = await createOrderMessage(
        env,
        id,
        viewer?.admin ? 'team' : 'customer',
        await body(req),
      );
      return json({ message });
    }
    if (path === '/api/orders' && method === 'GET') {
      const u = await mustUser(req, env);
      const rows = await env.DB.prepare(
        'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      )
        .bind(u.id)
        .all<OrderRow>();
      return json({ orders: rows.results.map(orderJSON) });
    }
    if (/^\/api\/orders\/[a-f0-9-]+$/.test(path) && method === 'GET') {
      await throttle(req, env, 'tracking', 120);
      const id = path.split('/').pop();
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(id)
        .first<OrderRow>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env);
      const token = req.headers.get('X-Order-Token');
      if (
        !(u && (u.id === row.user_id || u.admin)) &&
        !(
          token &&
          row.guest_hash &&
          ((await hash(token)) === row.guest_hash ||
            equal(token, await capability(env, 'order:' + row.id)))
        )
      )
        fail('NOT_FOUND', 404);
      const events = await env.DB.prepare(
        'SELECT id,status,note,created_at FROM order_events WHERE order_id=? ORDER BY created_at',
      )
        .bind(id)
        .all();
      return json({ order: orderJSON(row), events: events.results });
    }
    if (
      /^\/api\/orders\/[a-f0-9-]+\/documents\/(invoice|summary|receipt)$/.test(
        path,
      ) &&
      method === 'GET'
    ) {
      const parts = path.split('/'),
        id = parts[3],
        kind = parts[5],
        row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
          .bind(id)
          .first<OrderRow>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env),
        token = req.headers.get('X-Order-Token');
      if (
        !(u && (u.id === row.user_id || u.admin)) &&
        !(
          token &&
          row.guest_hash &&
          ((await hash(token)) === row.guest_hash ||
            equal(token, await capability(env, 'order:' + id)))
        )
      )
        fail('NOT_FOUND', 404);
      const { getDocument, renderDocument } = await import('./documents');
      const bytes = await renderDocument(await getDocument(env, row, kind));
      return new Response(new Uint8Array(bytes).buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Sushi-HH-${kind}-${id.slice(0, 8)}.pdf"`,
          'Cache-Control': 'private,no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }
    if (
      /^\/api\/orders\/[a-f0-9-]+\/delivery$/.test(path) &&
      method === 'PATCH'
    ) {
      const id = path.split('/')[3],
        row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
          .bind(id)
          .first<OrderRow>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env),
        token = req.headers.get('X-Order-Token');
      if (
        !(u && u.id === row.user_id) &&
        !(
          token &&
          row.guest_hash &&
          ((await hash(token)) === row.guest_hash ||
            equal(token, await capability(env, 'order:' + id)))
        )
      )
        fail('NOT_FOUND', 404);
      const b = await body(req),
        s = await getSettings(env);
      if (!s.shopOpen || !validSlot(s.schedule, b.date, b.time))
        fail('INVALID_DELIVERY');
      const changed = await env.DB.prepare(
        "UPDATE orders SET date=?,time=?,version=version+1,updated_at=? WHERE id=? AND paid=0 AND payment!='cash_on_delivery' AND status IN ('new','confirmed') AND version=? RETURNING *",
      )
        .bind(b.date, b.time, Date.now(), id, row.version)
        .first<OrderRow>();
      if (!changed) fail('EDIT_CONFLICT', 409);
      return json({ order: orderJSON(changed) });
    }
    if (/^\/api\/payments\/(start|sync)$/.test(path) && method === 'POST') {
      await throttle(req, env, 'payment', 30);
      const b = await body(req);
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(string(b.orderId, 80))
        .first<OrderRow>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env);
      const token = req.headers.get('X-Order-Token');
      if (
        !(u && u.id === row.user_id) &&
        !(
          token &&
          row.guest_hash &&
          ((await hash(token)) === row.guest_hash ||
            equal(token, await capability(env, 'order:' + row.id)))
        )
      )
        fail('NOT_FOUND', 404);
      if (path.endsWith('/start')) {
        const s = await getSettings(env);
        if (!s.shopOpen) fail('SHOP_UNAVAILABLE', 503);
        if (!row.paid && !validSlot(s.schedule, row.date, row.time))
          fail('DELIVERY_SLOT_EXPIRED', 409);
      }
      const result = path.endsWith('/start')
        ? await startPayment(env, row, url.origin)
        : await reconcilePayment(env, row.id, true);
      if (result.paid) {
        const { ensureDocuments } = await import('./documents');
        await ensureDocuments(env, row.id);
        if (ctx) ctx.waitUntil(dispatchMail(env, url.origin));
      }
      return json(result);
    }
    if (path === '/api/admin/order-feed' && method === 'GET') {
      await mustAdmin(req, env);
      const known = url.searchParams.get('revision') || '';
      const deadline = Date.now() + 20000;
      let checks = 0;
      for (;;) {
        if (req.signal.aborted) return new Response(null, { status: 204 });
        const stamp = await env.DB.prepare(
          'SELECT COUNT(*) n,COALESCE(SUM(version),0) v,COALESCE(MAX(updated_at),0) updated FROM orders',
        ).first<{ n: number; v: number; updated: number }>();
        if (!stamp) fail('SERVER_ERROR', 500);
        const revision = `${stamp.n}:${stamp.v}:${stamp.updated}`;
        if (revision !== known) {
          await mustAdmin(req, env);
          const orders = await env.DB.prepare(
            'SELECT * FROM orders ORDER BY COALESCE(paid_at,created_at) DESC LIMIT 300',
          ).all<OrderRow>();
          const overview = await env.DB.prepare(
            "SELECT COUNT(*) AS orders,SUM(CASE WHEN status NOT IN ('cancelled','delivered') THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN paid=1 AND status!='cancelled' THEN total ELSE 0 END) AS revenue FROM orders",
          ).first();
          return json({
            revision,
            orders: orders.results.map(orderJSON),
            overview,
          });
        }
        if (Date.now() >= deadline) return json({ revision });
        await new Promise<void>((resolve) => {
          const done = () => {
            clearTimeout(timer);
            req.signal.removeEventListener('abort', done);
            resolve();
          };
          const timer = setTimeout(done, 1000);
          req.signal.addEventListener('abort', done, { once: true });
          if (req.signal.aborted) done();
        });
        if (++checks % 5 === 0) await mustAdmin(req, env);
      }
    }
    if (path === '/api/admin/overview' && method === 'GET') {
      await mustAdmin(req, env);
      const count = await env.DB.prepare(
        "SELECT COUNT(*) AS orders,SUM(CASE WHEN status NOT IN ('cancelled','delivered') THEN 1 ELSE 0 END) AS pending,SUM(CASE WHEN paid=1 AND status!='cancelled' THEN total ELSE 0 END) AS revenue FROM orders",
      ).first();
      return json(count);
    }
    if (path === '/api/admin/orders' && method === 'GET') {
      await mustAdmin(req, env);
      const rows = await env.DB.prepare(
        'SELECT * FROM orders ORDER BY created_at DESC LIMIT 300',
      ).all<OrderRow>();
      return json({ orders: rows.results.map(orderJSON) });
    }
    if (/^\/api\/admin\/orders\/[a-f0-9-]+$/.test(path) && method === 'PATCH') {
      const u = await mustAdmin(req, env),
        id = path.split('/').pop()!,
        b = await body(req);
      if (!statuses.includes(b.status) || !Number.isInteger(b.version))
        fail('INVALID_INPUT');
      const old = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(id)
        .first<OrderRow>();
      if (!old) fail('NOT_FOUND', 404);
      if (old.version !== b.version) fail('EDIT_CONFLICT', 409);
      const delivery = b.delivery === null ? null : b.delivery;
      if (
        delivery !== null &&
        (!Number.isInteger(delivery) || delivery < 0 || delivery > 30000)
      )
        fail('INVALID_INPUT');
      if (b.status !== 'new' && b.status !== 'cancelled' && delivery === null)
        fail('DELIVERY_REQUIRED');
      if (
        old.payment !== 'cash_on_delivery' &&
        Boolean(b.paid) !== Boolean(old.paid)
      )
        fail('PAYMENT_PROVIDER_ONLY');
      if (old.paid && b.status === 'cancelled') fail('REFUND_REQUIRED');
      if (
        (delivery !== old.delivery || b.status === 'cancelled') &&
        (await env.DB.prepare('SELECT order_id FROM payments WHERE order_id=?')
          .bind(id)
          .first())
      )
        fail('PAYMENT_AMOUNT_LOCKED');
      const now = Date.now();
      if (old.status === 'cancelled' && b.status !== 'cancelled')
        fail('EDIT_CONFLICT', 409);
      if (old.paid && (delivery !== old.delivery || b.paid !== true))
        fail('REFUND_REQUIRED');
      if (b.paid && delivery === null) fail('DELIVERY_REQUIRED');
      if (typeof b.paid !== 'boolean' || (b.status === 'cancelled' && b.paid))
        fail('INVALID_INPUT');
      const note = string(b.note || '', 500, false);
      const storedArrival = old.estimated_arrival_at ?? null;
      const estimatedArrival =
        Object.hasOwn(b, 'estimatedArrivalAt') &&
        b.estimatedArrivalAt !== storedArrival
          ? validateEstimatedArrival(b.estimatedArrivalAt)
          : storedArrival;
      const taxMode = old.tax ? JSON.parse(old.tax).mode : 'unset';
      const pricing = totals(
        JSON.parse(old.items),
        delivery,
        { ...defaultSettings, taxMode },
        old.discount
          ? ({
              type: 'fixed',
              amount: old.discount,
              productIds: [],
            } satisfies Pick<Coupon, 'type' | 'amount' | 'productIds'>)
          : undefined,
      );
      const result = await env.DB.prepare(
        "UPDATE orders SET status=?,delivery=?,total=?,paid=?,paid_at=?,tax=?,estimated_arrival_at=?,updated_at=?,version=version+1 WHERE id=? AND version=? AND ((delivery IS ? AND ?!='cancelled') OR NOT EXISTS(SELECT 1 FROM payments WHERE order_id=orders.id)) RETURNING *",
      )
        .bind(
          b.status,
          delivery,
          pricing.total,
          b.paid === true ? 1 : 0,
          b.paid ? old.paid_at || now : old.paid_at,
          JSON.stringify(pricing.tax),
          estimatedArrival,
          now,
          id,
          b.version,
          delivery,
          b.status,
        )
        .first<OrderRow>();
      if (!result) fail('EDIT_CONFLICT', 409);
      await env.DB.batch([
        ...(b.status === 'cancelled'
          ? [
              env.DB.prepare(
                'UPDATE coupon_redemptions SET released=1 WHERE order_id=?',
              ).bind(id),
            ]
          : []),
        env.DB.prepare(
          'INSERT INTO order_events(id,order_id,status,note,created_at) VALUES(?,?,?,?,?)',
        ).bind(crypto.randomUUID(), id, b.status, note, now),
        audit(env, u.id, 'order.update', id),
      ]);
      const { ensureDocuments } = await import('./documents');
      await ensureDocuments(env, id);
      if (ctx) ctx.waitUntil(dispatchMail(env, url.origin));
      return json({ ok: true, order: orderJSON(result) });
    }
    if (path === '/api/admin/products' && method === 'GET') {
      await mustAdmin(req, env);
      return json({ products: await catalogue(env, true) });
    }
    if (path === '/api/admin/products' && method === 'POST') {
      const u = await mustAdmin(req, env),
        b = await body(req),
        p = validateProduct(b),
        old = (await catalogue(env, true)).find((product) => product.id === p.id);
      if (old && old.version !== b.version) fail('EDIT_CONFLICT', 409);
      if (old === undefined && b.version !== 0) fail('EDIT_CONFLICT', 409);
      const row = await env.DB.prepare(
        'INSERT INTO catalog(id,data,active,version,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,active=excluded.active,version=catalog.version+1,updated_at=excluded.updated_at WHERE catalog.version=? RETURNING id',
      )
        .bind(
          p.id,
          JSON.stringify(p),
          p.active === false ? 0 : 1,
          Date.now(),
          b.version,
        )
        .first();
      if (!row) fail('EDIT_CONFLICT', 409);
      await audit(env, u.id, 'product.save', p.id).run();
      if (!old && p.active !== false) await newProductCampaign(env, productForDisplay(p));
      return json({ ok: true });
    }
    if (path === '/api/admin/customers' && method === 'GET') {
      await mustAdmin(req, env);
      const rows = await env.DB.prepare(
        'SELECT u.id,u.name,u.email,u.emailVerified,u.createdAt,p.phone,p.address,p.postcode,p.city,p.disabled,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders FROM user u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id NOT IN (SELECT user_id FROM staff) ORDER BY u.createdAt DESC LIMIT 500',
      ).all();
      return json({ customers: rows.results });
    }
    if (path === '/api/admin/customers' && method === 'POST') {
      if (env.REVIEW_MODE === '1') {
        await mustAdmin(req, env);
        fail('REVIEW_ACCOUNT_LOCKED', 403);
      }
      const u = await mustAdmin(req, env),
        b = await body(req);
      const result = await authFor(env, url.origin).api.signUpEmail({
        body: {
          name: string(b.name, 120),
          email: email(b.email),
          password: crypto.randomUUID() + crypto.randomUUID(),
        },
      });
      let link = '';
      await authFor(env, url.origin, (v) => {
        link = v;
      }).api.requestPasswordReset({
        body: {
          email: result.user.email,
          redirectTo: url.origin + '/account/reset',
        },
      });
      await audit(env, u.id, 'customer.invite', result.user.id).run();
      return json({ ok: true, link }, 201);
    }
    if (/^\/api\/admin\/customers\/[^/]+$/.test(path) && method === 'PATCH') {
      const u = await mustAdmin(req, env),
        id = path.split('/').pop()!,
        b = await body(req);
      if (
        await env.DB.prepare('SELECT user_id FROM staff WHERE user_id=?')
          .bind(id)
          .first()
      )
        fail('FORBIDDEN', 403);
      const customer = await env.DB.prepare(
        'SELECT id,email FROM user WHERE id=?',
      )
        .bind(id)
        .first<{ id: string; email: string }>();
      if (!customer) fail('NOT_FOUND', 404);
      if (
        env.REVIEW_MODE === '1' &&
        (b.action === 'reset' || b.action === 'disable') &&
        (await env.DB.prepare(
          'SELECT alias FROM review_accounts WHERE user_id=?',
        )
          .bind(id)
          .first())
      )
        fail('REVIEW_ACCOUNT_LOCKED', 403);
      if (b.action === 'reset') {
        let link = '';
        await authFor(env, url.origin, (v) => {
          link = v;
        }).api.requestPasswordReset({
          body: {
            email: customer.email,
            redirectTo: url.origin + '/account/reset',
          },
        });
        await audit(env, u.id, 'customer.reset', id).run();
        return json({ ok: true, link });
      }
      if (b.action === 'disable' || b.action === 'enable') {
        await env.DB.batch([
          env.DB.prepare(
            'INSERT INTO profiles(user_id,disabled) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET disabled=excluded.disabled',
          ).bind(id, b.action === 'disable' ? 1 : 0),
          env.DB.prepare('DELETE FROM session WHERE userId=?').bind(id),
          audit(env, u.id, `customer.${b.action}`, id),
        ]);
        return json({ ok: true });
      }
      if (b.action === 'edit') {
        await env.DB.batch([
          env.DB.prepare('UPDATE user SET name=?,updatedAt=? WHERE id=?').bind(
            string(b.name, 120),
            Date.now(),
            id,
          ),
          env.DB.prepare(
            'INSERT INTO profiles(user_id,phone,address) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,address=excluded.address',
          ).bind(
            id,
            string(b.phone || '', 40, false),
            string(b.address || '', 500, false),
          ),
          audit(env, u.id, 'customer.edit', id),
        ]);
        return json({ ok: true });
      }
      fail('INVALID_INPUT');
    }
    if (/^\/api\/admin\/customers\/[^/]+$/.test(path) && method === 'DELETE') {
      const u = await mustAdmin(req, env),
        id = path.split('/').pop()!,
        b = await body(req);
      if (
        await env.DB.prepare('SELECT user_id FROM staff WHERE user_id=?')
          .bind(id)
          .first()
      )
        fail('FORBIDDEN', 403);
      const c = await env.DB.prepare('SELECT email FROM user WHERE id=?')
        .bind(id)
        .first<{ email: string }>();
      if (!c || b.confirmEmail !== c.email) fail('INVALID_INPUT');
      if (
        env.REVIEW_MODE === '1' &&
        (await env.DB.prepare(
          'SELECT alias FROM review_accounts WHERE user_id=?',
        )
          .bind(id)
          .first())
      )
        fail('REVIEW_ACCOUNT_LOCKED', 403);
      await env.DB.batch([
        audit(env, u.id, 'customer.delete', id),
        env.DB.prepare('DELETE FROM user WHERE id=?').bind(id),
      ]);
      return json({ ok: true });
    }
    if (path === '/api/admin/media' && method === 'POST') {
      const u = await mustAdmin(req, env);
      if (!env.BUCKET) fail('UPLOAD_UNAVAILABLE', 503);
      const length = Number(req.headers.get('content-length') || 0);
      if (length > 12000000) fail('TOO_LARGE', 413);
      const bytes = await limitedBytes(req, 12000000);
      if (bytes.byteLength > 12000000 || bytes.byteLength < 12)
        fail('INVALID_IMAGE');
      const v = new Uint8Array(bytes);
      let ext = '',
        mime = '';
      if (v[0] === 255 && v[1] === 216 && v[2] === 255) {
        ext = 'jpg';
        mime = 'image/jpeg';
      } else if (v[0] === 137 && v[1] === 80 && v[2] === 78 && v[3] === 71) {
        ext = 'png';
        mime = 'image/png';
      } else if (
        new TextDecoder().decode(v.slice(0, 4)) === 'RIFF' &&
        new TextDecoder().decode(v.slice(8, 12)) === 'WEBP'
      ) {
        ext = 'webp';
        mime = 'image/webp';
      } else fail('INVALID_IMAGE');
      const key = crypto.randomUUID() + '.' + ext;
      await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime } });
      await audit(env, u.id, 'media.upload', key).run();
      return json({ url: '/api/media/' + key });
    }
    if (
      /^\/api\/media\/[a-f0-9-]+\.(jpg|png|webp)$/.test(path) &&
      method === 'GET'
    ) {
      const file = await env.BUCKET?.get(path.split('/').pop()!);
      if (!file) return json({ error: 'NOT_FOUND' }, 404);
      return new Response(file.body, {
        headers: {
          'Content-Type':
            file.httpMetadata?.contentType || 'application/octet-stream',
          'Cache-Control': 'public,max-age=31536000,immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return json({ error: 'NOT_FOUND' }, 404);
  } catch (error) {
    if (error instanceof ShopError)
      return json({ error: error.code }, error.status);
    if (error instanceof Error && error.message === 'AUTH_NOT_CONFIGURED')
      return json({ error: 'SHOP_UNAVAILABLE' }, 503);
    console.error(
      'Shop request failed',
      error instanceof Error ? error.name : 'Unknown',
    );
    return json({ error: 'SERVER_ERROR' }, 500);
  }
}
