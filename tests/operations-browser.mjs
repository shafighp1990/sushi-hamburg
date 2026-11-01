import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(
  process.env.SUSHI_PLAYWRIGHT_MODULE || 'playwright'
);
const origin = 'http://127.0.0.1:5173',
  out = process.env.SUSHI_QA_OUTPUT || '/tmp/sushi-operations-qa';
await mkdir(out, { recursive: true });
assert.equal((await (await fetch(origin + '/api/status')).json()).demo, true);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const manager = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: { Origin: origin, 'CF-Connecting-IP': '127.0.0.71' },
  }),
  customer = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    extraHTTPHeaders: { Origin: origin, 'CF-Connecting-IP': '127.0.0.72' },
  }),
  stranger = await browser.newContext({ extraHTTPHeaders: { Origin: origin } });
for (const c of [manager, customer])
  await c.addInitScript(() => localStorage.setItem('sushi-lang', 'en'));
const admin = await manager.newPage(),
  page = await customer.newPage(),
  errors = [];
for (const p of [admin, page]) p.on('pageerror', (e) => errors.push(e.message));
const post = async (c, path, data, method = 'POST') => {
  const r = await c.request.fetch(origin + '/api' + path, { method, data });
  const body = await r.json();
  assert.ok(r.ok(), JSON.stringify({ path, status: r.status(), body }));
  return body;
};
try {
  await post(manager, '/auth/sign-in/email', {
    email: 'admin@local.invalid',
    password: 'admin',
  });
  await admin.goto(origin + '/admin');
  await admin
    .getByRole('button', { name: 'Offers / Settings', exact: true })
    .click();
  await admin
    .getByRole('button', { name: 'Operations & communication', exact: true })
    .click();
  await admin
    .getByRole('heading', { name: 'Operations & communication', exact: true })
    .waitFor();
  await admin.screenshot({ path: out + '/admin-hours.png', fullPage: true });
  await admin
    .getByRole('button', { name: 'Payment providers', exact: true })
    .click();
  for (const name of ['Stripe · Card', 'PayPal', 'Revolut', 'SumUp'])
    await admin.getByRole('heading', { name, exact: true }).waitFor();
  for (const field of await admin.locator('input[type=password]').all())
    assert.equal(await field.inputValue(), '');
  await admin.screenshot({ path: out + '/admin-payments.png', fullPage: true });
  console.log(
    'PASS all four payment connection forms render; secrets never echoed',
  );
  await page.goto(origin + '/account');
  await page
    .locator('.choice-row')
    .getByRole('button', { name: 'Create an account', exact: true })
    .click();
  const email = `qa-news-${Date.now()}@example.invalid`;
  await page
    .getByLabel('Name / name on doorbell', { exact: true })
    .fill('LOCAL NEWSLETTER TEST');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .locator('input[type=password]')
    .fill('Local-newsletter-check-2026');
  const checkbox = page.locator('input[type=checkbox]');
  assert.equal(await checkbox.isChecked(), false);
  await checkbox.check();
  await page.locator('form .shop-primary').click();
  await page
    .getByText('Please confirm your email. The discount is not active yet.', {
      exact: true,
    })
    .waitFor();
  const messages = (
      await (await manager.request.get(origin + '/api/admin/mail')).json()
    ).messages,
    confirmation = messages.find(
      (m) => m.recipient === email && m.kind === 'confirmation',
    );
  assert.ok(confirmation);
  assert.equal(confirmation.state, 'queued');
  const preview = await post(manager, '/admin/mail/preview', {
    id: confirmation.id,
  });
  const link = preview.text.match(/http[^\s]+/)[0];
  await page.goto(link);
  await page
    .getByRole('button', { name: 'Confirm email', exact: true })
    .click();
  await page.getByText('Subscribed · extra 5% off', { exact: true }).waitFor();
  const q = {
    mode: 'member',
    zone: 'A',
    items: [{ id: 'philadelphia', price: 900, quantity: 1 }],
  };
  assert.equal((await post(customer, '/quote', q)).newsletterDiscount, 45);
  await page.goto(origin + '/account');
  await page.getByText('Subscribed · extra 5% off', { exact: true }).waitFor();
  await page.screenshot({
    path: out + '/account-newsletter.png',
    fullPage: true,
  });
  const pref = page
    .locator('form')
    .filter({
      has: page.getByRole('heading', { name: 'Newsletter', exact: true }),
    });
  await pref.locator('input[type=checkbox]').uncheck();
  await pref.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByText('Not subscribed', { exact: true }).waitFor();
  assert.equal((await post(customer, '/quote', q)).newsletterDiscount, 0);
  console.log(
    'PASS optional signup → private email preview → confirmation → 5% discount → unsubscribe removes discount',
  );
  const orders = (
      await (await manager.request.get(origin + '/api/admin/orders')).json()
    ).orders,
    paid = orders.find(
      (o) => o.paid && o.customer.email.startsWith('qa-purchase-'),
    );
  assert.ok(paid);
  for (const kind of ['invoice', 'summary', 'receipt']) {
    const r = await manager.request.get(
      `${origin}/api/orders/${paid.id}/documents/${kind}`,
    );
    assert.equal(r.status(), 200);
    assert.equal(r.headers()['content-type'], 'application/pdf');
    const bytes = await r.body();
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    await writeFile(`${out}/worker-${kind}.pdf`, bytes);
    assert.equal(
      (
        await stranger.request.get(
          `${origin}/api/orders/${paid.id}/documents/${kind}`,
        )
      ).status(),
      404,
    );
  }
  console.log(
    'PASS all three PDFs generated in actual local worker; unauthenticated access denied',
  );
  for (const path of [
    '/admin/connections',
    '/admin/mail',
    '/admin/newsletter',
    '/admin/email',
  ])
    assert.equal(
      (await customer.request.get(origin + '/api' + path)).status(),
      403,
      path,
    );
  await admin.getByRole('button', { name: 'Newsletter', exact: true }).click();
  await admin.screenshot({
    path: out + '/admin-newsletter.png',
    fullPage: true,
  });
  await admin
    .getByRole('button', { name: 'Documents & email', exact: true })
    .click();
  await admin
    .getByText('Local test: emails stay in preview and are not sent.', {
      exact: true,
    })
    .waitFor();
  await admin.screenshot({
    path: out + '/admin-documents.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of ['de', 'uk', 'en', 'fa']) {
    await page.locator(`.shop-language button[lang="${lang}"]`).click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      lang,
    );
    await page.screenshot({
      path: `${out}/account-mobile-${lang}.png`,
      fullPage: true,
    });
  }
  await admin.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await admin.screenshot({ path: out + '/admin-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS four-language mobile layouts, staff-only controls, and no browser errors',
  );
} catch (e) {
  await page
    .screenshot({ path: out + '/failure-customer.png', fullPage: true })
    .catch(() => {});
  await admin
    .screenshot({ path: out + '/failure-admin.png', fullPage: true })
    .catch(() => {});
  throw e;
} finally {
  await browser.close();
}
