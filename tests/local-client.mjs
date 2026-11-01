import assert from 'node:assert/strict';

export const origin = process.env.SUSHI_LOCAL_URL || 'http://127.0.0.1:5173';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(origin).hostname),
  'Integration checks are local-only',
);

export class Client {
  cookies = new Map();
  constructor(target = origin) {
    assert.ok(
      ['localhost', '127.0.0.1'].includes(new URL(target).hostname),
      'Integration checks are local-only',
    );
    this.origin = target;
  }
  async call(path, method = 'GET', data, extra = {}) {
    const headers = {
      Origin: this.origin,
      'CF-Connecting-IP': '127.0.0.82',
      ...extra,
    };
    if (this.cookies.size)
      headers.Cookie = [...this.cookies]
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
    if (data !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(this.origin + '/api' + path, {
      method,
      headers,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const split = pair.indexOf('=');
      this.cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  }
}

export async function assertIsolatedShop(client) {
  const result = await client.call('/status');
  assert.equal(result.status, 200);
  assert.equal(result.body.demo, true, 'Requires an isolated local database');
  assert.equal(result.body.ready, true);
}

export async function register(client, label) {
  const result = await client.call('/auth/sign-up/email', 'POST', {
    name: `LOCAL TEST ${label}`,
    email: `qa-${crypto.randomUUID()}@example.invalid`,
    password: 'Local-only-test-passphrase-2026',
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.user;
}

export async function orderFixture(client, overrides = {}) {
  const status = await client.call('/status');
  const slot = status.body.deliveryOptions.find(
    (option) => option.from && option.to,
  );
  assert.ok(slot, 'An available delivery window is required');
  const catalog = await client.call('/products');
  const product = catalog.body.products.find(
    (item) => item.id === 'philadelphia',
  );
  assert.ok(product);
  return {
    mode: 'guest',
    language: 'en',
    payment: 'cash_on_delivery',
    items: [{ id: product.id, price: product.price, quantity: 1 }],
    customer: {
      name: 'LOCAL TEST customer',
      email: 'local-only@example.invalid',
      phone: '+490000000000',
      address: 'LOCAL TEST ONLY',
      postcode: '20095',
      city: 'Hamburg',
      notes: 'No real delivery',
      utensils: 1,
    },
    date: slot.date,
    time: slot.from,
    zone: 'A',
    accepted: true,
    key: crypto.randomUUID(),
    guestToken: crypto.randomUUID().replaceAll('-', '').repeat(2),
    ...overrides,
  };
}
