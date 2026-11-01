import assert from 'node:assert/strict';
import { Client, orderFixture } from './local-client.mjs';

export async function verifyStoredArrival(runtime, origin) {
  const guest = new Client(origin);
  const admin = new Client(origin);
  assert.equal(
    (
      await admin.call('/auth/sign-in/email', 'POST', {
        email: 'admin@local.invalid',
        password: 'admin',
      })
    ).status,
    200,
  );
  const placed = await guest.call('/orders', 'POST', await orderFixture(guest));
  assert.equal(placed.status, 201);
  const id = placed.body.order.id;
  const storedArrival = Date.now() - 2 * 60 * 60000;
  // Only the ephemeral D1 created by run-isolated-api is reachable here.
  // Simulate time having passed since a valid estimate was originally saved.
  const db = await runtime.getD1Database('DB');
  await db
    .prepare('UPDATE orders SET estimated_arrival_at=? WHERE id=?')
    .bind(storedArrival, id)
    .run();
  const version = (
    await db.prepare('SELECT version FROM orders WHERE id=?').bind(id).first()
  ).version;
  const update = {
    status: 'preparing',
    delivery: 600,
    paid: false,
    version,
    note: 'Preserve elapsed estimate during an operational status edit',
    estimatedArrivalAt: storedArrival,
  };
  const unchanged = await admin.call('/admin/orders/' + id, 'PATCH', update);
  assert.equal(unchanged.status, 200, JSON.stringify(unchanged.body));
  assert.equal(unchanged.body.order.estimatedArrivalAt, storedArrival);
  const changed = await admin.call('/admin/orders/' + id, 'PATCH', {
    ...update,
    version: unchanged.body.order.version,
    estimatedArrivalAt: storedArrival - 1000,
  });
  assert.equal(changed.status, 400);
  assert.equal(changed.body.error, 'INVALID_ARRIVAL');
  const cleared = await admin.call('/admin/orders/' + id, 'PATCH', {
    ...update,
    version: unchanged.body.order.version,
    estimatedArrivalAt: null,
  });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.order.estimatedArrivalAt, null);
  console.log(
    'PASS Elapsed stored ETA permits later status edits, while a newly changed stale ETA is rejected and explicit clear works',
  );
  console.log('1/1 isolated stored-state regression group passed.');
}
