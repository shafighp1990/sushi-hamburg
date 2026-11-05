import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Mutating browser coverage is deliberately limited to a fresh local review DB.
const origin = process.env.SUSHI_LOCAL_URL || 'http://127.0.0.1:4189';
const target = new URL(origin);
assert.equal(target.origin, origin, 'Use an origin without a path or trailing slash');
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname), 'Local browser regression only');
assert.equal(target.protocol, 'http:');
const statusResponse = await fetch(origin + '/api/status', { redirect: 'error' });
assert.equal(statusResponse.status, 200);
const status = await statusResponse.json();
assert.equal(status.ready, true, 'Local database must be ready');
assert.equal(status.reviewMode, true, 'Refuse writes outside local review mode');
assert.equal(status.upload, true, 'Local image storage is needed for the real photo upload');
assert.equal(status.email, false, 'Review mode must not deliver email');
for (const provider of ['stripe', 'paypal', 'sumup', 'revolut']) assert.equal(status[provider], false);

const root = fileURLToPath(new URL('..', import.meta.url));
const modulePath = process.env.SUSHI_PLAYWRIGHT_MODULE || path.join(root, '../sushi-admin-video-2026-11-03/browser-tools/node_modules/playwright-core/index.mjs');
const { chromium } = await import(modulePath);
const output = process.env.SUSHI_QA_OUTPUT || '/private/tmp/sushi-guest-cod-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SUSHI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const checks = [], errors = [], hydrationErrors = [], blockedRequests = [], guestAuthRequests = [], paymentRequests = [];
const runId = Date.now().toString(36);
const marker = 'LOCAL GUEST FIX ' + runId;
const productName = marker + ' sushi';
const phone = '+490000000000';
const price = 1375;
const pendingPhoneNotice = 'Your order has been received. Sushi HH will call you to confirm it. Until then, your order is not yet confirmed.';
const contexts = [];
let manager, visitor, stranger, admin, page, other;
let managerSignedIn = false;
let product, orderId, guestToken, initialCustomerIds;
let failure;
const cleanupErrors = [];

function pass(message) {
  checks.push(message);
  console.log('PASS ' + message);
}
async function context(index) {
  const current = await browser.newContext({
    viewport: { width: index ? 1280 : 1440, height: 950 },
    extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.' + (131 + index) },
  });
  contexts.push(current);
  await current.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) {
      blockedRequests.push(request.method() + ' ' + url.origin + url.pathname);
      await route.abort();
      return;
    }
    if (url.pathname.startsWith('/api/payments/')) paymentRequests.push(url.pathname);
    if (index && url.pathname.startsWith('/api/auth/')) guestAuthRequests.push(url.pathname);
    await route.continue();
  });
  return current;
}
async function newPage(current) {
  const created = await current.newPage();
  created.setDefaultTimeout(25000);
  created.on('pageerror', (error) => errors.push(error.message));
  created.on('console', (message) => {
    if (message.type() === 'error' && /hydration|hydrating|Minified React error/i.test(message.text())) hydrationErrors.push(message.text());
  });
  return created;
}
async function get(current, endpoint, token) {
  const response = await current.request.get(origin + '/api' + endpoint, { headers: token ? { 'X-Order-Token': token } : {} });
  assert.equal(response.status(), 200, endpoint + ': ' + await response.text());
  return response.json();
}
async function mutate(current, method, endpoint, data) {
  const response = await current.request.fetch(origin + '/api' + endpoint, { method, data, headers: { Origin: origin } });
  assert.equal(response.status(), 200, endpoint + ': ' + await response.text());
  return response.json();
}
async function locale(current, language) {
  // These calls occur on public pages, where network-idle waits for the
  // exported page's client modules before exercising their UI handlers.
  await current.waitForLoadState('networkidle');
  await current.locator('header button[lang="' + language + '"]').click();
  await checkLocale(current, language);
}
async function checkLocale(current, language) {
  await current.waitForFunction((wanted) => document.documentElement.lang === wanted
    && document.documentElement.dir === (wanted === 'fa' ? 'rtl' : 'ltr')
    && document.querySelector('header button[lang][aria-pressed="true"]')?.getAttribute('lang') === wanted
    && !document.documentElement.dataset.languagePending, language);
}
async function layout(current, description) {
  assert.equal(await current.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, description + ': horizontal overflow');
  assert.doesNotMatch(await current.locator('body').innerText(), /[←→↑↓↗↘↙↖›‹➜➔]/, description + ': visible directional glyph');
}
async function mobile(current, description) {
  const previous = current.viewportSize();
  await current.setViewportSize({ width: 390, height: 844 });
  await layout(current, description);
  await current.screenshot({ path: path.join(output, description + '-mobile.png'), fullPage: true });
  if (previous) await current.setViewportSize(previous);
}
async function openOrder() {
  await admin.getByRole('button', { name: 'Orders', exact: true }).click();
  await admin.getByRole('searchbox').fill(orderId);
  const card = admin.locator('.admin-order-grid .order-card').filter({ hasText: orderId.slice(0, 8).toUpperCase() });
  await card.getByText('Awaiting phone confirmation', { exact: true }).waitFor();
  await card.click();
  return admin.getByRole('dialog');
}
async function save(dialog) {
  assert.equal(await dialog.locator('form').first().evaluate((form) => form.checkValidity()), true, 'Visible completed form must be valid');
  await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
  await dialog.waitFor({ state: 'hidden' });
}
function zeroTax(order) {
  assert.ok(['small_business', 'no_vat'].includes(order.tax.mode));
  assert.equal(order.tax.vat, 0);
  assert.equal(order.tax.net, order.total);
  assert.equal(order.tax.gross, order.total);
  assert.ok(order.items.every((item) => item.taxRate === 0));
  assert.ok(order.tax.groups.every((group) => group.rate === 0 && group.vat === 0));
}

