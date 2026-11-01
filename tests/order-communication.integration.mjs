import assert from 'node:assert/strict';
import {
  Client,
  assertIsolatedShop,
  register,
  orderFixture,
} from './local-client.mjs';

const guest = new Client(),
  admin = new Client(),
  owner = new Client(),
  stranger = new Client();
await assertIsolatedShop(guest);
assert.equal(
  (
    await admin.call('/auth/sign-in/email', 'POST', {
      email: 'admin@local.invalid',
      password: 'admin',
    })
  ).status,
  200,
);
await register(owner, 'message owner');
await register(stranger, 'unrelated customer');
const fixture = await orderFixture(guest);
const placed = await guest.call('/orders', 'POST', fixture);
assert.equal(placed.status, 201, JSON.stringify(placed.body));
const guestOrder = placed.body.order;
const memberPlaced = await owner.call(
  '/orders',
  'POST',
  await orderFixture(owner, { mode: 'member' }),
);
assert.equal(memberPlaced.status, 201, JSON.stringify(memberPlaced.body));
const memberOrder = memberPlaced.body.order;
const guestPath = `/orders/${guestOrder.id}/messages`;
const memberPath = `/orders/${memberOrder.id}/messages`;
const token = { 'X-Order-Token': fixture.guestToken };
let groups = 0;
const pass = (name) => {
  groups++;
  console.log('PASS', name);
};

for (const client of [guest, stranger]) {
  assert.equal((await client.call(guestPath)).status, 404);
  assert.equal((await client.call(memberPath)).status, 404);
  assert.equal(
    (
      await client.call(guestPath, 'GET', undefined, {
        'X-Order-Token': 'wrong',
      })
    ).status,
    404,
  );
}
assert.equal((await guest.call('/admin' + guestPath)).status, 401);
assert.equal((await owner.call('/admin' + memberPath)).status, 403);
assert.equal(
  (
    await stranger.call(memberPath, 'POST', {
      text: 'Unauthorized',
      clientMessageId: crypto.randomUUID(),
    })
  ).status,
  404,
);
pass(
  'Private threads reject missing/wrong guest tokens, unrelated members and non-staff admin access',
);

const message = {
  text: '  Please ring the doorbell. <private>  ',
  clientMessageId: crypto.randomUUID(),
  sender: 'team',
};
const first = await guest.call(guestPath, 'POST', message, token);
assert.equal(first.status, 200, JSON.stringify(first.body));
assert.equal(first.body.message.sender, 'customer');
assert.equal(first.body.message.text, 'Please ring the doorbell. <private>');
const versionAfter = (
  await guest.call(`/orders/${guestOrder.id}`, 'GET', undefined, token)
).body.order.version;
const duplicate = await guest.call(guestPath, 'POST', message, token);
assert.equal(duplicate.status, 200);
assert.equal(duplicate.body.message.id, first.body.message.id);
assert.equal(
  (await guest.call(`/orders/${guestOrder.id}`, 'GET', undefined, token)).body
    .order.version,
  versionAfter,
);
assert.equal(
  (
    await guest.call(
      guestPath,
      'POST',
      { ...message, text: 'Changed retry' },
      token,
    )
  ).status,
  409,
);
pass(
  'Customer sender is server-derived; text is trimmed; retry is idempotent without extra version bump',
);

const reply = await admin.call('/admin' + guestPath, 'POST', {
  text: 'Your driver will ring twice.',
  clientMessageId: crypto.randomUUID(),
  sender: 'customer',
});
assert.equal(reply.status, 200, JSON.stringify(reply.body));
assert.equal(reply.body.message.sender, 'team');
const thread = await guest.call(guestPath, 'GET', undefined, token);
assert.deepEqual(
  thread.body.messages.map((item) => item.id),
  [first.body.message.id, reply.body.message.id],
);
assert.deepEqual(
  thread.body.messages.map((item) => item.sender),
  ['customer', 'team'],
);
assert.equal(thread.body.nextCursor, null);
assert.ok(!JSON.stringify(thread.body).includes('client_id'));
assert.ok(!JSON.stringify(thread.body).includes('guest_hash'));
pass(
  'Staff replies persist, customer reads ordered conversation, private storage fields stay hidden',
);

for (const invalid of ['', '   ', 'x'.repeat(2001)]) {
  assert.equal(
    (
      await owner.call(memberPath, 'POST', {
        text: invalid,
        clientMessageId: crypto.randomUUID(),
      })
    ).status,
    400,
  );
}
assert.equal(
  (
    await owner.call(memberPath, 'POST', {
      text: 'Valid text',
      clientMessageId: 'invalid',
    })
  ).status,
  400,
);
assert.equal((await owner.call(memberPath + '?before=invalid')).status, 400);
assert.equal(
  (
    await owner.call(memberPath, 'POST', {
      text: 'Owner reply',
      clientMessageId: crypto.randomUUID(),
    })
  ).status,
  200,
);
assert.equal((await owner.call(memberPath)).body.messages.length, 1);
assert.equal((await admin.call('/admin' + guestPath)).body.messages.length, 2);
pass(
  'Message validation and per-order isolation hold for authenticated customer conversations',
);

let detail = await guest.call(
  `/orders/${guestOrder.id}`,
  'GET',
  undefined,
  token,
);
const eta = Date.now() + 45 * 60000;
const patch = {
  status: 'preparing',
  delivery: 600,
  paid: false,
  note: 'Preparing your order',
  estimatedArrivalAt: eta,
  version: detail.body.order.version,
};
assert.equal(
  (await owner.call(`/admin/orders/${guestOrder.id}`, 'PATCH', patch)).status,
  403,
);
assert.equal(
  (await guest.call(`/admin/orders/${guestOrder.id}`, 'PATCH', patch)).status,
  401,
);
assert.equal(
  (await admin.call(`/admin/orders/${guestOrder.id}`, 'PATCH', patch)).status,
  200,
);
assert.equal(
  (await admin.call(`/admin/orders/${guestOrder.id}`, 'PATCH', patch)).status,
  409,
);
detail = await guest.call(`/orders/${guestOrder.id}`, 'GET', undefined, token);
assert.equal(detail.body.order.estimatedArrivalAt, eta);
assert.equal(detail.body.order.status, 'preparing');
pass(
  'Only staff can set ETA and order status; stale order updates are rejected',
);

const update = { ...patch, version: detail.body.order.version };
delete update.estimatedArrivalAt;
assert.equal(
  (await admin.call(`/admin/orders/${guestOrder.id}`, 'PATCH', update)).status,
  200,
);
detail = await guest.call(`/orders/${guestOrder.id}`, 'GET', undefined, token);
assert.equal(detail.body.order.estimatedArrivalAt, eta);
assert.equal(
  (
    await admin.call(`/admin/orders/${guestOrder.id}`, 'PATCH', {
      ...update,
      version: detail.body.order.version,
      estimatedArrivalAt: Date.now() + 31 * 86400000,
    })
  ).status,
  400,
);
assert.equal(
  (
    await admin.call(`/admin/orders/${guestOrder.id}`, 'PATCH', {
      ...update,
      version: detail.body.order.version,
      estimatedArrivalAt: null,
    })
  ).status,
  200,
);
assert.equal(
  (await guest.call(`/orders/${guestOrder.id}`, 'GET', undefined, token)).body
    .order.estimatedArrivalAt,
  null,
);
pass(
  'ETA survives unrelated updates, rejects out-of-range dates and can be explicitly cleared',
);
console.log(
  `${groups}/${groups} order communication integration groups passed.`,
);
