const test = require('node:test'),
  assert = require('node:assert/strict');
const { load, database } = require('./helpers.cjs');
const pay = load('server/payments.ts');
function setup(provider) {
  const DB = database(),
    id = crypto.randomUUID(),
    env = {
      DB,
      AUTH_SECRET: 'x'.repeat(64),
      SUMUP_API_KEY: 'fixture',
      SUMUP_MERCHANT_CODE: 'MCFIXTURE',
      REVOLUT_SECRET_KEY: 'fixture',
      REVOLUT_WEBHOOK_SECRET: 'fixture',
    };
  DB.sql
    .prepare(
      "INSERT INTO orders(id,client_key,request_hash,customer,items,subtotal,delivery,total,payment,date,time,zone,created_at,updated_at) VALUES(?,?,?,'{}','[]',1000,0,1000,?,'2026-10-22','14:00','A',1,1)",
    )
    .run(id, id, 'hash', provider);
  return { env, order: DB.sql.prepare('SELECT * FROM orders').get() };
}
for (const provider of ['sumup', 'revolut'])
  void test(
    provider +
      ' creates one checkout, rejects wrong reference/amount, and confirms only verified payment',
    async (t) => {
      const { env, order } = setup(provider);
      let createCount = 0,
        paid = false,
        bad = false,
        stored;
      t.mock.method(globalThis, 'fetch', async (url, init) => {
        if (init.method === 'POST') {
          createCount++;
          const b = JSON.parse(init.body);
          stored = {
            id: 'provider-id',
            ...b,
            hosted_checkout_url: 'https://checkout.sumup.com/fixture',
            checkout_url: 'https://checkout.revolut.com/fixture',
          };
          return Response.json(stored);
        }
        if (url.includes('?'))
          return Response.json(provider === 'sumup' ? [] : { orders: [] });
        return Response.json({
          ...stored,
          amount: bad ? 1 : stored.amount,
          status: paid ? 'PAID' : 'PENDING',
          state: paid ? 'completed' : 'pending',
          outstanding_amount: paid ? 0 : 1000,
        });
      });
      const first = await pay.startPayment(env, order, 'https://sushi.example');
      assert.ok(first.url.startsWith('https://checkout.'));
      assert.equal(
        (await pay.startPayment(env, order, 'https://sushi.example')).url,
        first.url,
      );
      assert.equal(createCount, 1);
      assert.equal((await pay.reconcilePayment(env, order.id)).paid, false);
      paid = true;
      bad = true;
      await assert.rejects(
        () => pay.reconcilePayment(env, order.id),
        /MISMATCH/,
      );
      bad = false;
      assert.equal((await pay.reconcilePayment(env, order.id)).paid, true);
      assert.equal(env.DB.sql.prepare('SELECT paid FROM orders').get().paid, 1);
    },
  );
void test('disabled or unconfigured gateways cannot start payment', async () => {
  const { env, order } = setup('sumup');
  await assert.rejects(
    () =>
      pay.startPayment(
        { ...env, PAYMENT_ENABLED: { sumup: false } },
        order,
        'https://sushi.example',
      ),
    /PAYMENT_DISABLED/,
  );
  await assert.rejects(
    () =>
      pay.startPayment(
        { ...env, SUMUP_API_KEY: '' },
        order,
        'https://sushi.example',
      ),
    /PAYMENT_UNAVAILABLE/,
  );
});
void test('unsigned Revolut webhook rejected before provider lookup', async () => {
  const { env } = setup('revolut');
  await assert.rejects(
    () =>
      pay.paymentWebhook(
        new Request('https://sushi.example/api/webhooks/revolut', {
          method: 'POST',
          body: JSON.stringify({ order_id: 'x' }),
        }),
        env,
        'revolut',
      ),
    /INVALID_SIGNATURE/,
  );
});
void test('untrusted SumUp notification cannot mark unpaid provider checkout paid', async (t) => {
  const { env, order } = setup('sumup');
  env.DB.sql
    .prepare(
      "INSERT INTO payments(order_id,provider,provider_id,amount,attempt,created_at,updated_at) VALUES(?,'sumup','p',1000,'attempt',1,1)",
    )
    .run(order.id);
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({
      id: 'p',
      amount: 10,
      currency: 'EUR',
      merchant_code: 'MCFIXTURE',
      checkout_reference: 'attempt',
      status: 'PENDING',
    }),
  );
  await pay.paymentWebhook(
    new Request('https://sushi.example/api/webhooks/sumup', {
      method: 'POST',
      body: JSON.stringify({ id: 'p', status: 'PAID' }),
    }),
    env,
    'sumup',
  );
  assert.equal(env.DB.sql.prepare('SELECT paid FROM orders').get().paid, 0);
});
