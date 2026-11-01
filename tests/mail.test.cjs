const test = require('node:test'),
  assert = require('node:assert/strict');
const { load, database } = require('./helpers.cjs'),
  { enqueueMail, dispatchMail } = load('server/mail.ts'),
  { unsubscribe } = load('server/newsletter.ts');
function setup() {
  const DB = database(),
    env = {
      DB,
      AUTH_SECRET: 'fixture'.repeat(10),
      RESEND_API_KEY: 'fixture',
      EMAIL_FROM: 'sender@example.invalid',
    };
  DB.sql
    .prepare(
      'INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,1,1)',
    )
    .run('u', 'Test', 'qa@example.invalid');
  DB.sql
    .prepare(
      "INSERT INTO newsletter_subscribers(id,user_id,email,state,frequency,consent_version,consent_at,updated_at) VALUES('s','u','qa@example.invalid','active','weekly','v1',1,1)",
    )
    .run();
  return env;
}
void test('unsubscribing cancels queued marketing and no API send occurs', async (t) => {
  const env = setup();
  await enqueueMail(
    env,
    'm',
    'marketing',
    'qa@example.invalid',
    { subject: 'Test', text: 'Test' },
    { id: 's', generation: 1 },
  );
  await unsubscribe(env, 's');
  let sent = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    sent++;
    return Response.json({ id: 'fixture' });
  });
  await dispatchMail(env, 'https://shop.example');
  assert.equal(sent, 0);
  assert.equal(
    env.DB.sql.prepare("SELECT state FROM mail_outbox WHERE id='m'").get()
      .state,
    'cancelled',
  );
});
void test('provider error retries stable payload and idempotency key without claiming email sent', async (t) => {
  const env = setup();
  await enqueueMail(
    env,
    'm',
    'marketing',
    'qa@example.invalid',
    { subject: 'Test', text: 'Test' },
    { id: 's', generation: 1 },
  );
  const calls = [];
  let success = false;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    calls.push(init);
    return success
      ? Response.json({ id: 'fixture' })
      : Response.json({ error: 'test' }, { status: 503 });
  });
  await dispatchMail(env, 'https://shop.example');
  assert.equal(
    env.DB.sql.prepare('SELECT state FROM mail_outbox').get().state,
    'retry',
  );
  assert.equal(
    env.DB.sql.prepare('SELECT sent_at FROM mail_outbox').get().sent_at,
    null,
  );
  env.DB.sql.exec('UPDATE mail_outbox SET next_at=0');
  success = true;
  await dispatchMail(env, 'https://shop.example');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body, calls[1].body);
  assert.equal(
    calls[0].headers['Idempotency-Key'],
    calls[1].headers['Idempotency-Key'],
  );
  assert.equal(
    env.DB.sql.prepare('SELECT state FROM mail_outbox').get().state,
    'sent',
  );
  await dispatchMail(env, 'https://shop.example');
  assert.equal(calls.length, 2);
});
void test('weekly preference defers a second newsletter even if several products are announced together', async (t) => {
  const env = setup();
  for (const id of ['one', 'two'])
    await enqueueMail(
      env,
      id,
      'marketing',
      'qa@example.invalid',
      { subject: id, text: id },
      { id: 's', generation: 1 },
    );
  let sent = 0;
  t.mock.method(globalThis, 'fetch', async () => {
    sent++;
    return Response.json({ id: 'fixture' });
  });
  await dispatchMail(env, 'https://shop.example');
  assert.equal(sent, 1);
  const pending = env.DB.sql
    .prepare("SELECT * FROM mail_outbox WHERE state='queued'")
    .get();
  assert.ok(pending.next_at > Date.now() + 6 * 86400000);
  assert.equal(pending.first_attempt_at, null);
});
