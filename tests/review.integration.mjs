import assert from 'node:assert/strict';
import { Client, orderFixture } from './local-client.mjs';

const guest = new Client(),
  admin = new Client(),
  kunde = new Client(),
  kunde2 = new Client();
const status = await guest.call('/status');
assert.equal(status.status, 200);
assert.equal(status.body.ready, true);
assert.equal(status.body.reviewMode, true);
assert.equal(status.body.demo, false);
for (const method of ['stripe', 'paypal', 'sumup', 'revolut'])
  assert.equal(status.body[method], false);
let groups = 0;
const pass = (name) => {
  groups++;
  console.log('PASS', name);
};
for (const { client, alias } of [
  { client: admin, alias: 'admin' },
  { client: kunde, alias: 'kunde' },
  { client: kunde2, alias: 'kunde2' },
]) {
  const signedIn = await client.call('/auth/sign-in/email', 'POST', {
    email: alias,
    password: alias,
  });
  assert.equal(
    signedIn.status,
    200,
    alias + ': ' + JSON.stringify(signedIn.body),
  );
  const me = await client.call('/me');
  assert.equal(me.body.user.admin, alias === 'admin');
  assert.equal(me.body.user.email, alias + '@review.invalid');
}
assert.equal((await kunde.call('/admin/orders')).status, 403);
assert.equal((await guest.call('/admin/orders')).status, 401);
pass(
  'Configured review aliases sign in with separate customer and staff privileges',
);

const user = (await kunde.call('/me')).body.user;
for (const route of [
  '/auth/sign-up/email',
  '/auth/change-password',
  '/auth/request-password-reset',
]) {
  assert.equal(
    (
      await kunde.call(route, 'POST', {
        email: 'other@example.invalid',
        password: 'Unwanted-change-2026',
      })
    ).status,
    403,
    route,
  );
}
assert.equal(
  (await kunde.call('/me/email', 'POST', { email: 'other@example.invalid' }))
    .status,
  403,
);
assert.equal(
  (
    await admin.call('/admin/customers', 'POST', {
      email: 'other@example.invalid',
    })
  ).status,
  403,
);
for (const action of ['reset', 'disable'])
  assert.equal(
    (await admin.call('/admin/customers/' + user.id, 'PATCH', { action }))
      .status,
    403,
    action,
  );
assert.equal(
  (
    await admin.call('/admin/customers/' + user.id, 'DELETE', {
      confirmEmail: user.email,
    })
  ).status,
  403,
);
const update = await kunde.call('/me', 'PATCH', {
  name: 'Review customer updated',
  phone: '+490000000000',
  address: 'REVIEW ONLY',
  postcode: '20095',
  city: 'Hamburg',
  language: 'en',
  admin: true,
});
assert.equal(update.status, 200);
assert.equal((await kunde.call('/me')).body.user.admin, false);
pass(
  'Review credentials cannot be changed or disabled; customer profile edits cannot elevate privileges',
);

const placed = await kunde.call(
  '/orders',
  'POST',
  await orderFixture(kunde, { mode: 'member' }),
);
assert.equal(placed.status, 201, JSON.stringify(placed.body));
const id = placed.body.order.id;
assert.equal((await kunde2.call('/orders/' + id)).status, 404);
assert.equal((await kunde2.call('/orders/' + id + '/messages')).status, 404);
assert.equal((await guest.call('/orders/' + id)).status, 404);
assert.equal(
  (
    await kunde.call('/orders/' + id + '/messages', 'POST', {
      text: 'Please ring twice.',
      clientMessageId: crypto.randomUUID(),
    })
  ).status,
  200,
);
assert.equal(
  (
    await admin.call('/admin/orders/' + id + '/messages', 'POST', {
      text: 'The driver will ring twice.',
      clientMessageId: crypto.randomUUID(),
    })
  ).status,
  200,
);
assert.equal(
  (await kunde.call('/orders/' + id + '/messages')).body.messages.length,
  2,
);
const detail = (await kunde.call('/orders/' + id)).body.order;
const eta = Date.now() + 30 * 60000;
assert.equal(
  (
    await admin.call('/admin/orders/' + id, 'PATCH', {
      status: 'preparing',
      delivery: 600,
      paid: false,
      version: detail.version,
      note: 'Review kitchen update',
      estimatedArrivalAt: eta,
    })
  ).status,
  200,
);
assert.equal(
  (await kunde.call('/orders/' + id)).body.order.estimatedArrivalAt,
  eta,
);
pass(
  'Review cash order, private customer/staff replies and ETA work while the second customer is denied',
);

assert.equal(
  (
    await guest.call('/webhooks/stripe', 'POST', {
      id: 'fake',
      type: 'checkout.session.completed',
    })
  ).status,
  503,
);
assert.equal(
  (
    await kunde.call(
      '/orders',
      'POST',
      await orderFixture(kunde, { mode: 'member', payment: 'stripe' }),
    )
  ).status,
  503,
);
assert.equal(
  (
    await kunde.call('/me/newsletter', 'POST', {
      enabled: true,
      frequency: 'weekly',
      language: 'en',
    })
  ).status,
  200,
);
assert.equal((await admin.call('/admin/mail/process', 'POST', {})).status, 200);
const emailState = await admin.call('/admin/email');
assert.equal(emailState.body.local, true);
assert.equal(emailState.body.preview, false);
assert.equal(
  (await admin.call('/admin/mail/preview', 'POST', { id: 'fixture' })).status,
  404,
);
pass(
  'Review disables payment/webhook processing and keeps email local even with accidental provider keys',
);
console.log(`${groups}/${groups} isolated review integration groups passed.`);
