import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewEnergy } from '../review.js';

test('annual totals, monthly averages and billed rate use all 12 bills', () => {
  const bills = Array.from({ length: 12 }, (_, i) => ({ kwh: (i + 1) * 100, cost: (i + 1) * 20 + 10 }));
  const r = reviewEnergy(bills);
  assert.equal(r.annualKwh, 7800);
  assert.equal(r.annualCost, 1680);
  assert.equal(r.averageKwh, 650);
  assert.equal(r.averageCost, 140);
  assert.equal(r.billedRate, 1680 / 7800);
  assert.deepEqual(r.peakMonths, ['December']);
  assert.deepEqual(r.costliestMonths, ['December']);
  assert.deepEqual(r.highUsageMonths, ['August', 'September', 'October', 'November', 'December']);
});
test('ties retain all peak months and usage peaks can differ from bill peaks', () => {
  const bills = Array.from({ length: 12 }, () => ({ kwh: 100, cost: 30 }));
  bills[0] = { kwh: 200, cost: 30 };
  bills[1] = { kwh: 200, cost: 30 };
  bills[2] = { kwh: 100, cost: 70 };
  const r = reviewEnergy(bills);
  assert.deepEqual(r.peakMonths, ['January', 'February']);
  assert.deepEqual(r.costliestMonths, ['March']);
});
test('zero usage remains valid without dividing by zero or inventing peaks', () => {
  const r = reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 0, cost: 15 })));
  assert.equal(r.annualKwh, 0);
  assert.equal(r.annualCost, 180);
  assert.equal(r.billedRate, null);
  assert.deepEqual(r.peakMonths, []);
  assert.deepEqual(r.highUsageMonths, []);
  assert.equal(r.costliestMonths.length, 12);
});
test('missing months, blank strings, negative and nonfinite values cannot become a review', () => {
  const valid = Array.from({ length: 12 }, () => ({ kwh: 100, cost: 20 }));
  assert.throws(() => reviewEnergy(valid.slice(0, 11)));
  assert.throws(() => reviewEnergy([...valid, valid[0]]));
  for (const entry of [null, {}, { kwh: '', cost: 20 }, { kwh: 100, cost: -1 }, { kwh: -1, cost: 10 }, { kwh: NaN, cost: 20 }, { kwh: 1, cost: Infinity }]) {
    assert.throws(() => reviewEnergy([entry, ...valid.slice(1)]));
  }
});
test('decimal bill amounts are preserved rather than rounded month by month', () => {
  const r = reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 123.45, cost: 32.17 })));
  assert.ok(Math.abs(r.annualKwh - 1481.4) < 1e-8);
  assert.ok(Math.abs(r.annualCost - 386.04) < 1e-8);
});
