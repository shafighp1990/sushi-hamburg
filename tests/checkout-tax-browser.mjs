import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const origin = process.env.SUSHI_LOCAL_URL || 'http://127.0.0.1:4189';
const target = new URL(origin);
assert.equal(target.origin, origin);
assert.ok(['localhost', '127.0.0.1'].includes(target.hostname), 'Local read-only browser check');
const status = await (await fetch(origin + '/api/status', { redirect: 'error' })).json();
assert.equal(status.ready, true);
assert.equal(status.reviewMode, true);
const root = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = await import(process.env.SUSHI_PLAYWRIGHT_MODULE || path.join(root, '../sushi-admin-video-2026-11-03/browser-tools/node_modules/playwright-core/index.mjs'));
const output = process.env.SUSHI_QA_OUTPUT || '/private/tmp/sushi-checkout-tax-browser';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.SUSHI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [], forbiddenRequests = [], checks = [];
page.on('pageerror', (error) => errors.push(error.message));
let releaseQuote;
const quoteGate = new Promise((resolve) => { releaseQuote = resolve; });
await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const isQuote = url.origin === origin && url.pathname === '/api/quote' && request.method() === 'POST';
  if (url.origin !== origin || (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !isQuote)) {
    forbiddenRequests.push(request.method() + ' ' + url.pathname);
    await route.abort();
    return;
  }
  if (isQuote) {
    await quoteGate;
  }
  await route.continue();
});
async function layout(description) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, description);
}
let failure;
try {
  await page.goto(origin + '/menu/philadelphia', { waitUntil: 'networkidle' });
  await page.locator('header button[lang="en"]').click();
  await page.getByRole('button', { name: 'Add to order', exact: true }).click();
  const quoteSeen = page.waitForRequest((request) => new URL(request.url()).pathname === '/api/quote' && request.method() === 'POST');
  await page.locator('header a[href="/checkout"]').click();
  await page.waitForURL(origin + '/checkout', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Phone', { exact: true }).waitFor();
  await quoteSeen;
  for (const { name, viewport } of [{ name: 'desktop', viewport: { width: 1280, height: 900 } }, { name: 'mobile', viewport: { width: 390, height: 844 } }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.getByText('VAT treatment has not been configured.', { exact: true }).count(), 0);
    assert.equal(await page.locator('.tax-note').count(), 0, 'No tax assertion before the quote arrives');
    await layout('Pending checkout ' + name);
    await page.screenshot({ path: path.join(output, name + '-pending.png'), fullPage: true });
    checks.push(name + ': pending quote shows no false VAT-configuration warning');
  }
  const responsePromise = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/quote' && response.status() === 200);
  releaseQuote();
  const quote = await (await responsePromise).json();
  assert.equal(quote.tax.mode, 'small_business');
  await page.getByText('VAT-exempt under § 19 UStG. No VAT stated separately.', { exact: true }).waitFor();
  for (const { name, viewport } of [{ name: 'mobile', viewport: { width: 390, height: 844 } }, { name: 'desktop', viewport: { width: 1280, height: 900 } }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.getByText('VAT treatment has not been configured.', { exact: true }).count(), 0);
    await layout('Calculated checkout ' + name);
    await page.screenshot({ path: path.join(output, name + '-calculated.png'), fullPage: true });
    checks.push(name + ': returned quote displays the existing small-business VAT notice');
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(forbiddenRequests, []);
  console.log('PASS ' + checks.length + ' pending/calculated checkout checks; no order or account writes');
} catch (error) {
  failure = error;
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
} finally {
  releaseQuote();
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ origin, passed: !failure, checks, errors, forbiddenRequests, failure: failure ? String(failure.stack || failure) : null }, null, 2));
  await context.close();
  await browser.close();
}
if (failure) throw failure;
