const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const { arrivalInput, parseArrival } = load(
  'components/order-messages/OrderEta.utils.ts',
);

void test('Hamburg ETA entry uses Berlin time independently of the device timezone', () => {
  assert.equal(parseArrival('2026-11-01T12:30'), Date.UTC(2026, 10, 1, 11, 30));
  assert.equal(parseArrival('2026-07-01T12:30'), Date.UTC(2026, 6, 1, 10, 30));
  assert.equal(arrivalInput(Date.UTC(2026, 10, 1, 11, 30)), '2026-11-01T12:30');
  assert.equal(arrivalInput(null), '');
});

void test('Hamburg ETA rejects impossible dates and the DST spring gap, but round-trips repeated autumn times', () => {
  for (const value of ['', 'tomorrow', '2026-02-30T12:00', '2026-03-29T02:30'])
    assert.equal(parseArrival(value), null, value);
  assert.equal(parseArrival('2026-03-29T01:30'), Date.UTC(2026, 2, 29, 0, 30));
  assert.equal(parseArrival('2026-03-29T03:30'), Date.UTC(2026, 2, 29, 1, 30));
  const repeated = parseArrival('2026-10-25T02:30');
  assert.ok(
    [Date.UTC(2026, 9, 25, 0, 30), Date.UTC(2026, 9, 25, 1, 30)].includes(
      repeated,
    ),
  );
  assert.equal(arrivalInput(repeated), '2026-10-25T02:30');
});
