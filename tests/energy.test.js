import test from 'node:test';
import assert from 'node:assert/strict';
import { estimate } from '../energy.js';

test('default household has balanced energy and dollar flows', () => {
  const r = estimate({});
  assert.equal(r.annualUsage, 12000);
  assert.equal(r.production, 7884);
  assert.ok(Math.abs(r.annualSavings - 1255.644) < 0.0001);
  assert.ok(Math.abs(r.gridKwh + r.solarUsed - r.reducedUsage) < 0.0001);
  assert.ok(Math.abs(r.solarUsed + r.exports - r.production) < 0.0001);
  assert.ok(Math.abs(r.baseline - r.annualAfter - r.annualSavings) < 0.0001);
});
test('no upgrades, solar or operating fees yields unchanged costs', () => {
  const r = estimate({ efficiency: 0, solarKw: 0, annualCost: 0 });
  assert.equal(r.annualSavings, 0);
  assert.equal(r.gridKwh, r.annualUsage);
  assert.equal(r.payback, null);
});
test('oversized solar exports excess without negative grid consumption', () => {
  const r = estimate({ monthlyKwh: 10, solarKw: 20, selfUse: 100 });
  assert.equal(r.gridKwh, 0);
  assert.equal(r.solarUsed, r.reducedUsage);
  assert.equal(r.exports, r.production - r.reducedUsage);
});
test('incentives cannot make upfront investment negative', () => {
  const r = estimate({ incentive: 999999 });
  assert.equal(r.netCost, 0);
  assert.equal(r.payback, 0);
});
test('fees can eliminate payback and produce negative savings', () => {
  const r = estimate({ monthlyFee: 500 });
  assert.ok(r.annualSavings < 0);
  assert.equal(r.payback, null);
});
test('zero use and zero sunlight produce finite results', () => {
  const r = estimate({ monthlyKwh: 0, sunHours: 0 });
  assert.equal(r.gridReduction, 0);
  assert.equal(r.production, 0);
  assert.equal(r.annualSavings, -180);
});
test('rejects invalid financial and percentage assumptions', () => {
  for (const input of [{ rate: -1 }, { solarKw: NaN }, { selfUse: 101 }, { efficiency: Infinity }]) {
    assert.throws(() => estimate(input));
  }
});
