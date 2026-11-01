import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const origin = process.env.SUSHI_REVIEW_URL || 'http://127.0.0.1:4173';
const target = new URL(origin);
const local = ['localhost', '127.0.0.1'].includes(target.hostname);
assert.equal(target.origin, origin, 'Use an origin without a path or trailing slash');
assert.ok(local || origin === 'https://sushi-hamburg-review.pages.dev', 'Only local or the dedicated review instance is allowed');
assert.ok(local || process.env.SUSHI_ALLOW_REVIEW_MUTATIONS === '1', 'Remote review test must be explicitly enabled');
const statusResponse = await fetch(origin + '/api/status', { redirect: 'error' });
assert.equal(statusResponse.status, 200);
const status = await statusResponse.json();
assert.equal(status.reviewMode, true, 'Refuse mutations unless the server confirms review mode');
assert.equal(status.ready, true, 'Review database must be ready');
const { chromium } = await import(process.env.SUSHI_PLAYWRIGHT_MODULE || '/private/tmp/communication-audit-browser/node_modules/playwright-core/index.mjs');
const out = process.env.SUSHI_QA_OUTPUT || '/private/tmp/sushi-review-browser';
await mkdir(out, { recursive: true });
const root = fileURLToPath(new URL('..', import.meta.url));
const browser = await chromium.launch({ headless: true, executablePath: process.env.SUSHI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [];
const contexts = await Promise.all([0, 1, 2].map(async (index) => {
  const context = await browser.newContext({ viewport: { width: index ? 1280 : 1440, height: 950 }, ...(local ? { extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.' + (81 + index) } } : {}) });
  await context.addInitScript(() => localStorage.setItem('sushi-lang', 'en'));
  return context;
}));
const [manager, customer, secondCustomer] = contexts;
const [admin, page, other] = await Promise.all(contexts.map((context) => context.newPage()));
for (const current of [admin, page, other]) {
  current.setDefaultTimeout(20000);
  current.on('pageerror', (error) => errors.push(error.message));
}
const runId = Date.now().toString(36);
const marker = `REVIEW TEST ${runId}`;
const checks = [];
let originalCustomerProfile;
let originalProduct;
let originalSettings;
let createdProduct;
let orderId;
function pass(message) { checks.push(message); console.log('PASS ' + message); }
async function json(context, route) {
  const response = await context.request.get(origin + '/api' + route);
  assert.equal(response.status(), 200, route + ': ' + await response.text());
  return response.json();
}
async function post(context, route, data) {
  const response = await context.request.post(origin + '/api' + route, { data, headers: { Origin: origin } });
  assert.equal(response.status(), 200, route + ': ' + await response.text());
  return response.json();
}
async function layout(current, step) {
  assert.equal(await current.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, step + ': horizontal overflow');
  const visibleArrows = await current.locator('body').innerText();
  assert.doesNotMatch(visibleArrows, /[←→↑↓↗↘↙↖›‹➜➔]/, step + ': visible directional glyph');
}
async function mobileLayout(current, step) {
  const previous = current.viewportSize();
  await current.setViewportSize({ width: 390, height: 844 });
  await layout(current, step);
  if (previous) await current.setViewportSize(previous);
}
async function login(current, alias, staff = false) {
  await current.goto(origin + (staff ? '/admin/login' : '/account'), { waitUntil: 'networkidle' });
  await current.getByRole('button', { name: 'EN', exact: true }).click();
  await current.locator('.review-notice').waitFor();
  const username = current.getByLabel('Username', { exact: true });
  await username.fill(alias);
  assert.equal(await username.getAttribute('type'), 'text');
  await current.getByLabel('Password', { exact: true }).fill(alias);
  await current.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  if (staff) await current.waitForURL(origin + '/admin');
  else await current.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
}
async function openOrder() {
  await admin.getByRole('button', { name: 'Orders', exact: true }).click();
  await admin.getByRole('searchbox').fill(orderId);
  await admin.locator('.admin-order-grid .order-card').filter({ hasText: orderId.slice(0, 8).toUpperCase() }).click();
  return admin.getByRole('dialog');
}
async function saveDialog(dialog) {
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
try {
  await login(admin, 'admin', true);
  await login(page, 'kunde');
  await login(other, 'kunde2');
  originalCustomerProfile = (await json(customer, '/me')).user;
  assert.equal(originalCustomerProfile.admin, false);
  assert.equal((await json(manager, '/me')).user.admin, true);
  assert.equal(await page.locator('input[type=email]').count(), 0);
  await layout(admin, 'Admin landing');
  await layout(page, 'Customer account');
  await mobileLayout(page, 'Mobile customer account');
  await mobileLayout(admin, 'Mobile admin landing');
  pass('review accounts sign in through UI with username and no email requirement');

  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: 'View the menu', exact: true }).click();
  await page.getByRole('button', { name: 'Add to order', exact: true }).first().click();
  await page.goto(origin + '/checkout', { waitUntil: 'networkidle' });
  assert.equal(await page.locator('input[type=email]').count(), 0);
  assert.equal(await page.locator('input[name=payment]').count(), 1);
  assert.equal(await page.locator('input[name=payment]').inputValue(), 'cash_on_delivery');
  await page.getByLabel('Name / name on doorbell', { exact: true }).fill(marker);
  await page.getByLabel('Phone', { exact: true }).fill('+490000000000');
  await page.getByLabel('Street, house number, postcode, city', { exact: true }).fill('TEST ONLY · Mönckebergstraße 1');
  await page.getByLabel('Postcode', { exact: true }).fill('20095');
  const dates = await page.getByLabel('Delivery date', { exact: true }).locator('option').evaluateAll((options) => options.map((option) => option.value));
  assert.ok(dates.length > 0, 'At least one delivery day');
  await page.getByLabel('Delivery date', { exact: true }).selectOption(dates[Math.min(1, dates.length - 1)]);
  const times = await page.getByLabel('Preferred time', { exact: true }).locator('option').evaluateAll((options) => options.map((option) => option.value));
  await page.getByLabel('Preferred time', { exact: true }).selectOption(times.includes('18:00') ? '18:00' : times[0]);
  await page.getByLabel('Order notes', { exact: true }).fill(marker + ' · no real delivery, payment or email');
  await page.locator('input[type=checkbox]').last().check();
  await layout(page, 'Checkout');
  await mobileLayout(page, 'Mobile checkout');
  await page.screenshot({ path: out + '/checkout.png', fullPage: true });
  await page.getByRole('button', { name: 'Place test order', exact: true }).click();
  await page.waitForURL('**/order?id=**');
  orderId = new URL(page.url()).searchParams.get('id');
  assert.ok(orderId);
  const placed = (await json(customer, '/orders/' + orderId)).order;
  assert.equal(placed.payment, 'cash_on_delivery');
  assert.equal(placed.paid, false);
  assert.equal(placed.customer.name, marker);
  pass('customer places a clearly marked COD review order without entering email');

  assert.equal((await secondCustomer.request.get(origin + '/api/orders/' + orderId)).status(), 404);
  assert.equal((await secondCustomer.request.get(origin + '/api/orders/' + orderId + '/messages')).status(), 404);
  assert.equal((await customer.request.get(origin + '/api/admin/orders')).status(), 403);
  await other.goto(origin + '/order?id=' + orderId, { waitUntil: 'networkidle' });
  await other.locator('[role=alert]').waitFor();
  assert.equal(await other.getByText(marker, { exact: true }).count(), 0);
  assert.equal(await other.locator('.order-conversation').count(), 0);
  pass('second customer cannot read another order or conversation; customer cannot access admin API');

  await page.getByLabel('Message', { exact: true }).fill(marker + ' customer question');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByText(marker + ' customer question', { exact: true }).waitFor();
  await admin.bringToFront();
  await admin.getByRole('button', { name: 'Refresh', exact: true }).click();
  let dialog = await openOrder();
  await dialog.getByText(marker + ' customer question', { exact: true }).waitFor();
  await dialog.getByLabel('Message', { exact: true }).fill(marker + ' restaurant reply');
  await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
  await dialog.getByText(marker + ' restaurant reply', { exact: true }).waitFor();
  await dialog.getByLabel('Status', { exact: true }).selectOption('confirmed');
  await dialog.getByLabel('Delivery fee (€)', { exact: true }).fill('6');
  const arrivalField = dialog.locator('input[type=datetime-local]');
  await arrivalField.fill('2027-03-28T02:30');
  assert.notEqual(await arrivalField.evaluate((input) => input.validationMessage), '', 'Reject nonexistent Hamburg DST time');
  await dialog.getByRole('button', { name: '45 minutes', exact: true }).click();
  assert.equal(await arrivalField.evaluate((input) => input.validationMessage), '', 'Valid preset clears previous manual-time error');
  const etaInput = await dialog.locator('input[type=datetime-local]').inputValue();
  assert.ok(etaInput.length >= 16);
  await dialog.getByLabel('Message to customer', { exact: true }).fill(marker + ' confirmed');
  await layout(admin, 'Order editor');
  await saveDialog(dialog);
  const confirmed = (await json(customer, '/orders/' + orderId)).order;
  assert.equal(confirmed.status, 'confirmed');
  assert.equal(confirmed.delivery, 600);
  assert.equal(confirmed.total, confirmed.subtotal - confirmed.discount + 600);
  assert.ok(confirmed.estimatedArrivalAt > Date.now());
  await page.bringToFront();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Refresh messages', exact: true }).click();
  await page.getByText(marker + ' restaurant reply', { exact: true }).waitFor();
  await page.getByText(/Estimated arrival:/).waitFor();
  await page.locator('.receipt-top .status-badge').getByText('Confirmed', { exact: true }).waitFor();
  await page.screenshot({ path: out + '/confirmed-and-message.png', fullPage: true });
  pass('manager replies then saves status, delivery fee and ETA without a stale-version conflict; customer sees all changes');

  for (const [state, label] of [['preparing', 'Preparing'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered']]) {
    dialog = await openOrder();
    await dialog.getByLabel('Status', { exact: true }).selectOption(state);
    if (state === 'delivered') await dialog.getByLabel('Paid', { exact: true }).check();
    await saveDialog(dialog);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await page.locator('.receipt-top .status-badge').getByText(label, { exact: true }).waitFor();
  }
  const delivered = (await json(customer, '/orders/' + orderId)).order;
  assert.equal(delivered.paid, true);
  assert.equal(delivered.status, 'delivered');
  pass('manager completes preparation, delivery and cash collection; customer tracking follows');

  originalProduct = (await json(manager, '/admin/products')).products.find((product) => product.id === 'philadelphia');
  assert.ok(originalProduct);
  originalSettings = (await json(manager, '/settings')).settings;
  await admin.getByRole('button', { name: 'Products', exact: true }).click();
  await admin.getByRole('searchbox').fill('philadelphia');
  await admin.locator('.admin-product-list > div').filter({ has: admin.getByText(originalProduct.name.en, { exact: true }) }).getByRole('button', { name: 'Edit', exact: true }).first().click();
  dialog = admin.getByRole('dialog');
  await dialog.getByLabel('Price (€)', { exact: true }).fill(String((originalProduct.price + 100) / 100));
  const removePhotos = dialog.getByRole('button', { name: 'Remove photo', exact: true });
  while (await removePhotos.count()) await removePhotos.first().click();
  await dialog.locator('details summary').click();
  const chosenPhoto = await dialog.locator('details button').first().getAttribute('aria-label');
  await dialog.locator('details button').first().click();
  await saveDialog(dialog);
  const repriced = (await json(manager, '/admin/products')).products.find((product) => product.id === originalProduct.id);
  assert.equal(repriced.price, originalProduct.price + 100);
  assert.equal(repriced.image, '/photos/' + chosenPhoto);
  pass('owner changes an existing product price and chooses a gallery photo through the UI');

  await admin.getByRole('button', { name: 'Add product', exact: true }).click();
  dialog = admin.getByRole('dialog');
  const productId = 'review-qa-' + runId;
  await dialog.getByLabel('ID', { exact: true }).fill(productId);
  await dialog.getByLabel('Price (€)', { exact: true }).fill('12.5');
  for (const language of ['DE', 'UA', 'EN', 'فارسی']) {
    await dialog.getByRole('button', { name: language, exact: true }).click();
    const translated = dialog.locator('div[dir]:visible');
    await translated.locator('input').fill(marker + ' ' + language);
    await translated.locator('textarea').fill('Review-only sample product. No real sale. ' + language);
  }
  if (status.upload) {
    await dialog.locator('input[type=file]').setInputFiles(path.join(root, 'public/products/philadelphia-1600.jpg'));
    await dialog.locator('img[src^="/api/media/"]').first().waitFor();
  } else {
    throw new Error('Review image storage is required to verify owner photo uploads');
  }
  await saveDialog(dialog);
  createdProduct = (await json(manager, '/admin/products')).products.find((product) => product.id === productId);
  assert.ok(createdProduct);
  assert.equal(createdProduct.price, 1250);
  assert.ok(createdProduct.image.startsWith('/api/media/'));
  await page.goto(origin + '/product?id=' + productId, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: createdProduct.name.en, exact: true }).waitFor();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('img')).some((image) => image.src.includes('/api/media/') && image.complete && image.naturalWidth > 0));
  pass('owner creates a product with four translated names/descriptions and uploads a usable photo');

  await admin.getByRole('button', { name: 'Offers / Settings', exact: true }).click();
  await admin.getByRole('button', { name: 'Offers', exact: true }).click();
  const offerForm = admin.locator('.commerce-admin form.shop-form');
  await offerForm.getByLabel('Enabled', { exact: true }).check();
  for (const language of ['DE', 'UK', 'EN', 'FA']) {
    await offerForm.getByRole('button', { name: language, exact: true }).click();
    await offerForm.getByLabel('Offer title', { exact: true }).fill(marker + ' offer');
    await offerForm.getByLabel('Offer description', { exact: true }).fill('Review offer, no real sale or payment. ' + language);
  }
  await offerForm.getByLabel(createdProduct.name.en, { exact: true }).check();
  await offerForm.getByRole('button', { name: 'Save settings', exact: true }).click();
  await admin.locator('.commerce-admin').getByText('Saved', { exact: true }).waitFor();
  await page.goto(origin + '/menu', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: marker + ' offer', exact: true }).waitFor();
  await page.getByText(createdProduct.name.en, { exact: true }).first().waitFor();
  pass('owner publishes an offer and featured product visible to the customer');

  for (const current of [page, admin]) await current.setViewportSize({ width: 390, height: 844 });
  for (const [button, language, direction] of [['DE', 'de', 'ltr'], ['EN', 'en', 'ltr'], ['UA', 'uk', 'ltr'], ['فا', 'fa', 'rtl']]) {
    await page.getByRole('button', { name: button, exact: true }).click();
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    assert.equal(await page.locator('html').getAttribute('dir'), direction);
    await layout(page, 'Mobile menu ' + language);
  }
  await page.screenshot({ path: out + '/mobile-persian.png', fullPage: true });
  await admin.getByRole('button', { name: 'EN', exact: true }).first().click();
  await admin.getByRole('button', { name: 'Orders', exact: true }).click();
  dialog = await openOrder();
  await layout(admin, 'Mobile owner order');
  await dialog.getByLabel('Message', { exact: true }).fill(marker + ' mobile owner reply');
  await dialog.getByRole('button', { name: 'Send message', exact: true }).click();
  await dialog.getByText(marker + ' mobile owner reply', { exact: true }).waitFor();
  assert.ok((await json(customer, '/orders/' + orderId + '/messages')).messages.some((message) => message.text === marker + ' mobile owner reply'));
  await admin.screenshot({ path: out + '/mobile-admin.png' });
  assert.deepEqual(errors, []);
  pass('mobile customer and manager screens have no horizontal overflow, all four languages work, and no page errors occurred');
} catch (error) {
  process.exitCode = 1;
  console.error(error);
  await Promise.allSettled([page.screenshot({ path: out + '/failure-customer.png', fullPage: true }), admin.screenshot({ path: out + '/failure-admin.png', fullPage: true })]);
} finally {
  const cleanupErrors = [];
  for (const [route, data] of [['/admin/products', originalProduct], ['/admin/settings', originalSettings], ['/admin/products', createdProduct && { ...createdProduct, active: false }]]) {
    if (!data) continue;
    try {
      const current = route === '/admin/products' ? (await json(manager, '/admin/products')).products.find((product) => product.id === data.id) : null;
      await post(manager, route, current ? { ...data, version: current.version } : data);
    } catch (error) { cleanupErrors.push(String(error)); }
  }
  if (originalCustomerProfile) {
    try {
      const { name, phone, address, postcode, city, language } = originalCustomerProfile;
      const response = await customer.request.patch(origin + '/api/me', {
        data: { name, phone, address, postcode, city, language }, headers: { Origin: origin },
      });
      assert.equal(response.status(), 200, 'Restore review customer profile: ' + await response.text());
      const restored = (await json(customer, '/me')).user;
      for (const field of ['name', 'phone', 'address', 'postcode', 'city', 'language']) assert.equal(restored[field], originalCustomerProfile[field], 'Profile restored: ' + field);
    } catch (error) { cleanupErrors.push(String(error)); }
  }
  if (cleanupErrors.length) { process.exitCode = 1; console.error('Cleanup failures', cleanupErrors); }
  await writeFile(out + '/review-result.json', JSON.stringify({ origin, marker, orderId, productId: createdProduct?.id, passed: !process.exitCode, checks, pageErrors: errors, cleanupErrors }, null, 2));
  await browser.close();
}