try {
  manager = await context(0); visitor = await context(1); stranger = await context(2);
  admin = await newPage(manager); page = await newPage(visitor); other = await newPage(stranger);
  await admin.goto(origin + '/admin/login', { waitUntil: 'domcontentloaded' });
  await locale(admin, 'en');
  await admin.getByLabel('Username', { exact: true }).fill(process.env.SUSHI_ADMIN_USERNAME || 'admin');
  await admin.getByLabel('Password', { exact: true }).fill(process.env.SUSHI_ADMIN_PASSWORD || 'admin');
  await admin.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click();
  await admin.waitForFunction(() => location.pathname === '/admin');
  await admin.getByRole('button', { name: 'Products', exact: true }).waitFor();
  assert.equal((await get(manager, '/me')).user.admin, true);
  managerSignedIn = true;
  const initialOrders = (await get(manager, '/admin/orders')).orders;
  assert.ok(initialOrders.every((order) => order.customer.name.startsWith('LOCAL GUEST FIX ')), 'Refuse to use old video fixtures or a database containing unrelated orders');
  initialCustomerIds = (await get(manager, '/admin/customers')).customers.map((customer) => customer.id).sort();
  const catalogue = (await get(manager, '/admin/products')).products;
  assert.ok(catalogue.length >= 40);
  assert.ok(catalogue.every((item) => item.taxRate === 0), 'Every existing catalog product must have a 0% rate');
  assert.ok(['small_business', 'no_vat'].includes((await get(manager, '/settings')).settings.taxMode));
  pass('isolated local review guard and all existing product tax rates are zero');

  await admin.getByRole('button', { name: 'Products', exact: true }).click();
  await admin.getByRole('button', { name: 'Add product', exact: true }).click();
  let dialog = admin.getByRole('dialog');
  await dialog.getByRole('heading', { name: 'Add product', exact: true }).waitFor();
  assert.equal(await dialog.getByLabel('ID', { exact: true }).count(), 0, 'Internal product identifier must not be a required owner field');
  await dialog.getByLabel('Price (€)', { exact: true }).fill('13.75');
  await dialog.getByRole('button', { name: 'EN', exact: true }).click();
  await dialog.getByLabel('Product name', { exact: true }).fill(productName);
  await dialog.getByLabel('Ingredients / description', { exact: true }).fill('Local synthetic sushi. One supplied language; no real sale.');
  assert.equal(await dialog.getByLabel(/^VAT rate/).inputValue(), '0');
  const uploadResponse = dialog.page().waitForResponse((response) => new URL(response.url()).pathname === '/api/admin/media' && response.request().method() === 'POST');
  await dialog.locator('input[type=file]').setInputFiles(path.join(root, 'public/products/philadelphia-1600.jpg'));
  assert.equal((await uploadResponse).status(), 200);
  await dialog.locator('img[src^="/api/media/"]').first().waitFor();
  // Switching to an empty translation must not invalidate another complete language.
  await dialog.getByRole('button', { name: 'فارسی', exact: true }).click();
  await dialog.getByRole('heading', { name: 'Add product', exact: true }).waitFor();
  assert.deepEqual(await dialog.locator('form').evaluate((form) => Array.from(form.elements)
    .filter((field) => 'willValidate' in field && field.willValidate && !field.validity.valid)
    .map((field) => ({ tag: field.tagName, label: field.getAttribute('aria-label'), message: field.validationMessage }))), []);
  await layout(admin, 'Product editor');
  await mobile(admin, 'product-editor');
  await dialog.screenshot({ path: path.join(output, 'product-single-language.png') });
  await save(dialog);
  product = (await get(manager, '/admin/products')).products.find((item) => item.name.en === productName);
  assert.ok(product, 'Product must persist after single-language save');
  assert.match(product.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(product.price, price);
  assert.equal(product.taxRate, 0);
  assert.ok(product.image.startsWith('/api/media/'));
  for (const language of ['de', 'uk', 'fa']) assert.equal(product.name[language], '', 'Unsupplied admin translations remain editable, not fabricated');
  const publicProduct = (await get(visitor, '/products')).products.find((item) => item.id === product.id);
  assert.ok(publicProduct);
  for (const language of ['de', 'uk', 'fa', 'en']) {
    assert.equal(publicProduct.name[language], productName, 'Public product uses the provided original text when a translation is missing');
    assert.equal(publicProduct.description[language], product.description.en);
  }
  assert.equal(publicProduct.taxRate, 0);
  pass('owner saves a product with one language, an uploaded photo and default 0% tax after visiting a blank language tab');

  await page.goto(origin + '/product?id=' + product.id, { waitUntil: 'domcontentloaded' });
  await locale(page, 'en');
  await page.getByRole('heading', { name: productName, exact: true }).waitFor();
  await page.waitForFunction(() => Array.from(document.images).some((image) => image.src.includes('/api/media/') && image.complete && image.naturalWidth > 0));
  await page.getByRole('button', { name: 'Add to order', exact: true }).click();
  const phoneCopy = { de: /telefon|anruf/i, uk: /телефон|зателеф/i, fa: /تلفن|تماس/, en: /phone|call/i };
  for (const language of ['de', 'uk', 'fa', 'en']) {
    await locale(page, language);
    await page.getByRole('heading', { name: productName, exact: true }).waitFor();
    await page.locator('header a[href="/checkout"]').click();
    await page.waitForURL(origin + '/checkout');
    await checkLocale(page, language);
    await page.locator('form input[type=tel]').waitFor();
    assert.equal(await page.locator('form input[type=email], form input[type=password]').count(), 0);
    assert.deepEqual(await page.locator('input[name=payment]').evaluateAll((inputs) => inputs.map((input) => ({ value: input.value, checked: input.checked, disabled: input.disabled }))), [{ value: 'cash_on_delivery', checked: true, disabled: false }]);
    assert.match(await page.locator('form').innerText(), phoneCopy[language], language + ': phone confirmation guidance');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await checkLocale(page, language);
    await page.locator('form input[type=tel]').waitFor();
    await layout(page, language + ' checkout');
    if (language === 'fa') await mobile(page, 'persian-checkout');
    if (language !== 'en') await page.goto(origin + '/product?id=' + product.id, { waitUntil: 'domcontentloaded' });
  }
  pass('DE, UK, FA and EN persist through product-to-checkout links and reloads; guest/COD guidance and translated shell remain available');

  assert.equal((await get(visitor, '/me')).user, null);
  const guestChoice = page.getByRole('button', { name: 'Checkout as guest', exact: true });
  assert.equal(await guestChoice.getAttribute('aria-pressed'), 'true', 'Guest checkout should be the anonymous default');
  await page.getByLabel('Name / name on doorbell', { exact: true }).fill(marker);
  await page.getByLabel('Phone', { exact: true }).fill(phone);
  await page.getByLabel('Street, house number, postcode, city', { exact: true }).fill('LOCAL TEST ONLY · Mönckebergstraße 1');
  await page.getByLabel('Postcode', { exact: true }).fill('20095');
  const dates = await page.getByLabel('Delivery date', { exact: true }).locator('option').evaluateAll((options) => options.map((option) => option.value));
  assert.ok(dates.length);
  await page.getByLabel('Delivery date', { exact: true }).selectOption(dates[Math.min(1, dates.length - 1)]);
  const times = await page.getByLabel('Preferred time', { exact: true }).locator('option').evaluateAll((options) => options.map((option) => option.value));
  assert.ok(times.length);
  await page.getByLabel('Preferred time', { exact: true }).selectOption(times.includes('18:00') ? '18:00' : times[0]);
  await page.getByLabel('Order notes', { exact: true }).fill(marker + ' · test phone confirmation, no actual call or delivery');
  await page.locator('form input[type=checkbox]').last().check();
  assert.equal(await page.locator('form').evaluate((form) => form.checkValidity()), true);
  await page.screenshot({ path: path.join(output, 'guest-checkout.png'), fullPage: true });
  const placedResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/orders' && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Place test order', exact: true }).click();
  const createdResponse = await placedResponse;
  assert.equal(createdResponse.status(), 201);
  await page.waitForURL('**/order?id=**');
  const privateUrl = new URL(page.url());
  // Checkout navigates the document immediately; obtain the committed ID
  // from that navigation instead of reading a response body after its teardown.
  orderId = privateUrl.searchParams.get('id');
  guestToken = new URLSearchParams(privateUrl.hash.slice(1)).get('token');
  assert.ok(orderId);
  assert.ok(guestToken && guestToken.length >= 32, 'Private capability is returned in fragment');
  let detail = await get(visitor, '/orders/' + orderId, guestToken);
  let order = detail.order;
  assert.equal(order.userId, null);
  assert.equal(order.customer.email, '');
  assert.equal(order.customer.name, marker);
  assert.equal(order.customer.phone, phone);
  assert.equal(order.payment, 'cash_on_delivery');
  assert.equal(order.status, 'new');
  assert.equal(order.paid, false);
  assert.equal(order.subtotal, price);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].id, product.id);
  assert.equal(order.items[0].taxRate, 0);
  assert.equal((await get(visitor, '/me')).user, null);
  assert.deepEqual((await get(manager, '/admin/customers')).customers.map((customer) => customer.id).sort(), initialCustomerIds);
  assert.deepEqual(guestAuthRequests, []);
  assert.deepEqual(paymentRequests, []);
  pass('anonymous customer submits COD without email, sign-in, signup, account creation or online payment; it remains new and unpaid');

  for (const suffix of ['', '/messages', '/documents/summary']) {
    assert.equal((await stranger.request.get(origin + '/api/orders/' + orderId + suffix)).status(), 404, 'Order capability required: ' + suffix);
  }
  assert.equal((await visitor.request.get(origin + '/api/admin/orders')).status(), 401);
  await other.goto(origin + '/order?id=' + orderId, { waitUntil: 'domcontentloaded' });
  await other.locator('[role=alert]').waitFor();
  assert.equal(await other.getByText(marker, { exact: true }).count(), 0);
  assert.equal(await other.locator('.order-conversation').count(), 0);
  await page.goto(origin + '/order?id=' + orderId, { waitUntil: 'domcontentloaded' });
  await page.locator('.receipt-top .status-badge').getByText('Received', { exact: true }).waitFor();
  await page.getByText(pendingPhoneNotice, { exact: true }).waitFor();
  pass('guest private tracking survives same-browser reload; another anonymous visitor cannot read order, conversation or documents');

  await admin.getByRole('button', { name: 'Refresh', exact: true }).click();
  dialog = await openOrder();
  await dialog.locator('a[href="tel:' + phone + '"]').waitFor();
  await dialog.getByText('Call the customer to confirm the order, delivery time and delivery fee. Then change the status to Confirmed.', { exact: true }).waitFor();
  await dialog.getByLabel('Status', { exact: true }).selectOption('confirmed');
  await dialog.getByLabel('Delivery fee (€)', { exact: true }).fill('6');
  const arrival = order.date + 'T' + order.time;
  await dialog.locator('input[type=datetime-local]').fill(arrival);
  await dialog.getByLabel('Message to customer', { exact: true }).fill(marker + ' · phone confirmation simulated: availability, delivery time and €6 delivery fee agreed.');
  assert.equal(await dialog.getByLabel('Paid', { exact: true }).isChecked(), false);
  await layout(admin, 'Phone confirmation editor');
  await dialog.screenshot({ path: path.join(output, 'phone-confirmation-editor.png') });
  await save(dialog);
  detail = await get(visitor, '/orders/' + orderId, guestToken);
  order = detail.order;
  assert.equal(order.status, 'confirmed');
  assert.equal(order.paid, false);
  assert.equal(order.delivery, 600);
  assert.equal(order.total, price + 600);
  assert.ok(order.estimatedArrivalAt);
  assert.ok(detail.events.some((event) => event.note.includes('phone confirmation simulated')));
  zeroTax(order);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.locator('.receipt-top .status-badge').getByText('Confirmed', { exact: true }).waitFor();
  assert.equal(await page.getByText(pendingPhoneNotice, { exact: true }).count(), 0, 'The pending phone notice disappears after staff confirmation');
  await page.getByText(/Estimated arrival:/).waitFor();
  assert.match(await page.locator('.receipt-total').innerText(), /19,75/);
  await page.screenshot({ path: path.join(output, 'confirmed-zero-tax.png'), fullPage: true });
  await mobile(page, 'confirmed-order');
  assert.deepEqual(guestAuthRequests, []);
  assert.deepEqual(paymentRequests, []);
  assert.deepEqual(blockedRequests, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(hydrationErrors, []);
  pass('manager can view the phone and record a simulated phone confirmation, delivery fee and ETA; guest sees an unpaid €19.75 order with zero VAT');
} catch (error) {
  failure = error;
  for (const [name, current] of [['admin-error', admin], ['guest-error', page]]) {
    if (current && !current.isClosed()) await current.screenshot({ path: path.join(output, name + '.png'), fullPage: true }).catch(() => {});
  }
} finally {
  // Keep only labelled, cancelled/inactive evidence in this isolated local DB.
  if (managerSignedIn) {
    try {
      const current = (await get(manager, '/admin/orders')).orders.find((item) => item.id === orderId || item.customer.name === marker);
      if (current) {
        orderId = current.id;
        await mutate(manager, 'PATCH', '/admin/orders/' + orderId, {
        status: 'cancelled', delivery: current.delivery, paid: false, version: current.version,
        estimatedArrivalAt: current.estimatedArrivalAt, note: marker + ' · completed local test; no real delivery',
        });
      }
    } catch (error) { cleanupErrors.push(String(error)); }
  }
  if (managerSignedIn) {
    try {
      product ||= (await get(manager, '/admin/products')).products.find((item) => item.name.en === productName);
      if (product) await mutate(manager, 'POST', '/admin/products', { ...product, active: false });
    } catch (error) { cleanupErrors.push(String(error)); }
  }
  const report = {
    origin, runId, passed: !failure && cleanupErrors.length === 0, checks, productId: product?.id, orderId,
    errors, hydrationErrors, blockedRequests, guestAuthRequests, paymentRequests, cleanupErrors,
    failure: failure ? String(failure.stack || failure).replace(/#token=[^\s"']+/g, '#token=[redacted]') : null,
  };
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2));
  for (const current of contexts) await current.close();
  await browser.close();
}
if (failure) throw failure;
assert.deepEqual(cleanupErrors, [], 'Local test cleanup');
console.log('PASS ' + checks.length + ' guest/COD/product/tax regression scenarios');
