const test = require('node:test');
const assert = require('node:assert/strict');
const { load, database } = require('./helpers.cjs');
const { validateEstimatedArrival, createOrderMessage, listOrderMessages } =
  load('server/order-messages.ts');

void test('ETA accepts explicit clear and bounded millisecond instants, rejecting malformed and excessive dates', () => {
  const now = Date.UTC(2026, 10, 1, 12);
  assert.equal(validateEstimatedArrival(null, now), null);
  for (const timestamp of [now - 30 * 60000, now, now + 30 * 86400000])
    assert.equal(validateEstimatedArrival(timestamp, now), timestamp);
  for (const value of [
    undefined,
    '2026-11-01',
    NaN,
    Infinity,
    now + 0.5,
    now - 30 * 60000 - 1,
    now + 30 * 86400000 + 1,
  ]) {
    assert.throws(
      () => validateEstimatedArrival(value, now),
      (error) => error.code === 'INVALID_ARRIVAL',
    );
  }
});

function setup() {
  const DB = database();
  for (const id of ['order-a', 'order-b'])
    DB.sql
      .prepare(
        "INSERT INTO orders(id,client_key,request_hash,customer,items,subtotal,payment,date,time,zone,created_at,updated_at) VALUES(?,?,?,'{}','[]',100,'cash_on_delivery','2026-11-01','18:00','A',1,1)",
      )
      .run(id, id, id);
  return { DB };
}

void test('private message retries preserve one message and leave order edit versions unchanged', async (context) => {
  context.mock.timers.enable({
    apis: ['Date'],
    now: Date.UTC(2026, 10, 1, 12),
  });
  const env = setup(),
    key = crypto.randomUUID();
  try {
    const initialVersion = env.DB.sql
      .prepare("SELECT version FROM orders WHERE id='order-a'")
      .get().version;
    const first = await createOrderMessage(env, 'order-a', 'customer', {
      text: '  Please call  ',
      clientMessageId: key,
    });
    const version = env.DB.sql
      .prepare("SELECT version FROM orders WHERE id='order-a'")
      .get().version;
    assert.equal(version, initialVersion);
    const changeTime = env.DB.sql
      .prepare("SELECT updated_at FROM orders WHERE id='order-a'")
      .get().updated_at;
    assert.equal(changeTime, Date.now());
    context.mock.timers.tick(1000);
    const retry = await createOrderMessage(env, 'order-a', 'customer', {
      text: 'Please call',
      clientMessageId: key,
    });
    assert.equal(retry.id, first.id);
    assert.equal(
      env.DB.sql
        .prepare("SELECT updated_at FROM orders WHERE id='order-a'")
        .get().updated_at,
      changeTime,
    );
    assert.equal(first.text, 'Please call');
    assert.equal(
      env.DB.sql.prepare("SELECT version FROM orders WHERE id='order-a'").get()
        .version,
      version,
    );
    await assert.rejects(
      () =>
        createOrderMessage(env, 'order-a', 'customer', {
          text: 'Changed text',
          clientMessageId: key,
        }),
      (error) => error.code === 'MESSAGE_CONFLICT',
    );
    assert.equal(
      env.DB.sql.prepare('SELECT count(*) n FROM order_messages').get().n,
      1,
    );
  } finally {
    env.DB.sql.close();
  }
});

void test('private message pagination returns oldest-first pages without gaps, duplicates or another order', async () => {
  const env = setup();
  try {
    const insert = env.DB.sql.prepare(
      'INSERT INTO order_messages (id,order_id,sender,text,client_id,created_at) VALUES(?,?,?,?,?,?)',
    );
    for (let i = 0; i < 110; i++)
      insert.run(
        crypto.randomUUID(),
        'order-a',
        i % 2 ? 'team' : 'customer',
        'Message ' + i,
        crypto.randomUUID(),
        1000 + i,
      );
    insert.run(
      crypto.randomUUID(),
      'order-b',
      'customer',
      'Other private order',
      crypto.randomUUID(),
      1200,
    );
    const first = await listOrderMessages(env, 'order-a', null);
    assert.equal(first.messages.length, 100);
    assert.equal(first.messages[0].text, 'Message 10');
    assert.equal(first.messages.at(-1).text, 'Message 109');
    assert.ok(first.nextCursor);
    const older = await listOrderMessages(env, 'order-a', first.nextCursor);
    assert.equal(older.messages.length, 10);
    assert.equal(older.messages[0].text, 'Message 0');
    assert.equal(older.messages.at(-1).text, 'Message 9');
    assert.equal(older.nextCursor, null);
    assert.equal(
      new Set(
        [...first.messages, ...older.messages].map((message) => message.id),
      ).size,
      110,
    );
    assert.ok(!JSON.stringify(first).includes('Other private order'));
    assert.ok(!JSON.stringify(first).includes('client_id'));
    await assert.rejects(
      () => listOrderMessages(env, 'order-a', 'invalid'),
      (error) => error.code === 'INVALID_INPUT',
    );
  } finally {
    env.DB.sql.close();
  }
});
