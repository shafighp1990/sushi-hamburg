const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { validateOrder } = load('server/validation.ts');
const { products } = load('lib/catalog.ts');
const now = new Date('2026-10-08T09:00:00Z');

function fixture() {
  const product = products.find((item) => item.id === 'philadelphia');
  return {
    mode: 'guest',
    payment: 'cash_on_delivery',
    items: [{ id: product.id, quantity: 1, price: product.price }],
    customer: {
      name: 'LOCAL TEST guest', phone: '0000000000',
      address: 'Synthetic test address, Hamburg', notes: '', utensils: 1,
    },
    language: 'de', zone: 'A', date: '2026-10-08', time: '18:00',
    accepted: true, key: crypto.randomUUID(), guestToken: 'f'.repeat(64),
  };
}

void test('guest COD checkout needs no email and stores no invented email address', () => {
  for (const email of [undefined, null, '', '   ']) {
    const input = fixture();
    if (email !== undefined) input.customer.email = email;
    const result = validateOrder(input, products, now);
    assert.equal(result.customer.email, '');
    assert.equal(result.customer.phone, '0000000000');
  }
  const input = fixture();
  input.customer.email = '  guest@example.invalid  ';
  assert.equal(validateOrder(input, products, now).customer.email, 'guest@example.invalid');
});

void test('guest email relaxation preserves phone validation, supplied email validation and other payment/account rules', () => {
  for (const change of [
    (input) => { input.customer.phone = ''; },
    (input) => { input.customer.phone = 'invalid'; },
    (input) => { input.customer.email = 'invalid'; },
    (input) => { input.payment = 'stripe'; },
    (input) => { input.mode = 'member'; },
    (input) => { input.guestToken = 'guessable'; },
    (input) => { input.accepted = false; },
  ]) {
    const input = fixture();
    change(input);
    assert.throws(() => validateOrder(input, products, now));
  }
});
