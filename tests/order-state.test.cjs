const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  vm = require('node:vm'),
  ts = require('typescript');
const file = require('node:path').join(__dirname, '../lib/order-state.ts');
const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleCopy = { exports: {} };
vm.runInThisContext('(function(exports){' + code + '\n})')(moduleCopy.exports);
const { mergeOrderVersions } = moduleCopy.exports;
void test('a delayed live response cannot undo a saved status or payment', () => {
  const saved = {
    id: 'one',
    version: 3,
    status: 'delivered',
    paid: true,
    createdAt: 1,
  };
  const stale = { ...saved, version: 2, status: 'preparing', paid: false };
  assert.deepEqual(mergeOrderVersions([saved], [stale]), [saved]);
  const newer = { ...saved, version: 4 };
  assert.deepEqual(mergeOrderVersions([saved], [newer]), [newer]);
});
void test('a save merges with other incoming orders without dropping a new order', () => {
  const first = { id: 'one', version: 1, createdAt: 1 },
    second = { id: 'two', version: 1, createdAt: 2 };
  const updated = { ...first, version: 2 };
  assert.deepEqual(mergeOrderVersions([first, second], [updated]), [
    second,
    updated,
  ]);
  assert.deepEqual(mergeOrderVersions([second], [first]), [second, first]);
});
