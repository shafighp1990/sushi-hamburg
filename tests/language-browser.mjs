import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import helpers from './helpers.cjs';
const { load } = helpers;
const { t, errorText } = load('lib/shop-copy.ts');
const { ct } = load('lib/commerce-copy.ts');
const { ot } = load('lib/operations-copy.ts');
const { products } = load('lib/catalog.ts');
const { articles } = load('lib/knowledge.ts');
const knowledgeCopy = JSON.parse(await readFile(new URL('../lib/knowledge-ui-translations.json', import.meta.url), 'utf8')); 
const { chromium } = await import(process.env.SUSHI_PLAYWRIGHT_MODULE || '/private/tmp/communication-audit-browser/node_modules/playwright-core/index.mjs');
const origin = process.env.SUSHI_REVIEW_URL || 'https://sushi-hamburg-review.pages.dev';
assert.ok(['https://sushi-hamburg-review.pages.dev', 'http://127.0.0.1:5173', 'http://127.0.0.1:4173'].includes(origin), 'Use the dedicated review site or local preview');
const languages = (process.env.SUSHI_LANGUAGES || 'de,uk,fa,en').split(',');
assert.ok(languages.every((lang) => ['de', 'uk', 'fa', 'en'].includes(lang)));
const deep = process.env.SUSHI_LANGUAGE_QUICK !== '1';
const remainingRoutes = process.env.SUSHI_LANGUAGE_REMAINING ? JSON.parse(await readFile(process.env.SUSHI_LANGUAGE_REMAINING, 'utf8')) : null;
const out = process.env.SUSHI_QA_OUTPUT || '/private/tmp/sushi-language-browser';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.SUSHI_BROWSER_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const results = [];
const failures = [];
const pageErrors = [];
const hydrationErrors = [];
const blockedMutations = [];
const metadataWarnings = [];
const authenticationRequests = [];
const authenticatedOnly = process.env.SUSHI_LANGUAGE_AUTH_ONLY === "1";
const storageOnly = process.env.SUSHI_LANGUAGE_STORAGE_ONLY;
const controls = { de: 'DE', uk: 'UA', fa: 'فا', en: 'EN' };
const initialCopy = {
  '/': 'homeTitle', '/menu': 'menuTitle', '/gallery': 'gallery', '/account': 'account',
  '/account/reset': 'account', '/checkout': 'checkout', '/order': 'track', '/legal': 'legal', '/privacy': 'privacy',
};
function expectedContent(url, language) {
  const parsed = new URL(url);
  if (parsed.pathname === '/admin/login') return { heading: ct(language, 'staffLogin') };
  if (parsed.pathname === '/admin') return { heading: t(language, 'admin') };
  if (parsed.pathname === '/newsletter') return { heading: ot(language, 'newsletter') };
  if (parsed.pathname === '/wissen') return { heading: knowledgeCopy['Sushi verstehen.'][language] };
  if (parsed.pathname.startsWith('/wissen/')) {
    const article = articles.find((item) => item.id === parsed.pathname.split('/').pop());
    return article ? { heading: article.title[language], paragraph: article.body[language][0], title: article.title[language] } : {};
  }
  const productId = parsed.pathname.startsWith('/menu/') ? parsed.pathname.split('/').pop() : parsed.pathname === '/product' ? parsed.searchParams.get('id') : null;
  if (productId) {
    const product = products.find((item) => item.id === productId);
    return product ? { heading: product.name[language], paragraph: product.description[language], title: product.name[language] } : {};
  }
  return initialCopy[parsed.pathname] ? { heading: t(language, initialCopy[parsed.pathname]) } : {};
}
function instrumentLanguage() {
  const trace = [];
  let previous = '';
  let lastFrame = 0;
  function visible(element) {
    if (!element || !element.getClientRects().length) return false;
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    }
    return true;
  }
  function capture() {
    const heading = document.querySelector('main h1');
    const selected = document.querySelector('header button[lang][aria-pressed="true"]');
    const home = document.querySelector('#shop-navigation a[href="/"]');
    const startup = [...document.querySelectorAll('.language-startup span[lang]')].filter(visible).map((element) => ({ language: element.getAttribute('lang'), text: element.textContent?.trim() }));
    const state = {
      ms: Math.round(performance.now()), url: location.pathname + location.search + location.hash,
      language: document.documentElement?.lang || '', direction: document.documentElement?.dir || '',
      selected: selected?.getAttribute('lang') || '', heading: heading?.textContent?.trim() || '',
      home: home?.textContent?.trim() || '', visible: visible(heading) || visible(selected),
      headingVisible: visible(heading), paragraphs: [...document.querySelectorAll('main p')].filter(visible).slice(0, 4).map((paragraph) => paragraph.textContent?.trim()),
      startup, pending: document.documentElement?.dataset.languagePending || '',
    };
    const signature = JSON.stringify({ ...state, ms: 0 });
    if (signature !== previous) { trace.push(state); previous = signature; }
    lastFrame = performance.now();
    requestAnimationFrame(capture);
  }
  window.__sushiLanguageAudit = {
    trace,
    reset() { trace.length = 0; previous = ''; },
    currentFrame() { return lastFrame; },
  };
  requestAnimationFrame(capture);
}
async function collect(page, language, label, action, extra = {}) {
  await page.evaluate(() => window.__sushiLanguageAudit?.reset());
  const started = Date.now();
  await action();
  if (new URL(page.url()).pathname === '/admin' && !extra.authenticated) await page.waitForURL(origin + '/admin/login');
  if (!extra.authenticated) await page.waitForLoadState('networkidle');
  await page.locator('header button[lang][aria-pressed="true"]').waitFor({ state: 'visible' });
  // Give browser-store hydration and route redirections a bounded settling period.
  await page.waitForFunction(() => !!document.querySelector('main h1') && !document.querySelector('.sample-loading'));
  await page.waitForTimeout(extra.slow ? 350 : extra.authenticated ? 300 : 120);
  const settled = await page.evaluate(() => {
    let cookie = '<unavailable>', stored = '<unavailable>';
    try { cookie = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('sushi-lang=')) || ''; } catch { /* A tested browser policy can deny cookie access. */ }
    try { stored = localStorage.getItem('sushi-lang'); } catch { /* Diagnose UI/cookie state without requiring local storage. */ }
    return ({
    language: document.documentElement.lang,
    direction: document.documentElement.dir,
    selected: document.querySelector('header button[lang][aria-pressed="true"]')?.getAttribute('lang'),
    home: document.querySelector('#shop-navigation a[href="/"]')?.textContent?.trim(),
    heading: document.querySelector('main h1')?.textContent?.trim(),
    paragraphs: [...document.querySelectorAll('main p')].map((paragraph) => paragraph.textContent?.trim()),
    cookie, stored,
    title: document.title,
    trace: window.__sushiLanguageAudit?.trace || [],
  }); });
  const url = page.url();
  const expected = expectedContent(url, language);
  const issues = [];
  if (settled.language !== language) issues.push('Settled html language changed to ' + settled.language);
  if (settled.selected !== language) issues.push('Settled language control changed to ' + settled.selected);
  if (settled.direction !== (language === 'fa' ? 'rtl' : 'ltr')) issues.push('Wrong settled writing direction');
  if (settled.home !== t(language, 'home')) issues.push('Header navigation is not translated');
  if (!extra.skipHeading && expected.heading && settled.heading !== expected.heading) issues.push('Wrong page heading: ' + settled.heading);
  if (expected.paragraph && !settled.paragraphs.includes(expected.paragraph)) issues.push('Expected translated content paragraph is missing');
  const transients = settled.trace.filter((state) => {
    const wanted = expectedContent(origin + state.url, language);
    const german = expectedContent(origin + state.url, 'de');
    const germanHeading = language !== 'de' && state.headingVisible && wanted.heading !== german.heading && state.heading === german.heading;
    const germanParagraph = language !== 'de' && wanted.paragraph !== german.paragraph && german.paragraph && state.paragraphs.includes(german.paragraph);
    const wrongShell = state.visible && (state.language !== language || state.selected !== language || state.direction !== (language === 'fa' ? 'rtl' : 'ltr') || state.home !== t(language, 'home'));
    const wrongLoading = state.startup.some((entry) => entry.language !== language);
    return germanHeading || germanParagraph || wrongShell || wrongLoading;
  });
  if (transients.length) issues.push('Visible wrong-language startup/navigation frame');
  if (language !== 'de' && (/(?:Sushi-Catering & Lieferung|Zutaten & Bestellung|Sushi-Wissen)/.test(settled.title) || expected.title && !settled.title.includes(expected.title))) {
    metadataWarnings.push({ language, label, url, title: settled.title, expected: expected.title });
  }
  const result = { requestedLanguage: language, label, url, elapsedMs: Date.now() - started, ...extra, issues, transients, ...settled };
  results.push(result);
  if (issues.length) failures.push({ language, label, url, issues });
  return result;
}
async function click(page, selector) {
  const link = page.locator(selector).first();
  await link.waitFor({ state: 'visible' });
  await link.click();
}
try {
  for (const language of authenticatedOnly || storageOnly ? [] : languages) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(instrumentLanguage);
    await context.route('**/*', async (route) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
        blockedMutations.push({ language, method: route.request().method(), url: route.request().url() });
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => pageErrors.push({ language, url: page.url(), message: error.message }));
    page.on('console', (message) => { if (['error', 'warning'].includes(message.type()) && /hydrat|Minified React error/i.test(message.text())) hydrationErrors.push({ language, url: page.url(), message: message.text() }); });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: controls[language], exact: true }).click();
    await page.waitForFunction((wanted) => document.documentElement.lang === wanted && document.querySelector('header button[aria-pressed="true"]')?.getAttribute('lang') === wanted, language);
    if (!remainingRoutes) {
    const flow = [
      ['menu link', '#shop-navigation a[href="/menu"]'],
      ['product link', 'main a[href^="/product?id="]'],
      ['product article link', 'main a[href^="/wissen/"]'],
      ['knowledge index link', 'main a[href="/wissen"]'],
      ['knowledge article link', 'main a[href="/wissen/geschichte"]'],
      ['gallery footer link', 'footer a[href="/gallery"]'],
      ['account link', 'header a[href="/account"]'],
      ['checkout link', 'header a[href="/checkout"]'],
      ['legal footer link', 'footer a[href="/legal"]'],
      ['privacy footer link', 'footer a[href="/privacy"]'],
      ['home link', '#shop-navigation a[href="/"]'],
    ];
    for (const [label, selector] of flow) await collect(page, language, label, () => click(page, selector));
    await collect(page, language, 'browser reload', () => page.reload({ waitUntil: 'domcontentloaded' }));
    await collect(page, language, 'browser back', () => page.goBack({ waitUntil: 'domcontentloaded' }));
    await collect(page, language, 'browser forward', () => page.goForward({ waitUntil: 'domcontentloaded' }));
    for (const route of ['/admin/login', '/admin', '/account/reset', '/newsletter', '/order']) {
      await collect(page, language, 'direct ' + route, () => page.goto(origin + route, { waitUntil: 'domcontentloaded' }));
    }
    const newTab = await context.newPage();
    newTab.on('pageerror', (error) => pageErrors.push({ language, url: newTab.url(), message: error.message }));
    await collect(newTab, language, 'new tab with saved preference', () => newTab.goto(origin + '/wissen', { waitUntil: 'domcontentloaded' }));
    await newTab.close();
    await page.bringToFront();
    await page.route('**/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });
    await collect(page, language, 'slow JS full navigation', () => page.goto(origin + '/privacy', { waitUntil: 'networkidle' }), { slow: true });
    await page.unroute('**/*.js');
    for (const routePath of ['/privacy', '/wissen/geschichte']) {
      const delayedPageChunks = [];
      await page.route('**/*.js', async (route) => {
        if (/(?:info-pages|knowledge|InfoPage|KnowledgeArticle)/i.test(route.request().url())) {
          delayedPageChunks.push(route.request().url());
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        await route.continue();
      });
      await collect(page, language, 'slow page chunk with fast shell', () => page.goto(origin + routePath, { waitUntil: 'networkidle' }), { slow: true });
      results[results.length - 1].delayedPageChunks = delayedPageChunks;
      if (!delayedPageChunks.length) failures.push({ language, label: 'page-chunk delay did not match any asset', routePath });
      await page.unroute('**/*.js');
    }
    }
    if (deep || remainingRoutes) {
      const routes = remainingRoutes ? remainingRoutes[language] || [] : [
        ...articles.map((article) => '/wissen/' + article.id),
        ...products.map((product) => '/menu/' + product.id),
        ...products.map((product) => '/product?id=' + product.id),
      ];
      for (const route of routes) await collect(page, language, 'all-content route', () => page.goto(origin + route, { waitUntil: 'domcontentloaded' }));
    }
    const missingOrder = '00000000-0000-4000-8000-000000000000';
    let missingOrderRequests = 0;
    page.on('request', (request) => { if (request.url().includes('/api/orders/' + missingOrder)) missingOrderRequests++; });
    await page.goto(origin + '/order?id=' + missingOrder, { waitUntil: 'networkidle' });
    const alert = page.locator('main [role="alert"]');
    await alert.waitFor();
    const beforeRequests = missingOrderRequests;
    const nextLanguage = language === 'fa' ? 'en' : 'fa';
    await page.getByRole('button', { name: controls[nextLanguage], exact: true }).click();
    await page.waitForTimeout(200);
    const retainedError = await alert.innerText();
    const errorIssues = [];
    if (retainedError !== errorText(nextLanguage, 'NOT_FOUND')) errorIssues.push('Existing error did not translate to selected language');
    if (missingOrderRequests !== beforeRequests) errorIssues.push('Changing language refetched the failed request instead of retaining feedback');
    results.push({ requestedLanguage: language, label: 'existing read-only error translates without refetch', url: page.url(), language: nextLanguage, retainedError, requestCount: missingOrderRequests, issues: errorIssues });
    if (errorIssues.length) failures.push({ language, label: 'existing read-only error', issues: errorIssues });
    await page.getByRole('button', { name: controls[language], exact: true }).click();
    await page.screenshot({ path: out + '/' + language + '-settled.png' });
    console.log(language + ': ' + results.filter((result) => result.requestedLanguage === language).length + ' checks; ' + failures.filter((result) => result.language === language).length + ' findings');
    await context.close();
  }
  for (const mode of authenticatedOnly || process.env.SUSHI_LANGUAGE_SKIP_STORAGE === '1' ? [] : storageOnly ? [storageOnly] : ['cookie-writes-blocked', 'local-storage-blocked', 'all-store-access-blocked', 'all-store-writes-silently-blocked']) {
    const context = await browser.newContext();
    await context.addInitScript(instrumentLanguage);
    await context.addInitScript((policy) => {
      const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      if (cookie && policy !== 'local-storage-blocked') Object.defineProperty(Document.prototype, 'cookie', {
        configurable: true,
        get() { if (policy === 'all-store-access-blocked') throw new DOMException('Blocked cookie access', 'SecurityError'); return cookie.get.call(this); },
        set() { if (policy === 'all-store-access-blocked') throw new DOMException('Blocked cookie access', 'SecurityError'); },
      });
      if (policy !== 'cookie-writes-blocked') {
        const read = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem').value;
        const write = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem').value;
        Storage.prototype.getItem = function (key) {
          if (key === 'sushi-lang' && ['all-store-access-blocked', 'local-storage-blocked'].includes(policy)) throw new DOMException('Blocked storage', 'SecurityError');
          return read.call(this, key);
        };
        Storage.prototype.setItem = function (key, value) {
          if (key === 'sushi-lang') { if (['all-store-access-blocked', 'local-storage-blocked'].includes(policy)) throw new DOMException('Blocked storage', 'SecurityError'); return; }
          write.call(this, key, value);
        };
      }
    }, mode);
    await context.addCookies([{ name: 'sushi-lang', value: 'de', url: origin }]);
    await context.route('**/*', async (route) => {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
        blockedMutations.push({ mode, url: route.request().url() }); await route.abort('blockedbyclient'); return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', (error) => pageErrors.push({ mode, message: error.message }));
    try {
      await page.goto(origin, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await page.waitForFunction(() => document.documentElement.lang === 'en');
      await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('pageshow')); });
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => ({ language: document.documentElement.lang, selected: document.querySelector('header button[aria-pressed="true"]')?.getAttribute('lang') }));
      const issues = state.language === 'en' && state.selected === 'en' ? [] : ['In-memory selection was lost after focus/pageshow'];
      results.push({ requestedLanguage: 'en', label: mode, ...state, issues });
      if (issues.length) failures.push({ language: 'en', label: mode, issues });
      if (['cookie-writes-blocked', 'local-storage-blocked'].includes(mode)) await collect(page, 'en', mode + ' retained preference on reload', () => page.reload({ waitUntil: 'domcontentloaded' }));
    } catch (error) { failures.push({ language: 'en', label: mode, error: String(error) }); }
    finally { await context.close(); }
  }
  if (process.env.SUSHI_LANGUAGE_AUTH === '1' || authenticatedOnly) {
    const status = await (await fetch(origin + '/api/status')).json();
    assert.equal(status.reviewMode, true, 'Review-only authentication for protected page inspection');
    for (const role of ['admin', 'kunde']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
      await context.addInitScript(instrumentLanguage);
      await context.route('**/*', async (route) => {
        const request = route.request();
        if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/sign-in/email') {
          authenticationRequests.push({ role, url: request.url() }); await route.continue(); return;
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          blockedMutations.push({ role, url: request.url() }); await route.abort('blockedbyclient'); return;
        }
        await route.continue();
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => pageErrors.push({ role, url: page.url(), message: error.message }));
      page.on('console', (message) => { if (['error', 'warning'].includes(message.type()) && /hydrat|Minified React error/i.test(message.text())) hydrationErrors.push({ role, url: page.url(), message: message.text() }); });
      await page.goto(origin + (role === 'admin' ? '/admin/login' : '/account?return=/checkout'), { waitUntil: 'networkidle' });
      await page.locator('header').getByRole('button', { name: controls.fa, exact: true }).click();
      await page.waitForFunction(() => document.documentElement.lang === 'fa');
      await page.locator('input[autocomplete="username"]').fill(role);
      await page.locator('input[autocomplete="current-password"]').fill(role);
      await collect(page, 'fa', role + ' sign-in redirect preserves Persian', async () => {
        await page.locator('form').getByRole('button', { name: t('fa', 'signIn'), exact: true }).click();
        await page.waitForFunction((destination) => location.pathname === destination, role === 'admin' ? '/admin' : '/checkout');
      }, { authenticated: true });
      const signedIn = (await (await context.request.get(origin + '/api/me')).json()).user;
      assert.ok(signedIn);
      assert.equal(signedIn.admin, role === 'admin');
      for (const language of languages) {
        await page.locator('header').getByRole('button', { name: controls[language], exact: true }).click();
        await page.waitForFunction((wanted) => document.documentElement.lang === wanted, language);
        if (role === 'admin') {
          for (const tab of ['overview', 'orders', 'products', 'customers']) {
            await collect(page, language, 'owner ' + tab, () => page.locator('.admin-tabs').getByRole('button', { name: t(language, tab), exact: true }).click(), { authenticated: true });
          }
          await page.locator('.admin-tabs').getByRole('button', { name: ct(language, 'offers') + ' / ' + ct(language, 'settings'), exact: true }).click();
          for (const tab of ['appearance', 'offers', 'discounts', 'settings', 'reports']) {
            await collect(page, language, 'owner commerce ' + tab, () => page.locator('.commerce-admin > nav').getByRole('button', { name: ct(language, tab), exact: true }).click(), { authenticated: true });
          }
          await page.locator('.commerce-admin > nav').getByRole('button', { name: ot(language, 'operations'), exact: true }).click();
          for (const tab of ['hours', 'payments', 'newsletter', 'documents']) {
            await collect(page, language, 'owner operations ' + tab, () => page.locator('.operations-admin > nav').getByRole('button', { name: ot(language, tab), exact: true }).click(), { authenticated: true });
          }
        } else {
          await collect(page, language, 'signed-in customer account', () => page.goto(origin + '/account', { waitUntil: 'domcontentloaded' }), { authenticated: true, skipHeading: true });
          assert.equal(await page.getByRole('heading', { name: t(language, 'profile'), exact: true }).count(), 1);
          if (await page.locator('a.order-card[href^="/order?id="]').count()) {
            await collect(page, language, 'signed-in customer order', () => page.locator('a.order-card[href^="/order?id="]').first().click(), { authenticated: true });
          }
        }
      }
      await context.close();
    }
  }
} catch (error) {
  failures.push({ harnessError: String(error) });
  console.error(error);
} finally {
  const report = { origin, deep, languages, checks: results.length, failures, metadataWarnings, pageErrors, hydrationErrors, blockedMutations, authenticationRequests, results };
  await writeFile(out + '/language-results.json', JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify({ checks: results.length, failures: failures.length, metadataWarnings: metadataWarnings.length, pageErrors: pageErrors.length, hydrationErrors: hydrationErrors.length, blockedMutations: blockedMutations.length }));
  if (failures.length || pageErrors.length || hydrationErrors.length || blockedMutations.length) process.exitCode = 1;
}
