const { chromium } = await import(
  process.env.SUSHI_PLAYWRIGHT_MODULE || 'playwright'
);
import assert from 'node:assert/strict';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
const origin = process.env.SUSHI_LOCAL_URL || 'http://127.0.0.1:5173';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(origin).hostname),
  'Local test only',
);
assert.equal(
  (await (await fetch(origin + '/api/status')).json()).demo,
  true,
  'Requires local demo database',
);
const mobile = process.env.SUSHI_QA_MOBILE === '1';
const out = process.env.SUSHI_QA_OUTPUT || '/tmp/sushi-purchase-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.SUSHI_BROWSER_PATH ||
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const manager = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 950 },
    isMobile: mobile,
    hasTouch: mobile,
    extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.61' },
  }),
  visitor = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    isMobile: mobile,
    hasTouch: mobile,
    extraHTTPHeaders: { 'CF-Connecting-IP': '127.0.0.62' },
  }),
  stranger = await browser.newContext();
const admin = await manager.newPage(),
  page = await visitor.newPage(),
  errors = [];
for (const p of [admin, page]) p.on('pageerror', (e) => errors.push(e.message));
const email = `qa-guest-${Date.now()}@example.invalid`,
  name = `LOCAL TEST · ${mobile ? 'Mobile' : 'Desktop'} guest`,
  address = 'TEST ADDRESS · Mönckebergstraße 1',
  phone = '+490000000000',
  notes =
    'LOCAL GUEST PURCHASE TEST — no real delivery. Doorbell: TEST. Two cutlery sets.';
