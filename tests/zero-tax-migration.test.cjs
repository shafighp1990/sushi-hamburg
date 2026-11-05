const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

void test('zero-tax migration preserves catalogue details, shop settings and historical orders', () => {
  const db = new DatabaseSync(':memory:');
  const directory = path.resolve(__dirname, '../drizzle');
  for (const file of fs.readdirSync(directory).filter(name => name.endsWith('.sql') && name < '0006').sort()) {
    db.exec(fs.readFileSync(path.join(directory, file), 'utf8'));
  }
  const product = { id: 'owner-special', price: 1590, name: { de: 'Spezial' }, images: ['/photos/owner.jpg'], taxRate: 700 };
  const alreadyZero = { id: 'zero-special', price: 1900, taxRate: 0 };
  const shop = { taxMode: 'regular', shopOpen: false, offer: { active: true, title: { de: 'Aktion' } }, schedule: { preserved: true } };
  db.prepare('INSERT INTO catalog VALUES(?,?,1,7,1)').run(product.id, JSON.stringify(product));
  db.prepare('INSERT INTO catalog VALUES(?,?,0,3,1)').run(alreadyZero.id, JSON.stringify(alreadyZero));
  db.prepare("INSERT INTO settings VALUES('shop',?,1)").run(JSON.stringify(shop));
  const historicalTax = JSON.stringify({ mode: 'regular', vat: 70, net: 1000 });
  db.prepare("INSERT INTO orders(id,client_key,request_hash,customer,items,subtotal,payment,date,time,zone,created_at,updated_at,tax) VALUES('old','old','old','{}','[]',1070,'cash_on_delivery','2026-10-09','18:00','unknown',1,1,?)").run(historicalTax);
  const migration = fs.readFileSync(path.join(directory, '0006_zero_product_tax.sql'), 'utf8');
  db.exec(migration);
  const current = db.prepare('SELECT * FROM catalog WHERE id=?').get(product.id);
  assert.deepEqual(JSON.parse(current.data), { ...product, taxRate: 0 });
  assert.equal(current.version, 8);
  assert.equal(current.active, 1);
  assert.deepEqual(JSON.parse(db.prepare("SELECT value FROM settings WHERE key='shop'").get().value), shop);
  assert.equal(db.prepare("SELECT tax FROM orders WHERE id='old'").get().tax, historicalTax);
  assert.equal(db.prepare('SELECT version FROM catalog WHERE id=?').get(alreadyZero.id).version, 3);
  db.exec(migration);
  assert.equal(db.prepare('SELECT version FROM catalog WHERE id=?').get(product.id).version, 8);
  db.close();
});
