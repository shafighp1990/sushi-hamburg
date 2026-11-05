import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Run only after the fixes are deployed.
// No screenshots, traces, response bodies, credentials or customer data are logged.
const origin = 'https://sushi-hamburg-review.pages.dev';
assert.ok((process.env.SUSHI_REVIEW_URL || origin) === origin, 'Only the stable dedicated review origin is allowed');
assert.ok(process.env.SUSHI_ALLOW_REVIEW_FIXES_SMOKE === '1', 'Explicit review-fixes smoke opt-in is required');
const marker = 'REVIEW TEST FIXES ' + randomUUID();
const productName = marker + ' product';
const note = marker + ' · synthetic test only; do not call, charge, prepare or deliver';
const guestToken = randomBytes(32).toString('hex');
const key = randomUUID();
const checks = [];
const cleanupFailures = [];
let stage = 'review safety guards';
let failed = false;
let browser;
let manager;
let visitor;
let stranger;
let managerReady = false;
let orderAttempted = false;
let orderId = '';
let submittedProductId = '';
let productWriteAllowed = false;
let invalidBrowserRequests = 0;
let blockedExternalRequests = 0;
let browserErrors = 0;
let productIds = new Set();

function pass(message) {
  checks.push(message);
  console.log('PASS ' + message);
}
async function reviewStatus() {
  const response = await fetch(origin + '/api/status', { redirect: 'error' });
  assert.equal(response.status, 200);
  const status = await response.json();
  assert.equal(status.ready, true);
  assert.equal(status.reviewMode, true);
  assert.equal(status.demo, false);
  assert.equal(status.email, false);
  assert.equal(status.payment, 'cash_on_delivery');
  assert.notEqual(status.paymentEnabled?.cash_on_delivery, false);
  for (const provider of ['stripe', 'paypal', 'sumup', 'revolut']) assert.equal(status[provider], false);
  return status;
}
async function get(current, endpoint, token) {
  assert.ok(/^\/(?:me|settings|products|admin\/(?:products|orders)|orders\/[a-f0-9-]+(?:\/messages)?)$/.test(endpoint));
  const response = await current.request.get(origin + '/api' + endpoint, {
    headers: token ? { 'X-Order-Token': token } : {}, maxRedirects: 0,
  });
  assert.equal(response.status(), 200);
  return response.json();
}
function ownProduct(product) {
  assert.equal(product.id, submittedProductId);
  assert.equal(productIds.has(product.id), false);
  assert.equal(product.name.en, productName);
}
function ownOrder(order) {
  assert.equal(order.id, orderId);
  assert.equal(order.customer.name, marker);
  assert.equal(order.customer.notes, note);
  assert.equal(order.userId, null);
  assert.equal(order.payment, 'cash_on_delivery');
  assert.equal(order.paid, false);
}
function zeroTax(order) {
  assert.ok(order.items.every((item) => item.taxRate === 0));
  assert.ok(order.tax);
  if (order.total === null) {
    assert.equal(order.tax.vat, null, 'A pending delivery quote has no final tax amount yet');
  } else {
    assert.equal(order.tax.vat, 0);
    assert.equal(order.tax.net, order.total);
    assert.equal(order.tax.gross, order.total);
  }
  assert.ok(order.tax.groups.every((group) => group.rate === 0 && group.vat === 0));
}
async function changeOwnOrder(order, status, delivery, estimatedArrivalAt) {
  ownOrder(order);
  assert.ok(['confirmed', 'cancelled'].includes(status));
  await reviewStatus();
  const response = await manager.request.patch(origin + '/api/admin/orders/' + orderId, {
    maxRedirects: 0, headers: { Origin: origin },
    data: { status, delivery, paid: false, version: order.version, estimatedArrivalAt, note: marker + ' · ' + (status === 'cancelled' ? 'smoke test completed; no real delivery' : 'simulated phone confirmation; no actual call') },
  });
  assert.equal(response.status(), 200);
  const changed = (await response.json()).order;
  ownOrder(changed);
  assert.equal(changed.status, status);
  return changed;
}
async function context() {
  const current = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await current.addInitScript(() => localStorage.setItem('sushi-lang', 'en'));
  await current.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      blockedExternalRequests++;
      await route.abort();
      return;
    }
    if (['GET', 'HEAD'].includes(request.method())) {
      await route.continue();
      return;
    }
    try {
      const data = request.postDataJSON();
      if (request.method() === 'POST' && url.pathname === '/api/auth/sign-in/email') {
        assert.equal(data.email, 'admin');
        assert.equal(data.password, 'admin');
      } else if (request.method() === 'POST' && url.pathname === '/api/admin/products') {
        assert.equal(productWriteAllowed, true);
        assert.match(data.id, /^product-[a-f0-9-]{36}$/);
        assert.equal(productIds.has(data.id), false);
        if (submittedProductId) assert.equal(data.id, submittedProductId);
        assert.equal(data.active, false, 'Product must be inactive in its first save request');
        assert.equal(data.taxRate, 0);
        assert.equal(data.version, 0);
        assert.equal(data.name.en, productName);
        for (const language of ['de', 'uk', 'fa']) {
          assert.equal(data.name[language], '');
          assert.equal(data.description[language], '');
        }
        submittedProductId = data.id;
      } else throw new Error('Unexpected browser mutation');
      await route.continue();
    } catch {
      invalidBrowserRequests++;
      await route.abort();
    }
  });
  return current;
}
async function cleanup() {
  if (!managerReady) return;
  if (orderAttempted) {
    try {
      const candidates = (await get(manager, '/admin/orders')).orders.filter((order) =>
        order.customer.name === marker && order.customer.notes === note && order.userId === null && order.payment === 'cash_on_delivery',
      );
      assert.ok(candidates.length <= 1);
      for (const order of candidates) {
        if (!orderId) orderId = order.id;
        ownOrder(order);
        if (order.status !== 'cancelled') await changeOwnOrder(order, 'cancelled', order.delivery, null);
        const finalOrder = (await get(manager, '/orders/' + orderId)).order;
        ownOrder(finalOrder);
        assert.equal(finalOrder.status, 'cancelled');
      }
      if (orderId) assert.equal(candidates.length, 1);
    } catch { cleanupFailures.push('synthetic order cancellation'); }
  }
  if (submittedProductId) {
    try {
      const product = (await get(manager, '/admin/products')).products.find((item) => item.id === submittedProductId);
      if (product) {
        ownProduct(product);
        if (product.active !== false) {
          await reviewStatus();
          const response = await manager.request.post(origin + '/api/admin/products', {
            maxRedirects: 0, headers: { Origin: origin }, data: { ...product, active: false },
          });
          assert.equal(response.status(), 200);
        }
        const finalProduct = (await get(manager, '/admin/products')).products.find((item) => item.id === submittedProductId);
        ownProduct(finalProduct);
        assert.equal(finalProduct.active, false);
        assert.equal((await get(visitor, '/products')).products.some((item) => item.id === submittedProductId), false);
      }
    } catch { cleanupFailures.push('synthetic product invisibility'); }
  }
}

