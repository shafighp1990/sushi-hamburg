import assert from 'node:assert/strict';
const origin = process.env.SUSHI_LOCAL_URL || 'http://127.0.0.1:5173';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(origin).hostname),
  'Integration checks are local-only',
);
assert.equal(
  (await (await fetch(origin + '/api/status')).json()).demo,
  true,
  'Requires an isolated local database',
);
let cookie = '';
async function call(path, data, admin = false, method = data ? 'POST' : 'GET') {
  const r = await fetch(origin + '/api' + path, {
    method,
    headers: {
      Origin: origin,
      'CF-Connecting-IP': '127.0.0.31',
      ...(admin ? { Cookie: cookie } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  if (path.includes('sign-in'))
    cookie = r.headers
      .getSetCookie()
      .map((c) => c.split(';')[0])
      .join('; ');
  return { status: r.status, data: await r.json() };
}
assert.equal(
  (
    await call('/auth/sign-in/email', {
      email: 'admin@local.invalid',
      password: 'admin',
    })
  ).status,
  200,
);
const original = (await call('/settings')).data.settings;
const originalProduct = (await call('/admin/products', undefined, true)).data.products.find(
  (product) => product.id === 'philadelphia',
);
assert.ok(originalProduct);
let productChanged = false;
const settings = {
  ...original,
  taxMode: 'regular',
  deliveryMode: 'quote',
  buttonStyle: 'ticket',
  galleryStyle: 'editorial',
};
const code = 'QA' + Date.now();
const coupon = {
  code,
  type: 'percent',
  amount: 10,
  startsOn: '',
  endsOn: '',
  minSubtotal: 0,
  usageLimit: 1,
  perCustomerLimit: 0,
  customerId: '',
  productIds: ['philadelphia'],
  active: true,
  version: 0,
};
try {
  assert.equal(
    (await call('/admin/products', { ...originalProduct, taxRate: 700 }, true)).status,
    200,
  );
  productChanged = true;
  assert.equal((await call('/admin/settings', settings, true)).status, 200);
  assert.equal(
    (await call('/settings')).data.settings.galleryStyle,
    'editorial',
  );
  assert.equal((await call('/admin/coupons', coupon, true)).status, 200);
  const basket = {
    mode: 'guest',
    couponCode: code,
    zone: 'unknown',
    items: [{ id: 'philadelphia', price: 900, quantity: 2 }],
  };
  const q = await call('/quote', basket);
  assert.equal(q.data.discount, 180);
  assert.equal(q.data.total, null);
  assert.equal(q.data.tax.mode, 'regular');
  console.log('PASS settings and live coupon quote');
  const d = new Date(Date.now() + 86400000);
  while (![0, 4, 5, 6].includes(d.getUTCDay()))
    d.setUTCDate(d.getUTCDate() + 1);
  const order = {
    ...basket,
    language: 'en',
    payment: 'cash_on_delivery',
    date: d.toISOString().slice(0, 10),
    time: '18:00',
    accepted: true,
    guestToken: 'cd'.repeat(32),
    customer: {
      name: 'Commerce QA',
      phone: '+49123456789',
      email: 'commerce@example.invalid',
      address: 'LOCAL QA only',
      city: 'Hamburg',
      postcode: '20095',
      notes: 'NOT A REAL ORDER',
      utensils: 2,
    },
  };
  const rs = await Promise.all([
    call('/orders', { ...order, key: crypto.randomUUID() }),
    call('/orders', { ...order, key: crypto.randomUUID() }),
  ]);
  assert.equal(
    rs.filter((r) => r.status === 201).length,
    1,
    JSON.stringify(rs),
  );
  assert.equal(
    rs.filter((r) => r.data.error === 'COUPON_LIMIT').length,
    1,
    JSON.stringify(rs),
  );
  const placed = rs.find((r) => r.status === 201).data.order;
  assert.equal(placed.discount, 180);
  console.log('PASS simultaneous coupon cap');
  assert.equal(
    (
      await call(
        '/admin/orders/' + placed.id,
        {
          status: 'confirmed',
          version: placed.version,
          delivery: 600,
          paid: true,
          note: 'Local test',
        },
        true,
        'PATCH',
      )
    ).status,
    200,
  );
  const report = await call(
    '/admin/reports?from=' +
      (Date.now() - 3600000) +
      '&to=' +
      (Date.now() + 3600000),
    undefined,
    true,
  );
  const row = report.data.orders.find((o) => o.id === placed.id);
  assert.equal(row.total, 2220);
  assert.equal(row.tax.vat, 145);
  assert.equal(row.tax.net, 2075);
  assert.ok(row.paidAt);
  console.log(
    'PASS discount retained after delivery quote, VAT and paid report',
  );
  assert.equal(
    (
      await call('/orders', {
        ...order,
        key: crypto.randomUUID(),
        couponCode: '',
        customer: { ...order.customer, city: 'Berlin' },
      })
    ).data.error,
    'DELIVERY_AREA',
  );
  const all = (await call('/admin/coupons', undefined, true)).data.coupons;
  const c = all.find((c) => c.code === code);
  assert.equal(
    (await call('/admin/coupons', { ...c, active: false }, true)).status,
    200,
  );
  assert.equal((await call('/quote', basket)).data.error, 'INVALID_COUPON');
  console.log('PASS delivery restriction and coupon deactivation');
} finally {
  if (productChanged) {
    const current = (await call('/admin/products', undefined, true)).data.products.find(
      (product) => product.id === originalProduct.id,
    );
    assert.equal(
      (await call('/admin/products', { ...originalProduct, version: current.version }, true)).status,
      200,
    );
  }
  await call('/admin/settings', original, true);
}