async function layoutCheck(p, step) {
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, step + ': horizontal overflow');
}
try {
  await admin.goto(origin + '/admin/login', { waitUntil: 'networkidle' });
  await admin.getByRole('button', { name: 'EN', exact: true }).click();
  await admin.getByLabel('Username / email', { exact: true }).fill('admin');
  await admin.getByLabel('Password', { exact: true }).fill('admin');
  await admin
    .locator('form')
    .getByRole('button', { name: 'Sign in', exact: true })
    .click();
  await admin.waitForURL(origin + '/admin');
  await admin.locator('.live-orders .connected').waitFor();
  let signupRequests = 0;
  page.on('request', r => { if(r.url().includes('/api/auth/sign-up')) signupRequests++; });
  await page.goto(origin, { waitUntil: 'networkidle' });
  await page.getByRole('button', {name:'EN',exact:true}).click();
  assert.equal(await page.locator('.menu-catalog').count(), 0);
  await page.getByRole('link', { name: 'View the menu', exact: true }).click();
  await page.waitForURL(origin + '/menu');
  assert.equal(await page.locator('a[href="/admin"]').count(), 0);
  await layoutCheck(page, 'Menu');
  if (mobile) {
    await page.locator('.nav-toggle').click();
    await page.locator('.site-nav a[href="/menu"]').waitFor({state:'visible'});
    await page.locator('.nav-toggle').click();
  }
  await page
    .getByRole('button', { name: 'Add to order', exact: true })
    .first()
    .click();
  await page.goto(origin + '/checkout', { waitUntil: 'networkidle' });
  await page.getByRole('button',{name:'Checkout as guest',exact:true}).click();
  assert.equal(await page.locator('input[type=password]').count(),0);
  await page.getByLabel('Name / name on doorbell',{exact:true}).fill(name);
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Phone', { exact: true }).fill(phone);
  await page
    .getByLabel('Street, house number, postcode, city', { exact: true })
    .fill(address);
  await page.getByLabel('Postcode', { exact: true }).fill('20095');
  const dates = await page
    .getByLabel('Delivery date', { exact: true })
    .locator('option')
    .evaluateAll((xs) => xs.map((x) => x.value));
  const date = dates[1];
  await page.getByLabel('Delivery date', { exact: true }).selectOption(date);
  await page.getByLabel('Preferred time', { exact: true }).selectOption('18:00');
  await page.getByLabel('Cutlery sets', { exact: true }).fill('2');
  await page.getByLabel('Order notes', { exact: true }).fill(notes);
  await page.locator('input[type=checkbox]').last().check();
  await page
    .locator('.tax-note')
    .getByText(/19/)
    .waitFor();
  await page.screenshot({
    path: out + '/purchase-checkout.png',
    fullPage: true,
  });
  await layoutCheck(page, 'Checkout');
  const start = Date.now();
  await page.locator('form').getByRole('button').last().click();
  await page.waitForURL('**/order?id=**');
  const id = new URL(page.url()).searchParams.get('id'),
    short = id.slice(0, 8).toUpperCase();
  const privateURL = page.url(), token = new URLSearchParams(new URL(privateURL).hash.slice(1)).get('token');
  assert.ok(token && token.length >= 32);
  const guestHeaders = {'X-Order-Token':token};
  await writeFile(
    out + '/purchase-test.json',
    JSON.stringify(
      { id, short, email, name, date, address, note: notes },
      null,
      2,
    ),
  );
  await admin
    .locator('.incoming-orders button')
    .filter({ hasText: short })
    .waitFor({ timeout: 8000 });
  const liveMs = Date.now() - start;
  console.log(
    'PASS new COD order reaches manager automatically in ' + liveMs + ' ms',
  );
  await admin
    .locator('.incoming-orders button')
    .filter({ hasText: short })
    .click();
  let dialog = admin.getByRole('dialog');
  await layoutCheck(admin, 'Admin order detail');
  const body = await dialog.innerText();
  for (const value of [
    name,
    email,
    phone,
    address,
    '20095 Hamburg',
    date,
    '18:00',
    'Cutlery sets: 2',
    notes,
    'Philadelphia',
  ])
    assert.ok(body.includes(value), 'Missing admin field: ' + value);
  let response = await visitor.request.get(origin + '/api/orders/' + id, {headers:guestHeaders});
  let order = (await response.json()).order;
  assert.equal(order.userId,null);
  assert.equal((await (await visitor.request.get(origin+'/api/me')).json()).user,null);
  assert.equal(signupRequests,0);
  assert.equal(order.customer.email, email);
  assert.equal(order.customer.utensils, 2);
  assert.equal(order.payment, 'cash_on_delivery');
  assert.equal(order.paid, false);
  assert.equal(order.total, null);
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].id, 'philadelphia');
  assert.equal(order.items[0].quantity, 1);
  assert.equal(order.subtotal, 900);
  assert.equal(order.tax.mode, 'small_business');
  assert.equal(
    (await stranger.request.get(origin + '/api/orders/' + id)).status(),
    404,
  );
  assert.equal(
    (await visitor.request.get(origin + '/api/admin/orders')).status(),
    401,
  );
  console.log(
    'PASS all customer, delivery and product details match; other customers cannot access order',
  );
  assert.equal(await page.getByRole('button',{name:'Payment receipt PDF',exact:true}).isDisabled(),true);
  assert.notEqual((await visitor.request.get(origin+'/api/orders/'+id+'/documents/receipt',{headers:guestHeaders})).status(),200);
  await dialog.getByRole('combobox').selectOption('confirmed');
  await dialog.locator('input[type=number]').fill('6');
  await dialog
    .getByLabel('Message to customer', { exact: true })
    .fill('LOCAL TEST: delivery confirmed for 18:00.');
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await dialog.waitFor({ state: 'hidden' });
  await page.bringToFront();
  await page
    .locator('.receipt-top .status-badge')
    .getByText('Confirmed', { exact: true })
    .waitFor({ timeout: 36000 });
  assert.match(await page.locator('.receipt-total').innerText(), /15,00/);
  console.log(
    'PASS customer automatically sees confirmation and €15 total (9 + 6 delivery)',
  );
  for (const [status, label, note] of [
    [
      'preparing',
      'Preparing',
      'LOCAL TEST: the kitchen is preparing your sushi.',
    ],
    [
      'out_for_delivery',
      'Out for delivery',
      'LOCAL TEST: your order is on its way.',
    ],
    ['delivered', 'Delivered', 'LOCAL TEST: delivered; €15 cash received.'],
  ]) {
    await admin
      .locator('.admin-order-grid .order-card')
      .filter({ hasText: short })
      .click();
    dialog = admin.getByRole('dialog');
    await dialog.getByRole('combobox').selectOption(status);
    await dialog.getByLabel('Message to customer', { exact: true }).fill(note);
    if (status === 'delivered')
      await dialog.getByLabel('Paid', { exact: true }).check();
    await dialog
      .getByRole('button', { name: 'Save changes', exact: true })
      .click();
    await dialog.waitFor({ state: 'hidden' });
    await page.bringToFront();
    if (!mobile) await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await page
      .locator('.receipt-top .status-badge')
      .getByText(label, { exact: true })
      .waitFor({ timeout: 36000 });
    assert.ok(
      (await page.locator('.order-history').innerText()).includes(note),
    );
    console.log('PASS manager ' + status + (mobile ? ' → automatic customer tracking and message' : ' → customer tracking and message'));
  }
  response = await visitor.request.get(origin + '/api/orders/' + id, {headers:guestHeaders});
  const result = await response.json();
  order = result.order;
  assert.equal(order.status, 'delivered');
  assert.equal(order.paid, true);
  assert.equal(order.total, 1500);
  assert.equal(order.delivery, 600);
  assert.equal(order.tax.vat, 0);
  assert.equal(order.tax.net, 1500);
  await admin
    .locator('.incoming-orders button')
    .filter({ hasText: 'New paid order' })
    .waitFor({ timeout: 8000 });
  assert.equal(await page.locator('.order-timeline .complete').count(), 5);
  assert.match(await page.locator('.receipt-total').innerText(), /Paid/);
  await page.screenshot({
    path: out + '/purchase-delivered.png',
    fullPage: true,
  });
  await layoutCheck(page, 'Delivered tracking');
  // Reopen in the same browser without the fragment: the saved guest capability is used.
  await page.goto(origin + '/order?id=' + id);
  await page.locator('.receipt-top .status-badge').getByText('Delivered',{exact:true}).waitFor();
  assert.equal((await (await visitor.request.get(origin+'/api/me')).json()).user,null);
  const customers = (await (await manager.request.get(origin+'/api/admin/customers')).json()).customers;
  assert.equal(customers.some(c=>c.email===email),false);
  console.log('PASS no account created; guest returns to order without logging in');
  // A copied private link also works in a completely fresh browser, with no account or storage.
  const returning = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
  await returning.addInitScript(()=>localStorage.setItem('sushi-lang','en'));
  const recipient = await returning.newPage();
  recipient.on('pageerror',e=>errors.push(e.message));
  await recipient.goto(privateURL);
  await recipient.locator('.receipt-top .status-badge').getByText('Delivered',{exact:true}).waitFor();
  assert.equal((await (await returning.request.get(origin+'/api/me')).json()).user,null);
  const documents=[];
  for (const [kind,label] of [['invoice','Invoice PDF'],['summary','Order summary PDF'],['receipt','Payment receipt PDF']]) {
    const downloadEvent=recipient.waitForEvent('download');
    await recipient.getByRole('button',{name:label,exact:true}).click();
    const download=await downloadEvent;
    assert.equal(await download.failure(),null);
    await download.saveAs(out+'/'+kind+'.pdf');
    const bytes=await readFile(out+'/'+kind+'.pdf');
    assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    assert.ok(bytes.length>1000);
    const endpoint=origin+'/api/orders/'+id+'/documents/'+kind;
    assert.equal((await stranger.request.get(endpoint)).status(),404);
    assert.equal((await stranger.request.get(endpoint,{headers:{'X-Order-Token':'wrong-token'}})).status(),404);
    documents.push({kind,bytes:bytes.length,downloaded:true});
  }
  await layoutCheck(recipient,'Guest private-link tracking');
  await recipient.screenshot({path:out+'/private-link-tracking.png',fullPage:true});
  await returning.close();
  console.log('PASS fresh-browser private link and three real PDF downloads; invalid/absent tokens denied');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'فا', exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: out + '/purchase-delivered-fa.png',
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    out + '/purchase-test.json',
    JSON.stringify(
      {
        id,
        short,
        email,
        name,
        date,
        address,
        note: notes,
        passed: true,
        guest: true,
        accountCreated: false,
        documents,
        device: mobile ? 'mobile (390 × 844, touch)' : 'desktop',
        liveMs,
        total: 1500,
        vat: 0,
        status: 'delivered',
        paid: true,
      },
      null,
      2,
    ),
  );
  await admin.getByRole('button', {name:'Orders',exact:true}).click();
  await admin.locator('.admin-order-grid .order-card').filter({hasText:short}).click();
  await admin.screenshot({
    path: out + '/purchase-admin.png',
    animations: 'disabled',
  });
  await admin
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await admin.getByRole('button', { name: 'Orders', exact: true }).click();
  await admin.screenshot({
    path: out + '/light-admin.png',
    animations: 'disabled',
  });
  console.log('PASS complete ' + (mobile ? 'mobile' : 'desktop') + ' guest purchase test ' + short);
} catch (e) {
  await page.screenshot({
    path: out + '/purchase-failure-customer.png',
    fullPage: true,
  });
  await admin.screenshot({
    path: out + '/purchase-failure-admin.png',
    fullPage: true,
  });
  console.error(e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
