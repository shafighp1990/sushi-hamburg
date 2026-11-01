const test = require('node:test'),
  assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, '..', relative),
    mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
    filename: file,
  })(
    (name) =>
      name.startsWith('.')
        ? load(
            path.relative(
              path.resolve(__dirname, '..'),
              path.resolve(path.dirname(file), name + '.ts'),
            ),
          )
        : require(name),
    mod,
    mod.exports,
  );
  return mod.exports;
}
const { readLanguage, persistLanguage, languageFromCookie } = load(
  'lib/language-preference.ts',
);
function browser(cookie = '', saved = null) {
  let documentCookie = cookie,
    local = saved;
  return {
    get cookie() {
      return documentCookie;
    },
    set cookie(value) {
      documentCookie = value.split(';')[0];
    },
    read: () => local,
    write: (value) => {
      local = value;
    },
  };
}
void test('selection persists before immediate navigation and a new provider mount', () => {
  for (const lang of ['en', 'fa', 'uk', 'de']) {
    const state = browser('sushi-lang=de');
    persistLanguage(state, lang);
    assert.equal(
      languageFromCookie(state.cookie),
      lang,
      'server sees the selected language immediately',
    );
    assert.equal(
      readLanguage(state, 'de'),
      lang,
      'next page reads the saved language',
    );
    assert.equal(state.read(), lang);
  }
});
void test('legacy local preferences survive migration and invalid preferences cannot set a locale', () => {
  const state = browser('session=abc', 'fa');
  assert.equal(readLanguage(state, 'de'), 'fa');
  persistLanguage(state, readLanguage(state, 'de'));
  assert.equal(languageFromCookie(state.cookie), 'fa');
  assert.equal(
    readLanguage(browser('sushi-lang=invalid', 'invalid'), 'de'),
    'de',
  );
  assert.equal(languageFromCookie('x-sushi-lang=fa'), null);
  persistLanguage(state, 'invalid');
  assert.equal(languageFromCookie(state.cookie), 'fa');
});
void test('blocked local storage still preserves navigation via the cookie', () => {
  const state = browser();
  state.read = () => {
    throw Error('blocked');
  };
  state.write = () => {
    throw Error('blocked');
  };
  persistLanguage(state, 'en');
  assert.equal(readLanguage(state, 'de'), 'en');
});
void test('back navigation and other tabs read the latest saved selection', () => {
  const state = browser('sushi-lang=en', 'en');
  assert.equal(readLanguage(state, 'de'), 'en');
  persistLanguage(state, 'fa');
  assert.equal(readLanguage(state, 'en'), 'fa');
});

void test('the latest valid local selection wins over an older valid cookie', () => {
  assert.equal(readLanguage(browser('sushi-lang=de', 'uk'), 'de'), 'uk');
  assert.equal(readLanguage(browser('sushi-lang=fa', 'invalid'), 'de'), 'fa');
});

void test('an ignored cookie write cannot undo a successful language selection', () => {
  let local = 'de';
  const state = {
    get cookie() {
      return 'sushi-lang=de';
    },
    set cookie(_value) {
      /* Browser silently declines this cookie write. */
    },
    read: () => local,
    write: (value) => {
      local = value;
    },
  };
  persistLanguage(state, 'fa');
  assert.equal(local, 'fa');
  assert.equal(readLanguage(state, 'de'), 'fa');
});

void test('unavailable cookies do not block local preference or the supplied fallback', () => {
  const state = {
    get cookie() {
      throw new Error('Cookies unavailable');
    },
    read: () => 'en',
    write: () => {},
  };
  assert.equal(readLanguage(state, 'de'), 'en');
  state.read = () => {
    throw new Error('Local storage unavailable');
  };
  assert.equal(readLanguage(state, 'uk'), 'uk');
});

