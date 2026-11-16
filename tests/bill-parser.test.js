import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBillText } from '../bill-parser.js';

test('extracts only month, usage and cost from labeled bill data', () => {
  const result = parseBillText('Name: SYNTHETIC RESIDENT\nAccount: TEST-1234\nAddress: 123 Sample St\nBilling month: November 2026\nTotal usage: 1,234.50 kWh\nTotal amount due: $253.46');
  assert.deepEqual(Object.keys(result), ['month', 'kwh', 'cost']);
  assert.equal(result.month.value, 10);
  assert.equal(result.kwh.value, 1234.5);
  assert.equal(result.cost.value, 253.46);
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC|TEST-1234|Sample St/);
});
test('ambiguity, missing labels and poor confidence are not silently guessed', () => {
  const ambiguous = parseBillText('Billing month: June\nBill date: July 12, 2026\nUsage: 800 kWh\nUsage: 900 kWh\nAmount due: $100\nTotal due: $110');
  for (const field of Object.values(ambiguous)) {
    assert.equal(field.value, null);
    assert.match(field.status, /Multiple/);
  }
  const low = parseBillText('Billing month: May\nUsage: 900 kWh\nTotal due: $100', 20);
  for (const field of Object.values(low)) { assert.equal(field.value, null); assert.match(field.status, /confidence/); }
  const blank = parseBillText('Account: 111\nMeter reading: 99999\nDue date: December 1, 2026');
  for (const field of Object.values(blank)) assert.equal(field.value, null);
});
test('ignores prior readings, generation and per-kWh rates', () => {
  const r = parseBillText('Previous bill date: October 5, 2026\nBill date: November 16, 2026\nPrevious usage: 800 kWh\nSolar generation: 400 kWh\nRate: $0.18/kWh\nTotal usage: 1,000 kWh\nPrevious amount due: $40\nAmount due: $200');
  assert.equal(r.month.value, 10);
  assert.equal(r.kwh.value, 1000);
  assert.equal(r.cost.value, 200);
});
test('handles ISO and unambiguous dates but does not infer a month from a date range', () => {
  assert.equal(parseBillText('Bill date: 2026-03-04').month.value, 2);
  assert.equal(parseBillText('Statement date: 11/16/2026').month.value, 10);
  assert.equal(parseBillText('Billing month: 05/2026').month.value, 4);
  assert.equal(parseBillText('Bill date: 03/04/2026').month.value, null);
  assert.equal(parseBillText('Billing period: October 15 – November 14').month.value, null);
});
test('preserves zero and rejects negative, malformed and excessive amounts', () => {
  const zero = parseBillText('Total usage: 0 kWh\nTotal due: $0.00');
  assert.equal(zero.kwh.value, 0);
  assert.equal(zero.cost.value, 0);
  assert.equal(parseBillText('Total due: -$12.34').cost.value, null);
  assert.equal(parseBillText('Total due: $12,34').cost.value, null);
  assert.equal(parseBillText('Usage: 100001 kWh').kwh.value, null);
});
