const test = require('node:test'),
  assert = require('node:assert/strict'),
  fs = require('node:fs'),
  path = require('node:path');
const { load, database } = require('./helpers.cjs');
const docs = load('server/documents.ts'),
  mail = load('server/mail.ts'),
  { defaultSettings } = load('lib/commerce.ts');
function setup() {
  const DB = database(),
    id = crypto.randomUUID(),
    env = { DB, AUTH_SECRET: 'test-secret-'.repeat(6), LOCAL_DEMO: '1' },
    issuer = {
      name: 'Sushi HH - TEST ONLY',
      address: 'Teststrasse 1, 20095 Hamburg - NOT A REAL BUSINESS',
      email: 'test@example.invalid',
      taxId: 'TEST-NOT-VALID',
    };
  DB.sql
    .prepare("INSERT INTO settings VALUES('shop',?,1)")
    .run(JSON.stringify({ ...defaultSettings, issuer }));
  DB.sql
    .prepare(
      "INSERT INTO orders(id,client_key,request_hash,customer,items,subtotal,delivery,total,payment,date,time,zone,status,paid,paid_at,tax,created_at,updated_at) VALUES(?,?,?,?,?,900,600,1500,'cash_on_delivery','2026-10-22','14:00','A','confirmed',0,NULL,?,1,1)",
    )
    .run(
      id,
      id,
      'hash',
      JSON.stringify({
        name: 'مشتری آزمایشی · Український тест',
        email: 'qa@example.invalid',
        address: 'Local test address, 20095 Hamburg',
        postcode: '20095',
        city: 'Hamburg',
        phone: '+4900000000',
        notes: 'TEST ONLY',
        utensils: 2,
      }),
      JSON.stringify([
        { quantity: 1, name: { de: 'Philadelphia mit Lachs' }, price: 900 },
      ]),
      JSON.stringify({
        mode: 'small_business',
        gross: 1500,
        net: 1500,
        vat: 0,
      }),
    );
  return { env, id, order: () => DB.sql.prepare('SELECT * FROM orders').get() };
}
void test('three private PDFs have stable snapshots; receipt exists only after payment', async () => {
  const { env, id, order } = setup();
  await docs.ensureDocuments(env, id);
  assert.equal(
    env.DB.sql.prepare('SELECT count(*) n FROM order_documents').get().n,
    2,
  );
  await assert.rejects(
    () => docs.getDocument(env, order(), 'receipt'),
    /PAYMENT_NOT_READY/,
  );
  const first = await docs.getDocument(env, order(), 'invoice');
  env.DB.sql.exec(
    "UPDATE settings SET value=json_set(value,'$.issuer.name','CHANGED');UPDATE orders SET paid=1,paid_at=1791792000000",
  );
  await docs.ensureDocuments(env, id);
  assert.equal(
    env.DB.sql.prepare('SELECT count(*) n FROM order_documents').get().n,
    3,
  );
  assert.equal(
    (await docs.getDocument(env, order(), 'invoice')).issuer.name,
    first.issuer.name,
  );
  for (const kind of docs.documentKinds) {
    const d = await docs.getDocument(env, order(), kind),
      bytes = await docs.renderDocument(d);
    assert.equal(Buffer.from(bytes).subarray(0, 5).toString(), '%PDF-');
    if (process.env.SUSHI_PDF_TEST_OUTPUT) {
      fs.mkdirSync(process.env.SUSHI_PDF_TEST_OUTPUT, { recursive: true });
      fs.writeFileSync(
        path.join(process.env.SUSHI_PDF_TEST_OUTPUT, kind + '.pdf'),
        bytes,
      );
    }
  }
  assert.equal(
    env.DB.sql.prepare('SELECT count(*) n FROM mail_outbox').get().n,
    2,
  );
});
void test('incomplete seller details produce explicit preview, not issued invoice or outgoing email', async () => {
  const { env, order } = setup();
  env.DB.sql.exec('DELETE FROM settings');
  const d = await docs.getDocument(env, order(), 'invoice');
  assert.equal(d.draft, true);
  assert.equal(
    env.DB.sql.prepare('SELECT count(*) n FROM order_documents').get().n,
    0,
  );
  assert.equal(
    env.DB.sql.prepare('SELECT count(*) n FROM mail_outbox').get().n,
    0,
  );
});
void test('phone-only guest orders keep private documents without queuing email to an empty recipient', async () => {
  const { env, id, order } = setup();
  try {
    env.DB.sql.prepare("UPDATE orders SET customer=json_set(customer,'$.email','') WHERE id=?").run(id);
    await docs.ensureDocuments(env, id);
    assert.equal(env.DB.sql.prepare('SELECT count(*) n FROM order_documents').get().n, 2);
    assert.equal(env.DB.sql.prepare('SELECT count(*) n FROM mail_outbox').get().n, 0);
    assert.equal((await docs.getDocument(env, order(), 'invoice')).customer.email, '');
  } finally {
    env.DB.sql.close();
  }
});
void test('local email mode never calls external email API even with credentials', async (t) => {
  const { env } = setup();
  t.mock.method(globalThis, 'fetch', async () => {
    throw Error('Unexpected external email');
  });
  assert.equal(
    (
      await mail.dispatchMail(
        {
          ...env,
          RESEND_API_KEY: 'fixture',
          EMAIL_FROM: 'test@example.invalid',
        },
        'http://localhost',
      )
    ).local,
    true,
  );
});