try {
  await reviewStatus();
  const root = fileURLToPath(new URL('..', import.meta.url));
  const modulePath = process.env.SUSHI_PLAYWRIGHT_MODULE || path.join(root, '../sushi-admin-video-2026-11-03/browser-tools/node_modules/playwright-core/index.mjs');
  const { chromium } = await import(modulePath);
  browser = await chromium.launch({ headless: true, executablePath: process.env.SUSHI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  manager = await context(); visitor = await context(); stranger = await context();
  const admin = await manager.newPage();
  admin.setDefaultTimeout(25000);
  admin.on('pageerror', () => { browserErrors++; });
  stage = 'review administrator login';
  await admin.goto(origin + '/admin/login', { waitUntil: 'networkidle' });
  await admin.locator('header button[lang="en"]').click();
  await admin.getByLabel('Username', { exact: true }).fill('admin');
  await admin.getByLabel('Password', { exact: true }).fill('admin');
  await admin.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await admin.waitForURL(origin + '/admin');
  assert.equal((await get(manager, '/me')).user.admin, true);
  managerReady = true;
  const originalProducts = (await get(manager, '/admin/products')).products;
  productIds = new Set(originalProducts.map((product) => product.id));
  assert.ok(originalProducts.length >= 40);
  assert.ok(originalProducts.every((product) => product.taxRate === 0));
  pass('Exact dedicated review host, email/payment suppression and migrated zero-tax catalog verified');

  stage = 'inactive single-language product creation through UI';
  await admin.getByRole('button', { name: 'Products', exact: true }).click();
  await admin.getByRole('button', { name: 'Add product', exact: true }).click();
  const dialog = admin.getByRole('dialog');
  await dialog.getByRole('heading', { name: 'Add product', exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('ID', { exact: true }).count(), 0);
  await dialog.getByLabel('Price (€)', { exact: true }).fill('13.75');
  await dialog.getByRole('button', { name: 'EN', exact: true }).click();
  await dialog.getByLabel('Product name', { exact: true }).fill(productName);
  await dialog.getByLabel('Ingredients / description', { exact: true }).fill('REVIEW TEST only. One language, no real sale.');
  assert.equal(await dialog.getByLabel(/^VAT rate/).inputValue(), '0');
  await dialog.getByLabel('Visible in shop', { exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'فارسی', exact: true }).click();
  assert.equal(await dialog.locator('form').evaluate((form) => form.checkValidity()), true);
  await reviewStatus();
  productWriteAllowed = true;
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
  productWriteAllowed = false;
  assert.ok(submittedProductId);
  const product = (await get(manager, '/admin/products')).products.find((item) => item.id === submittedProductId);
  ownProduct(product);
  assert.equal(product.active, false);
  assert.equal(product.taxRate, 0);
  assert.equal(product.price, 1375);
  for (const language of ['de', 'uk', 'fa']) assert.equal(product.name[language], '');
  assert.equal((await get(visitor, '/products')).products.some((item) => item.id === submittedProductId), false);
  pass('Generated-ID product saves from a blank translation tab with one language and 0% tax, inactive from its first request');

  stage = 'anonymous no-email cash order';
  const status = await reviewStatus();
  const slot = status.deliveryOptions.find((option) => option.times?.length);
  assert.ok(slot);
  const available = (await get(visitor, '/products')).products.find((item) => item.id === 'philadelphia');
  assert.ok(available && available.taxRate === 0);
  const payload = {
    mode: 'guest', payment: 'cash_on_delivery', language: 'en',
    items: [{ id: available.id, price: available.price, quantity: 1 }],
    customer: { name: marker, phone: '+490000000000', address: 'REVIEW TEST ONLY · no delivery', postcode: '20095', city: 'Hamburg', notes: note, utensils: 0 },
    date: slot.date, time: slot.times[0], zone: 'A', accepted: true, key, guestToken,
  };
  orderAttempted = true;
  const placed = await visitor.request.post(origin + '/api/orders', {
    maxRedirects: 0, headers: { Origin: origin }, data: payload,
  });
  assert.equal(placed.status(), 201);
  const createdOrder = (await placed.json()).order;
  orderId = createdOrder.id;
  ownOrder(createdOrder);
  assert.equal(createdOrder.status, 'new');
  assert.equal(createdOrder.customer.email, '');
  assert.equal(createdOrder.customer.phone, payload.customer.phone);
  zeroTax(createdOrder);
  const anonymous = await get(visitor, '/me');
  assert.equal(anonymous.user, null);
  assert.equal((await visitor.request.get(origin + '/api/admin/orders', { maxRedirects: 0 })).status(), 401);
  for (const suffix of ['', '/messages', '/documents/summary']) {
    for (const token of ['', randomBytes(32).toString('hex')]) {
      const denied = await stranger.request.get(origin + '/api/orders/' + orderId + suffix, {
        maxRedirects: 0, headers: token ? { 'X-Order-Token': token } : {},
      });
      assert.equal(denied.status(), 404);
    }
  }
  const privateOrder = (await get(visitor, '/orders/' + orderId, guestToken)).order;
  ownOrder(privateOrder);
  assert.equal(privateOrder.status, 'new');
  pass('Anonymous phone-only cash order is new and unpaid; private order, thread and document reject absent or wrong tokens');

  stage = 'synthetic order confirmation with fee and ETA';
  const eta = Date.now() + 45 * 60000;
  const confirmed = await changeOwnOrder(privateOrder, 'confirmed', 600, eta);
  assert.equal(confirmed.delivery, 600);
  assert.equal(confirmed.estimatedArrivalAt, eta);
  zeroTax(confirmed);
  const customerView = (await get(visitor, '/orders/' + orderId, guestToken)).order;
  assert.equal(customerView.status, 'confirmed');
  assert.equal(customerView.estimatedArrivalAt, eta);
  assert.equal(customerView.paid, false);
  zeroTax(customerView);
  assert.equal(browserErrors, 0);
  assert.equal(invalidBrowserRequests, 0);
  pass('Staff confirms only this synthetic order with a delivery fee and 45-minute ETA; guest sees unpaid zero-VAT totals');
} catch {
  failed = true;
  console.error('FAIL stage: ' + stage + ' (details suppressed to protect data)');
} finally {
  productWriteAllowed = false;
  await cleanup();
  if (browser) await browser.close();
  if (cleanupFailures.length) {
    failed = true;
    for (const item of cleanupFailures) console.error('FAIL cleanup: ' + item);
  } else if (managerReady) pass('Cleanup checked: no active synthetic order or visible test product remains from this run; existing records untouched');
  console.log(JSON.stringify({ passed: !failed, checks: checks.length, cleanupFailures, blockedExternalRequests, invalidBrowserRequests }));
  if (failed) process.exitCode = 1;
}
