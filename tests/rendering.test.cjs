const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const test = require('node:test'),
  assert = require('node:assert/strict');
function run(project) {
  const original = root;
  const req = createRequire(path.join(original, 'package.json'));
  const ts = req('typescript'),
    React = req('react'),
    { renderToStaticMarkup } = req('react-dom/server');
  const profile = {
    id: 'demo',
    username: 'demo',
    name: 'Demo',
    bio: 'Sample',
    location: 'Hamburg',
    website: '',
    avatar_url: null,
    banner_url: null,
    verified: true,
    created_at: '2026-10-01',
    updated_at: '2026-10-01',
    followerCount: 2,
    followingCount: 1,
    followedByViewer: false,
  };
  const post = {
    id: 'demo-post',
    content: 'Sample <safe>',
    imageUrl: null,
    externalPlatform: null,
    externalUrl: null,
    replyToId: null,
    createdAt: '2026-10-01',
    author: profile,
    likeCount: 1,
    replyCount: 0,
    repostCount: 0,
    likedByViewer: false,
    repostedByViewer: false,
    bookmarkedByViewer: false,
  };
  let shop;
  const noop = () => {};
  function loader(base) {
    const cache = new Map();
    function load(p) {
      if (cache.has(p)) return cache.get(p).exports;
      if (p.endsWith('.json')) return JSON.parse(fs.readFileSync(p));
      const m = { exports: {} };
      cache.set(p, m);
      const code = ts.transpileModule(fs.readFileSync(p, 'utf8'), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }).outputText;
      function local(n) {
        if (n === 'next/link')
          return {
            __esModule: true,
            default: ({ href, ...props }) =>
              React.createElement('a', { ...props, href }),
          };
        if (n === 'next/image')
          return {
            __esModule: true,
            default: function StaticImage({
              src,
              unoptimized: _unoptimized,
              priority: _priority,
              quality: _quality,
              fill: _fill,
              placeholder: _placeholder,
              blurDataURL: _blurDataURL,
              ...props
            }) {
              return React.createElement('img', {
                ...props,
                src: typeof src === 'string' ? src : src.src,
              });
            },
          };
        if (n === 'next/navigation')
          return {
            usePathname: () => '/menu',
            useRouter: () => ({ push: noop, replace: noop, refresh: noop }),
            useSearchParams: () => new URLSearchParams(),
          };
        const candidate = n.startsWith('@/')
          ? path.join(base, n.slice(2))
          : n.startsWith('.')
            ? path.resolve(path.dirname(p), n)
            : null;
        if (candidate) {
          if (/components\/I18nProvider(?:\/I18nProvider)?$/.test(candidate))
            return {
              __esModule: true,
              default: ({ children }) => children,
              useI18n: () => ({
                locale: 'de',
                intlLocale: 'de-DE',
                direction: 'ltr',
                t: (key) =>
                  load(path.join(base, 'lib/i18n.ts')).translate('de', key),
              }),
            };
          if (/components\/shop-context(?:\/shop-context)?$/.test(candidate))
            return {
              useShop: () => shop,
              ShopProvider: ({ children }) => children,
            };
          const f = [
            candidate,
            candidate + '.tsx',
            candidate + '.ts',
            candidate + '.json',
            path.join(candidate, 'index.ts'),
          ].find((x) => fs.existsSync(x) && fs.statSync(x).isFile());
          if (!f) throw Error('Cannot resolve ' + n + ' in ' + p);
          return load(f);
        }
        return req(n);
      }
      vm.runInThisContext(
        '(function(require,module,exports){' + code + '\n})',
        { filename: p },
      )(local, m, m.exports);
      return m.exports;
    }
    return load;
  }
  const before = loader(original),
    after = loader(root);
  /** @type {Array<[string, string, Record<string, unknown>]>} */
  let cases = [];
  if (project === 'communication')
    cases = [
      ['AuthForm', { mode: 'login' }],
      ['AuthForm', { mode: 'register' }],
      ['AuthScreen', { mode: 'login' }],
      ['Avatar', { profile }],
      ['ChangePasswordForm', { required: false }],
      ['EditProfileButton', { profile }],
      ['ExternalPostCard', { url: 'https://example.com' }],
      [
        'FollowButton',
        { viewerId: 'viewer', profileId: 'other', initiallyFollowing: false },
      ],
      [
        'FollowList',
        { profiles: [profile], viewer: profile, kind: 'followers' },
      ],
      ['LanguageSwitcher', {}],
      [
        'MeetingRoom',
        {
          room: { id: 'demo-room', title: 'Demo', ended: false },
          host: false,
          initialName: 'Guest',
        },
      ],
      ['MeetingsDashboard', { initialRooms: [] }],
      ['MfaChallengeForm', {}],
      ['MfaSettings', {}],
      ['Navigation', { viewer: profile }],
      ['NotificationsList', { items: [], viewerId: profile.id }],
      ['PageHeader', { title: 'Title', subtitle: 'Subtitle' }],
      ['PostCard', { post, viewer: profile }],
      ['PostComposer', { viewer: profile }],
      ['ProfileHeader', { profile, viewer: profile }],
      ['ProfileResult', { profile, viewer: profile }],
      ['RightRail', { viewer: profile, suggestions: [profile] }],
      ['ShareMenu', { post }],
      ['Timeline', { posts: [post], viewer: profile }],
      ['Timeline', { posts: [], viewer: profile }],
      ['VerifiedBadge', {}],
      ['AdminDashboard', { admin: profile }],
    ].map(([n, p]) => [n, n, p]);
  else {
    const { products } = before(path.join(original, 'lib/catalog.ts'));
    const { defaultSettings } = before(path.join(original, 'lib/commerce.ts'));
    shop = {
      products,
      settings: defaultSettings,
      lang: 'de',
      setLang: noop,
      cart: {},
      change: noop,
      clear: noop,
      count: 0,
      subtotal: 0,
      user: {
        id: 'demo',
        name: 'Demo',
        email: 'demo@example.invalid',
        phone: '',
        address: '',
        postcode: '20095',
        city: 'Hamburg',
        language: 'de',
        admin: true,
      },
      loading: false,
      ready: true,
      reload: async () => {},
      refreshUser: async () => {},
    };
    cases = [
      ['account', 'Account', {}],
      ['admin', 'Admin', {}],
      ['admin-login', 'AdminLogin', {}],
      ['checkout', 'Checkout', {}],
      ['commerce-admin', 'CommerceAdmin', { customers: [] }],
      ['delivery-notice', 'DeliveryNotice', {}],
      ['info-pages', 'InfoPage', { kind: 'privacy' }],
      ['knowledge', 'KnowledgeIndex', {}],
      ['newsletter', 'NewsletterPreference', {}],
      ['newsletter', 'NewsletterLink', {}],
      ['offer-section', 'OfferSection', {}],
      ['operations-admin', 'OperationsAdmin', {}],
      ['order-tracking', 'OrderTracking', {}],
      ['product-detail', 'LiveProductDetail', { id: products[0].id }],
      ['product-gallery', 'ProductGallery', { product: products[0] }],
      ['product-photo', 'ProductPhoto', { product: products[0] }],
      ['restaurant-home', 'RestaurantHome', {}],
      ['shop-shell', 'ShopHeader', {}],
      ['shop-shell', 'ShopFooter', {}],
      ['shop-shell', 'Basket', {}],
      ['shop-shell', 'Quantity', { p: products[0] }],
      ['storefront', 'Storefront', {}],
      ['tax-breakdown', 'TaxBreakdown', { tax: null }],
    ];
  }
  const normalize = (s) =>
    s.replace(/ aria-atomic="true"/g, '').replace(
      /<([a-z][a-z0-9-]*)([^<>]*?)(\/?)>/g,
      (_, tag, attrs, slash) =>
        '<' +
        tag +
        (attrs.match(/[\w:-]+="[^"]*"/g) || [])
          .sort()
          .map((a) => ' ' + a)
          .join('') +
        slash +
        '>',
    );
  const expected = JSON.parse(
    fs.readFileSync(path.join(root, 'tests/rendering.snapshots.json'), 'utf8'),
  );
  const captured = {};
  for (const [index, [file, name, props]] of cases.entries()) {
    void test(name + ' render contract ' + index, () => {
      const current = after(path.join(root, 'components', file + '.tsx'));
      const actual = normalize(
        renderToStaticMarkup(
          React.createElement(current.default || current[name], props),
        ),
      );
      // Optional review artifact; capture never bypasses the assertions below.
      if (process.env.SUSHI_RENDER_CAPTURE_PATH) {
        captured[file + '-' + name + '-' + index] = actual;
        fs.writeFileSync(process.env.SUSHI_RENDER_CAPTURE_PATH, JSON.stringify(captured, null, 2) + '\n');
      }
      assert.equal(actual, expected[file + '-' + name + '-' + index]);
    });
  }
}
run('sushi');
