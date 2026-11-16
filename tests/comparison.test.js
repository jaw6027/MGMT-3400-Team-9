import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCosts } from '../energy.js';

const bills = { annualKwh: 12000, annualCost: 2400 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('comparison retains bill charges and reconciles both solar options', () => {
  const c = compareCosts(bills);
  assert.equal(c.available, true);
  close(c.retainedCharges, 240);
  close(c.solar.projectedAnnualCost, 1468.356);
  close(c.combined.projectedAnnualCost, 1144.356);
  for (const scenario of [c.solar, c.combined]) {
    close(scenario.importCost + c.retainedCharges - scenario.exportCredit + scenario.operatingCost, scenario.projectedAnnualCost);
    close(scenario.projectedAnnualCost + scenario.annualSavings, bills.annualCost);
    close(scenario.projectedMonthlyCost * 12, scenario.projectedAnnualCost);
  }
  assert.equal(c.solar.reducedUsage, 12000);
  assert.equal(c.combined.reducedUsage, 10200);
});
test('uses homeowner usage independently of the sample solar-plan usage', () => {
  const a = compareCosts(bills, { monthlyKwh: 50 });
  const b = compareCosts(bills, { monthlyKwh: 100000 });
  assert.deepEqual(a, b);
});
test('zero solar, efficiency and ongoing costs reproduce entered bills exactly', () => {
  const c = compareCosts(bills, { solarKw: 0, efficiency: 0, annualCost: 0, monthlyFee: 0 });
  assert.equal(c.solar.projectedAnnualCost, 2400);
  assert.equal(c.combined.projectedAnnualCost, 2400);
  assert.equal(c.solar.annualSavings, 0);
});
test('ongoing fees can increase costs; upfront costs do not become recurring savings', () => {
  const c = compareCosts(bills, { monthlyFee: 500 });
  assert.ok(c.solar.projectedAnnualCost > bills.annualCost);
  assert.ok(c.solar.savingsPercent < 0);
  const a = compareCosts(bills);
  const b = compareCosts(bills, { solarCost: 100000, upgradeCost: 10000, incentive: 50000 });
  assert.equal(a.solar.projectedAnnualCost, b.solar.projectedAnnualCost);
  assert.equal(a.combined.projectedAnnualCost, b.combined.projectedAnnualCost);
});
test('inconsistent rates and zero usage do not produce misleading comparisons', () => {
  assert.deepEqual(compareCosts(bills, { rate: 0.30 }), { available: false, reason: 'rate-exceeds-bills' });
  assert.deepEqual(compareCosts({ annualKwh: 0, annualCost: 180 }), { available: false, reason: 'zero-usage' });
});
test('no billed cost has no percent saving and oversized exports may produce net credits', () => {
  const c = compareCosts({ annualKwh: 100, annualCost: 0 }, { rate: 0 });
  assert.equal(c.available, true);
  assert.equal(c.solar.savingsPercent, null);
  assert.ok(c.solar.projectedAnnualCost < 0);
  assert.equal(c.solar.gridKwh, 0);
});
test('rejects invalid bill summaries and assumptions', () => {
  for (const review of [null, {}, { annualKwh: -1, annualCost: 100 }, { annualKwh: 10, annualCost: NaN }]) {
    assert.throws(() => compareCosts(review));
  }
  assert.throws(() => compareCosts(bills, { selfUse: 101 }));
});
