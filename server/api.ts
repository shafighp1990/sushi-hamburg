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
import { authFor, type ShopEnv } from './auth';
import { products, type Product } from '../lib/catalog';
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
async function limitedBytes(req: Request, max: number) {
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
async function body(req: Request) {
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
  ).all<any>();
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
  return all ? result : result.filter((p) => p.active !== false);
}
async function identity(req: Request, env: PaymentEnv) {
  const s = await authFor(env, new URL(req.url).origin).api.getSession({
    headers: req.headers,
  });
  if (!s) return null;
  const p = await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?')
    .bind(s.user.id)
    .first<any>();
  if (p?.disabled) fail('ACCOUNT_DISABLED', 403);
  const role = await env.DB.prepare('SELECT user_id FROM staff WHERE user_id=?')
    .bind(s.user.id)
    .first();
  return {
    ...s.user,
    phone: p?.phone || '',
    address: p?.address || '',
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
    .first<any>();
  if (row.count > max) fail('TOO_MANY_REQUESTS', 429);
}
function orderJSON(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    customer: JSON.parse(row.customer),
    items: JSON.parse(row.items),
    subtotal: row.subtotal,
    discount: row.discount || 0,
    couponCode: row.coupon_code,
    tax: row.tax ? JSON.parse(row.tax) : null,
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
  };
}
export async function handleShop(
  req: Request,
  env: PaymentEnv,
): Promise<Response> {
  try {
    const url = new URL(req.url),
      path = url.pathname.replace(/\/$/, '');
    const method = req.method;
    if (path.startsWith('/api/webhooks/') && method === 'POST')
      return json(await paymentWebhook(req, env, path.split('/').pop()!));
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
        email: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
        payment: 'cash_on_delivery',
        ...paymentMethods(env),
        upload: !!env.BUCKET,
        demo:
          env.LOCAL_DEMO === '1' &&
          ['localhost', '127.0.0.1'].includes(url.hostname),
      });
    if (path.startsWith('/api/auth/')) {
      if (
        path.endsWith('/request-password-reset') &&
        (!env.RESEND_API_KEY || !env.EMAIL_FROM)
      )
        return json({ error: 'EMAIL_NOT_CONFIGURED' }, 503);
      if (path.endsWith('/sign-in/email') && method === 'POST') {
        const b = await body(req.clone() as Request);
        const u = await env.DB.prepare(
          'SELECT p.disabled FROM profiles p JOIN user u ON u.id=p.user_id WHERE u.email=?',
        )
          .bind(String(b.email || '').toLowerCase())
          .first<any>();
        if (u?.disabled) return json({ error: 'INVALID_CREDENTIALS' }, 401);
      }
      return await authFor(env, url.origin).handler(req as any);
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
          .first<any>();
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
      ).all<any>();
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
        .all<any>();
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
        address = string(b.address || '', 500, false);
      if (!['de', 'uk', 'en', 'fa'].includes(b.language)) fail('INVALID_INPUT');
      await env.DB.batch([
        env.DB.prepare('UPDATE user SET name=?,updatedAt=? WHERE id=?').bind(
          name,
          Date.now(),
          u.id,
        ),
        env.DB.prepare(
          'INSERT INTO profiles(user_id,phone,address,language) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,address=excluded.address,language=excluded.language',
        ).bind(u.id, phone, address, b.language),
      ]);
      return json({ ok: true });
    }
    if (path === '/api/me/email' && method === 'POST') {
      const u = await mustUser(req, env);
      await throttle(req, env, 'email-change', 5);
      const b = await body(req),
        newEmail = email(b.email);
      const credential = await env.DB.prepare(
        "SELECT password FROM account WHERE userId=? AND providerId='credential'",
      )
        .bind(u.id)
        .first<any>();
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
      return json({ ok: true });
    }
    if (path === '/api/orders' && method === 'POST') {
      if (!(await env.DB.prepare('SELECT user_id FROM staff LIMIT 1').first()))
        fail('SHOP_UNAVAILABLE', 503);
      await throttle(req, env, 'checkout');
      const b = await body(req),
        u = b.mode === 'guest' ? null : await identity(req, env);
      if (b.mode !== 'guest' && !u) fail('SIGN_IN_REQUIRED', 401);
      if (!['cash_on_delivery', 'stripe', 'paypal'].includes(b.payment))
        fail('INVALID_PAYMENT');
      if (
        b.payment !== 'cash_on_delivery' &&
        !paymentMethods(env)[b.payment as 'stripe' | 'paypal']
      )
        fail('PAYMENT_UNAVAILABLE', 503);
      const fingerprint = await hash(JSON.stringify(b)),
        clientKey = await hash(b.key || '');
      const existing = await env.DB.prepare(
        'SELECT * FROM orders WHERE client_key=?',
      )
        .bind(clientKey)
        .first<any>();
      if (existing) {
        if (
          existing.request_hash !== fingerprint ||
          existing.user_id !== (u?.id ?? null)
        )
          fail('IDEMPOTENCY_CONFLICT', 409);
        return json({ order: orderJSON(existing) }, 200);
      }
      const catalog = await catalogue(env),
        o = validateOrder(b, catalog),
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
        JSON.stringify({ ...o.customer, ...area }),
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
          .first<any>();
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
    if (path === '/api/orders' && method === 'GET') {
      const u = await mustUser(req, env);
      const rows = await env.DB.prepare(
        'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100',
      )
        .bind(u.id)
        .all();
      return json({ orders: rows.results.map(orderJSON) });
    }
    if (/^\/api\/orders\/[a-f0-9-]+$/.test(path) && method === 'GET') {
      await throttle(req, env, 'tracking', 120);
      const id = path.split('/').pop();
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(id)
        .first<any>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env);
      const token = req.headers.get('X-Order-Token');
      if (
        !(u && (u.id === row.user_id || u.admin)) &&
        !(token && row.guest_hash && (await hash(token)) === row.guest_hash)
      )
        fail('NOT_FOUND', 404);
      const events = await env.DB.prepare(
        'SELECT status,note,created_at FROM order_events WHERE order_id=? ORDER BY created_at',
      )
        .bind(id)
        .all();
      return json({ order: orderJSON(row), events: events.results });
    }
    if (/^\/api\/payments\/(start|sync)$/.test(path) && method === 'POST') {
      await throttle(req, env, 'payment', 30);
      const b = await body(req);
      const row = await env.DB.prepare('SELECT * FROM orders WHERE id=?')
        .bind(string(b.orderId, 80))
        .first<any>();
      if (!row) fail('NOT_FOUND', 404);
      const u = await identity(req, env);
      const token = req.headers.get('X-Order-Token');
      if (
        !(u && u.id === row.user_id) &&
        !(token && row.guest_hash && (await hash(token)) === row.guest_hash)
      )
        fail('NOT_FOUND', 404);
      return json(
        path.endsWith('/start')
          ? await startPayment(env, row, url.origin)
          : await reconcilePayment(env, row.id, true),
      );
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
      ).all();
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
        .first<any>();
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
        delivery !== old.delivery &&
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
      const taxMode = old.tax ? JSON.parse(old.tax).mode : 'unset';
      const pricing = totals(
        JSON.parse(old.items),
        delivery,
        { ...defaultSettings, taxMode },
        old.discount
          ? ({ type: 'fixed', amount: old.discount, productIds: [] } as any)
          : undefined,
      );
      const result = await env.DB.prepare(
        'UPDATE orders SET status=?,delivery=?,total=?,paid=?,paid_at=?,tax=?,updated_at=?,version=version+1 WHERE id=? AND version=? RETURNING id',
      )
        .bind(
          b.status,
          delivery,
          pricing.total,
          b.paid === true ? 1 : 0,
          b.paid ? old.paid_at || now : old.paid_at,
          JSON.stringify(pricing.tax),
          now,
          id,
          b.version,
        )
        .first();
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
      return json({ ok: true });
    }
    if (path === '/api/admin/products' && method === 'GET') {
      await mustAdmin(req, env);
      return json({ products: await catalogue(env, true) });
    }
    if (path === '/api/admin/products' && method === 'POST') {
      const u = await mustAdmin(req, env),
        b = await body(req),
        p = validateProduct(b),
        old = (await catalogue(env, true)).find((p) => p.id === b.id);
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
      return json({ ok: true });
    }
    if (path === '/api/admin/customers' && method === 'GET') {
      await mustAdmin(req, env);
      const rows = await env.DB.prepare(
        'SELECT u.id,u.name,u.email,u.emailVerified,u.createdAt,p.phone,p.address,p.disabled,(SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) AS orders FROM user u LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id NOT IN (SELECT user_id FROM staff) ORDER BY u.createdAt DESC LIMIT 500',
      ).all();
      return json({ customers: rows.results });
    }
    if (path === '/api/admin/customers' && method === 'POST') {
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
        .first<any>();
      if (!customer) fail('NOT_FOUND', 404);
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
        .first<any>();
      if (!c || b.confirmEmail !== c.email) fail('INVALID_INPUT');
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
