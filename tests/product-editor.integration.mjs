import assert from 'node:assert/strict';
import { Client, assertIsolatedShop } from './local-client.mjs';

const admin = new Client();
const guest = new Client();
await assertIsolatedShop(guest);
assert.equal((await admin.call('/auth/sign-in/email', 'POST', { email: 'admin@local.invalid', password: 'admin' })).status, 200);
const id = 'product-' + crypto.randomUUID();
const draft = {
  id, category: 'new', price: 1250, version: 0, active: true,
  name: { de: 'Lokale Testrulle', uk: '', en: '', fa: '' },
  description: { de: 'Reis und Gurke. Nur isolierter Test.', uk: '', en: '', fa: '' },
};
let groups = 0;
function pass(name) { groups++; console.log('PASS', name); }
async function savedProduct() {
  const response = await admin.call('/admin/products');
  assert.equal(response.status, 200);
  const product = response.body.products.find((item) => item.id === id);
  assert.ok(product);
  return product;
}
async function shownProduct() {
  const response = await guest.call('/products');
  assert.equal(response.status, 200);
  const product = response.body.products.find((item) => item.id === id);
  assert.ok(product);
  return product;
}
const created = await admin.call('/admin/products', 'POST', draft);
assert.equal(created.status, 200, JSON.stringify(created.body));
let stored = await savedProduct();
assert.equal(stored.taxRate, 0);
assert.equal(stored.version, 1);
assert.deepEqual(stored.name, draft.name);
assert.deepEqual(stored.description, draft.description);
let shown = await shownProduct();
for (const language of ['de', 'uk', 'en', 'fa']) {
  assert.equal(shown.name[language], draft.name.de);
  assert.equal(shown.description[language], draft.description.de);
}
pass('Single-language product persists with zero default tax; public text fallback does not invent stored translations');

const revised = {
  ...stored, price: 1375, taxRate: 0,
  name: { ...stored.name, en: 'Local test roll' },
  description: { ...stored.description, en: 'Rice and cucumber. Isolated test only.' },
  images: ['/products/philadelphia-800.jpg'],
};
assert.equal((await admin.call('/admin/products', 'POST', revised)).status, 200);
stored = await savedProduct();
assert.equal(stored.price, 1375);
assert.equal(stored.taxRate, 0);
assert.equal(stored.image, '/products/philadelphia-800.jpg');
assert.deepEqual(stored.name, revised.name);
assert.equal(stored.name.fa, '');
shown = await shownProduct();
assert.equal(shown.name.en, revised.name.en);
assert.equal(shown.description.en, revised.description.en);
assert.equal(shown.name.fa, draft.name.de);
assert.equal((await admin.call('/admin/products', 'POST', revised)).status, 409);
pass('Adding a real translation preserves other originals, zero tax, photo and price while rejecting stale edits');

const invalid = await admin.call('/admin/products', 'POST', { ...stored, name: {}, description: {} });
assert.equal(invalid.status, 400);
assert.equal(invalid.body.error, 'PRODUCT_TEXT_REQUIRED');
assert.equal((await admin.call('/admin/products', 'POST', { ...stored, taxRate: 500 })).status, 400);
assert.equal((await guest.call('/admin/products', 'POST', stored)).status, 401);
const unchanged = await savedProduct();
assert.equal(unchanged.version, stored.version);
assert.deepEqual(unchanged.name, stored.name);
assert.equal((await admin.call('/admin/products', 'POST', { ...stored, active: false })).status, 200);
assert.equal((await guest.call('/products')).body.products.some((product) => product.id === id), false);
pass('Invalid text, unsupported tax and anonymous writes leave saved data intact; hiding the product still works');
console.log(`${groups} product-editor API groups passed.`);
