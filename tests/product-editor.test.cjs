const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { load } = require('./helpers.cjs');
const { emptyProduct } = load('components/admin/admin.shared.tsx');
const { validateProduct } = load('server/validation.ts');
const { productText, productForDisplay, products } = load('lib/catalog.ts');
const { errorText } = load('lib/shop-copy.ts');
const languages = ['de', 'uk', 'en', 'fa'];
function complete(language = 'de') {
  const product = emptyProduct();
  product.name[language] = 'Neue Rolle';
  product.description[language] = 'Lachs, Reis und Gurke.';
  return product;
}
function editor(send) {
  const file = path.resolve(__dirname, '../components/admin/Admin/sections/ProductEditorDialog/ProductEditorDialog.tsx');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  function localRequire(name) {
    if (name === '@/lib/shop-api') return { send };
    if (name === 'next/image') return { __esModule: true, default: 'img' };
    if (name === 'lucide-react') return { ImagePlus: 'span' };
    if (name.endsWith('/product-photo')) return { ProductPhoto: 'figure' };
    if (name.endsWith('/Modal')) return { Modal: 'dialog' };
    if (name.startsWith('@/components/primitives/')) {
      const primitive = name.split('/').pop();
      const tags = { Input: 'input', Textarea: 'textarea', Select: 'select', Label: 'label', Button: 'button', Heading: 'h3', Text: 'p', FieldMessage: 'p' };
      return { [primitive]: tags[primitive] };
    }
    if (name.startsWith('@/')) return name.endsWith('.json') ? require('../' + name.slice(2)) : load(name.slice(2) + '.ts');
    if (name === './ProductEditorDialog.styles') return load(path.resolve(path.dirname(file), name + '.ts'));
    return require(name);
  }
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename: file })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports.ProductEditorDialog;
}
function elements(element) {
  if (!React.isValidElement(element)) return [];
  return [element, ...React.Children.toArray(element.props.children).flatMap(elements)];
}
void test('new products have unique stable saveable identifiers and zero tax without owner ID entry', () => {
  const first = complete();
  const second = emptyProduct();
  assert.match(first.id, /^product-[a-f0-9-]{36}$/);
  assert.notEqual(first.id, second.id);
  assert.equal(first.taxRate, 0);
  assert.equal(validateProduct(first).id, first.id);
  assert.equal(validateProduct(first).taxRate, 0);
  const missingTax = { ...first };
  delete missingTax.taxRate;
  assert.equal(validateProduct(missingTax).taxRate, 0);
});
void test('one complete language saves, preserving blank translations and independently supplied text', () => {
  for (const language of languages) {
    const draft = complete(language);
    const saved = validateProduct(draft);
    assert.deepEqual(saved.name, draft.name);
    assert.deepEqual(saved.description, draft.description);
    const display = productForDisplay(saved);
    for (const target of languages) {
      assert.equal(display.name[target], draft.name[language]);
      assert.equal(display.description[target], draft.description[language]);
    }
    assert.deepEqual(saved.name, draft.name, 'display fallback must not become a stored translation');
  }
  const draft = complete('de');
  draft.name.en = 'Fresh roll';
  draft.description.en = 'Salmon and rice.';
  draft.name.fa = 'رول تازه';
  const display = productForDisplay(validateProduct(draft));
  assert.equal(display.name.en, 'Fresh roll');
  assert.equal(display.description.en, 'Salmon and rice.');
  assert.equal(display.name.fa, 'رول تازه');
  assert.equal(display.description.fa, draft.description.de);
  assert.deepEqual(productText(draft, 'uk'), { name: draft.name.de, description: draft.description.de });
  assert.equal(draft.description.fa, '');
});
void test('empty, split-language and malformed product text is rejected with specific guidance', () => {
  for (const draft of [emptyProduct(), { ...emptyProduct(), name: { de: 'Only name' }, description: { en: 'Only description' } }])
    assert.throws(() => validateProduct(draft), { code: 'PRODUCT_TEXT_REQUIRED' });
  for (const field of ['name', 'description']) {
    const draft = complete();
    draft[field].fa = field === 'name' ? 'x'.repeat(161) : 'x'.repeat(2001);
    assert.throws(() => validateProduct(draft), { code: 'INVALID_PRODUCT_TEXT' });
  }
  assert.throws(() => validateProduct({ ...complete(), name: { de: 7 } }), { code: 'INVALID_PRODUCT_TEXT' });
  for (const language of languages) assert.notEqual(errorText(language, 'PRODUCT_TEXT_REQUIRED'), errorText(language, 'SERVER_ERROR'));
});
void test('optional translations do not weaken price, tax, photo, identifier or weight validation', () => {
  const base = complete();
  for (const rate of [0, 700, 1900]) assert.equal(validateProduct({ ...base, taxRate: rate }).taxRate, rate);
  for (const change of [{ taxRate: 500 }, { price: 0 }, { price: 900.5 }, { price: 100001 }, { weight: 0 }, { id: '../bad' }, { image: 'https://other.example/photo.jpg' }])
    assert.throws(() => validateProduct({ ...base, ...change }));
  assert.equal(validateProduct({ ...base, image: '/api/media/00000000-0000-4000-8000-000000000000.jpg' }).images.length, 1);
  assert.deepEqual(productForDisplay(products[0]), products[0], 'complete existing translations stay unchanged');
});
void test('filled product saves from an empty language tab without hidden required fields or a manual ID', async () => {
  const draft = complete('en');
  let submitted;
  let pending = Promise.resolve();
  let closed = false;
  const ProductEditorDialog = editor(async (route, data) => {
    assert.equal(route, '/admin/products');
    submitted = validateProduct(data);
  });
  const props = {
    lang: 'en', products: [], error: '', busy: false, editingProduct: draft,
    setEditingProduct: (value) => { closed = value === null; },
    productLang: 'fa', setProductLang() {}, uploadReady: true,
    action: (action) => { pending = action(); return pending; },
  };
  const tree = ProductEditorDialog(props);
  assert.equal(tree.props.title, 'Add product');
  const fields = elements(tree).filter((element) => ['input', 'textarea'].includes(element.type));
  assert.equal(fields.filter((element) => element.props.required).length, 1, 'only price remains required once a language pair is complete');
  assert.ok(fields.every((element) => element.props.value !== draft.id), 'owner never needs to enter an identifier');
  const tax = elements(tree).find((element) => element.type === 'select' && element.props.value === 0);
  assert.ok(tax);
  assert.ok(elements(tax).some((element) => element.type === 'option' && element.props.value === 0));
  const form = elements(tree).find((element) => element.type === 'form');
  form.props.onSubmit({ preventDefault() {} });
  await pending;
  assert.equal(submitted.id, draft.id);
  assert.equal(submitted.taxRate, 0);
  assert.equal(submitted.name.fa, '');
  assert.equal(closed, true);
  const emptyFields = elements(ProductEditorDialog({ ...props, editingProduct: emptyProduct(), productLang: 'de' }));
  assert.equal(emptyFields.filter((element) => element.props.required).length, 3, 'new empty draft requires visible name, description and price');
  assert.equal(ProductEditorDialog({ ...props, products: [draft] }).props.title, 'Edit');
});
