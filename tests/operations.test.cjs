const test = require('node:test'),
  assert = require('node:assert/strict');
const { load, database } = require('./helpers.cjs');
const op = load('lib/operations.ts'),
  news = load('server/newsletter.ts'),
  commerce = load('server/commerce.ts'),
  { defaultSettings } = load('lib/commerce.ts'),
  secrets = load('server/secrets.ts');
function setup() {
  const DB = database(),
    id = crypto.randomUUID(),
    env = { DB, AUTH_SECRET: 'test-secret-'.repeat(6) };
  DB.sql
    .prepare(
      'INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,0,1,1)',
    )
    .run(id, 'Local QA', 'qa@example.invalid');
  return {
    env,
    user: { id, email: 'qa@example.invalid' },
    body: { enabled: true, frequency: 'weekly', language: 'en' },
  };
}
void test('2am Berlin preorders on 22 October start at 14:00 the same day', () => {
  const d = op.deliveryOptions(
    op.defaultSchedule,
    new Date('2026-10-22T00:00:00Z'),
  );
  assert.equal(d[0].date, '2026-10-22');
  assert.equal(d[0].from, '14:00');
  assert.equal(
    op.acceptingNow(op.defaultSchedule, new Date('2026-10-22T00:00:00Z')),
    false,
  );
});
void test('cutoff, five-hour lead, date closure and extra Tuesday are enforced', () => {
  const schedule = structuredClone(op.defaultSchedule);
  schedule.exceptions['2026-10-22'] = { ...schedule.weekly[4], open: false };
  schedule.exceptions['2026-10-20'] = { ...schedule.weekly[4], open: true };
  assert.equal(
    op.deliveryOptions(schedule, new Date('2026-10-20T00:00:00Z'))[0].date,
    '2026-10-20',
  );
  assert.equal(
    op.deliveryOptions(schedule, new Date('2026-10-22T00:00:00Z'))[0].date,
    '2026-10-23',
  );
  assert.equal(
    op.deliveryOptions(op.defaultSchedule, new Date('2026-10-22T11:00:00Z'))[0]
      .date,
    '2026-10-23',
  );
  assert.equal(
    op.deliveryOptions(op.defaultSchedule, new Date('2026-10-22T09:20:00Z'))[0]
      .from,
    '16:30',
  );
  assert.equal(
    op.validSlot(
      schedule,
      '2026-10-22',
      '18:00',
      new Date('2026-10-20T00:00:00Z'),
    ),
    false,
  );
  assert.equal(op.validateSchedule({ ...schedule, weekly: [] }), false);
});
void test('Berlin daylight-saving transition still uses local service dates and hours', () => {
  assert.equal(op.berlinClock(new Date('2026-10-25T01:30:00Z')).time, '02:30');
  assert.equal(
    op.deliveryOptions(op.defaultSchedule, new Date('2026-10-25T01:30:00Z'))[0]
      .from,
    '14:00',
  );
});
void test('newsletter discount needs confirmation and stops immediately for new quotes after unsubscribe', async () => {
  const { env, user, body } = setup();
  const catalog = [{ id: 'food', price: 1000, name: { de: 'Test' } }],
    b = { items: [{ id: 'food', quantity: 1, price: 1000 }], zone: 'A' };
  await news.subscribe(env, user, body, 'https://shop.example');
  assert.equal(
    (await commerce.quote(env, b, catalog, user.id)).newsletterDiscount,
    0,
  );
  const s = env.DB.sql.prepare('SELECT * FROM newsletter_subscribers').get();
  assert.ok(typeof s.id === 'string');
  assert.ok(typeof s.generation === 'number');
  const payload = await secrets.unseal(
    env,
    env.DB.sql.prepare('SELECT payload FROM mail_outbox').get().payload,
  );
  assert.ok(payload.text.includes('newsletter#action=confirm'));
  await news.confirmSubscription(
    env,
    s.id,
    await secrets.capability(env, `confirm:${s.id}:${s.generation}`),
  );
  assert.equal(
    (await commerce.quote(env, b, catalog, user.id)).newsletterDiscount,
    50,
  );
  assert.equal(
    (await commerce.quote(env, b, catalog, null)).newsletterDiscount,
    0,
  );
  await news.unsubscribe(env, s.id);
  assert.equal(
    (await commerce.quote(env, b, catalog, user.id)).newsletterDiscount,
    0,
  );
  const stale = await secrets.capability(
    env,
    `confirm:${s.id}:${s.generation}`,
  );
  await assert.rejects(() => news.confirmSubscription(env, s.id, stale));
});
void test('newsletter adds 5% after coupon, excludes delivery, and snapshots conserve cents', async () => {
  const { env, user } = setup();
  env.DB.sql
    .prepare(
      "INSERT INTO newsletter_subscribers(id,user_id,email,state,frequency,consent_version,consent_at,updated_at) VALUES(?,?,?,'active','weekly','v1',1,1)",
    )
    .run('sub', user.id, user.email);
  env.DB.sql
    .prepare("INSERT INTO settings VALUES('shop',?,1)")
    .run(JSON.stringify({ ...defaultSettings, deliveryMode: 'zones' }));
  const coupon = {
    code: 'TEN',
    type: 'percent',
    amount: 10,
    startsOn: '',
    endsOn: '',
    minSubtotal: 0,
    usageLimit: 0,
    perCustomerLimit: 0,
    productIds: [],
    customerId: '',
  };
  env.DB.sql
    .prepare('INSERT INTO coupons VALUES(?,?,1,1,1)')
    .run('TEN', JSON.stringify(coupon));
  const q = await commerce.quote(
    env,
    {
      items: [{ id: 'food', price: 1000, quantity: 1 }],
      zone: 'A',
      couponCode: 'TEN',
    },
    [{ id: 'food', price: 1000, name: { de: 'Test' } }],
    user.id,
  );
  assert.equal(q.discount, 145);
  assert.equal(q.newsletterDiscount, 45);
  assert.equal(q.total, 1455);
  assert.equal(q.discountShares[0], 145);
  assert.equal(q.tax.vat, 0);
});
void test('email changes invalidate old subscriber discount even before cleanup', async () => {
  const { env, user, body } = setup();
  await news.subscribe(env, user, body, 'https://shop.example');
  env.DB.sql.exec(
    "UPDATE newsletter_subscribers SET state='active';UPDATE user SET email='new@example.invalid'",
  );
  assert.equal(
    (
      await commerce.quote(
        env,
        { items: [{ id: 'food', price: 1000, quantity: 1 }], zone: 'A' },
        [{ id: 'food', price: 1000, name: { de: 'Test' } }],
        user.id,
      )
    ).newsletterDiscount,
    0,
  );
});
void test('private settings encrypted at rest and no secrets in connection status', async () => {
  const { env } = setup(),
    c = load('server/connections.ts');
  await c.saveConnection(env, 'sumup', {
    SUMUP_API_KEY: 'sensitive-fixture',
    SUMUP_MERCHANT_CODE: 'MCFIXTURE',
  });
  const raw = env.DB.sql
    .prepare("SELECT value FROM settings WHERE key='private:payment:sumup'")
    .get().value;
  assert.ok(!raw.includes('sensitive-fixture'));
  assert.equal(
    (await c.resolvePaymentEnv(env)).SUMUP_API_KEY,
    'sensitive-fixture',
  );
  assert.ok(
    !JSON.stringify(await c.connectionStatus(env)).includes(
      'sensitive-fixture',
    ),
  );
});