function layoutRenderer(mode, cookies) {
  const React = require('react');
  const file = path.resolve(__dirname, '../app/layout.tsx');
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  function localRequire(name) {
    if (name === 'next/headers') return { cookies };
    if (name === '@/lib/language-preference')
      return load('lib/language-preference.ts');
    if (name === '@/lib/language-bootstrap')
      return load('lib/language-bootstrap.ts');
    if (name === '@/components/shop-context')
      return {
        ShopProvider: ({ initialLanguage, children }) =>
          React.createElement(
            'div',
            { 'data-initial-language': initialLanguage },
            children,
          ),
      };
    if (name.endsWith('.css')) return {};
    return require(name);
  }
  vm.runInThisContext(
    '(function(require,module,exports,process){' + code + '\n})',
    { filename: file },
  )(localRequire, mod, mod.exports, { env: { SUSHI_STATIC: mode } });
  return async () =>
    require('react-dom/server').renderToStaticMarkup(
      await mod.exports.default({
        children: React.createElement('main', null, 'Exported content'),
      }),
    );
}

void test('static layout exports real HTML without reading request cookies', async () => {
  const render = layoutRenderer('1', () => {
    throw new Error('A static export cannot read request cookies');
  });
  const html = await render();
  assert.match(html, /<html lang="de" dir="ltr">/);
  assert.match(html, /data-initial-language="de"/);
  assert.match(html, /<main>Exported content<\/main>/);
  const bootstrapPosition = html.indexOf('id="sushi-language-bootstrap"');
  assert.ok(bootstrapPosition >= 0 && bootstrapPosition < html.indexOf('<body>'));
});

void test('dynamic layout keeps the Persian request locale and right-to-left markup', async () => {
  let calls = 0;
  const render = layoutRenderer(undefined, async () => {
    calls++;
    return {
      get: (key) => (key === 'sushi-lang' ? { value: 'fa' } : undefined),
    };
  });
  const html = await render();
  assert.equal(calls, 1);
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /data-initial-language="fa"/);
});

function runLanguageBootstrap({
  saved = null,
  cookie = '',
  language = 'de',
  denyLocal = false,
  denyCookie = false,
} = {}) {
  const root = { lang: language, dir: 'ltr', dataset: {} };
  const document = {
    documentElement: root,
    title: 'German server title',
    get cookie() {
      if (denyCookie) throw new Error('Cookies unavailable');
      return cookie;
    },
  };
  const localStorage = {
    getItem(key) {
      assert.equal(key, 'sushi-lang');
      if (denyLocal) throw new Error('Local storage unavailable');
      return saved;
    },
  };
  const { languageBootstrap } = load('lib/language-bootstrap.ts');
  vm.runInNewContext(languageBootstrap, { document, localStorage });
  return { root, document };
}

void test('prehydration bootstrap selects saved Persian over an old cookie and marks German content pending', () => {
  const { root, document } = runLanguageBootstrap({
    saved: 'fa',
    cookie: 'sushi-lang=de',
  });
  assert.equal(root.lang, 'fa');
  assert.equal(root.dir, 'rtl');
  assert.equal(root.dataset.languagePreference, 'fa');
  assert.equal(root.dataset.languagePending, 'fa');
  assert.equal(document.title, 'Sushi HH');
});

void test('prehydration bootstrap leaves matching German content visible with no pending state', () => {
  for (const saved of [null, 'de', 'invalid']) {
    const { root, document } = runLanguageBootstrap({ saved });
    assert.equal(root.lang, 'de');
    assert.equal(root.dir, 'ltr');
    assert.equal(root.dataset.languagePreference, 'de');
    assert.equal(root.dataset.languagePending, undefined);
    assert.equal(document.title, 'German server title');
  }
});

void test('prehydration bootstrap falls back to an exact language cookie when local preference is absent or denied', () => {
  for (const denyLocal of [false, true]) {
    const { root } = runLanguageBootstrap({
      cookie: 'x-sushi-lang=fa; sushi-lang=uk; other=1',
      denyLocal,
    });
    assert.equal(root.lang, 'uk');
    assert.equal(root.dir, 'ltr');
    assert.equal(root.dataset.languagePending, 'uk');
  }
});

void test('prehydration bootstrap remains safe when both persistence channels are unavailable', () => {
  for (const language of ['de', 'fa']) {
    const { root } = runLanguageBootstrap({
      language,
      denyLocal: true,
      denyCookie: true,
    });
    assert.equal(root.lang, language);
    assert.equal(root.dir, language === 'fa' ? 'rtl' : 'ltr');
    assert.equal(root.dataset.languagePreference, language);
    assert.equal(root.dataset.languagePending, undefined);
  }
});
