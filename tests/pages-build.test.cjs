const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');

function fixture(context) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'sushi-export-check-'));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, data) => {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), data);
  };
  const html =
    '<!doctype html><html><head><link rel="stylesheet" href="/assets/app.css"></head><body><main>Shop</main><img src="/images/product.jpg" alt="Product"><script src="/assets/app.js" type="module"></script></body></html>';
  for (const page of [
    'index.html',
    'menu.html',
    'account.html',
    'admin.html',
    'admin/login/index.html',
    'checkout.html',
    'order.html',
  ])
    write(page, html);
  write('assets/app.js', 'document.documentElement.dataset.ready = "true";');
  write(
    'assets/app.css',
    '@font-face{font-family:shop;src:url("./font.woff2")}',
  );
  write('assets/font.woff2', 'fixture-font');
  write('images/product.jpg', 'fixture-image');
  write(
    '_routes.json',
    JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }),
  );
  return { root, write };
}

void test('Pages guard accepts complete flat/nested essential routes with existing runtime assets and API routing', async (context) => {
  const { checkPagesBuild } = await import('../scripts/check-pages-build.mjs');
  const { root } = fixture(context);
  assert.deepEqual(checkPagesBuild(root), { pages: 7, assets: 4 });
});

void test('Pages guard rejects a successful tool exit that emitted only 404 or omitted an essential login page', async (context) => {
  const { checkPagesBuild } = await import('../scripts/check-pages-build.mjs');
  const { root, write } = fixture(context);
  fs.rmSync(path.join(root, 'index.html'));
  write(
    '404.html',
    '<!doctype html><html><head><title>404: Not found</title></head><body>Missing</body></html>',
  );
  assert.throws(() => checkPagesBuild(root), /\/: missing exported HTML/);
  write('index.html', fs.readFileSync(path.join(root, 'menu.html')));
  fs.rmSync(path.join(root, 'admin/login/index.html'));
  assert.throws(
    () => checkPagesBuild(root),
    /\/admin\/login: missing exported HTML/,
  );
});

void test('Pages guard rejects missing hydration/CSS assets and an API exclusion before deployment', async (context) => {
  const { checkPagesBuild } = await import('../scripts/check-pages-build.mjs');
  const { root, write } = fixture(context);
  fs.rmSync(path.join(root, 'assets/app.js'));
  assert.throws(
    () => checkPagesBuild(root),
    /missing linked asset \/assets\/app.js/,
  );
  write('assets/app.js', '');
  fs.rmSync(path.join(root, 'assets/font.woff2'));
  assert.throws(
    () => checkPagesBuild(root),
    /missing linked asset \/assets\/font.woff2/,
  );
  write('assets/font.woff2', 'fixture-font');
  write(
    '_routes.json',
    JSON.stringify({
      version: 1,
      include: ['/api/*'],
      exclude: ['/api/auth/*'],
    }),
  );
  assert.throws(() => checkPagesBuild(root), /API requests are excluded/);
});
