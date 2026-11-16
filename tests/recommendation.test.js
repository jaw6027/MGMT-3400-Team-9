import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewEnergy, recommendEnergy } from '../review.js';
import { compareCosts } from '../energy.js';

const steady = () => reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 1000, cost: 200 })));
const peaky = () => reviewEnergy(Array.from({ length: 12 }, (_, i) => ({ kwh: i === 6 ? 1800 : 800, cost: i === 6 ? 340 : 160 })));

test('usage peaks drive a specific opportunity and an efficiency-first package', () => {
  const r = recommendEnergy(peaky());
  assert.equal(r.kind, 'peak');
  assert.equal(r.packageName, 'Smart Efficiency Starter');
  assert.match(r.opportunity, /July/);
  assert.match(r.evidence, /more than 20%/);
  assert.ok(r.services.some(service => /schedule/.test(service)));
});
test('steady monthly usage suggests an everyday-load audit without diagnosing appliances', () => {
  const r = recommendEnergy(steady());
  assert.equal(r.kind, 'steady');
  assert.equal(r.packageName, 'Home Energy Essentials');
  assert.match(r.evidence, /does not prove/);
});
test('solar assessment is suggested only with positive solar-only savings and self-use', () => {
  const review = peaky();
  const c = compareCosts(review);
  assert.equal(c.available, true);
  const r = recommendEnergy(review, c);
  assert.equal(r.packageName, 'Efficiency + Solar Assessment');
  assert.match(r.solarNote, /Installation costs and financing are excluded/);
  assert.match(r.opportunity, /July/);
  const highFees = recommendEnergy(review, compareCosts(review, { monthlyFee: 1000 }));
  assert.equal(highFees.packageName, 'Smart Efficiency Starter');
  const noSelfUse = recommendEnergy(review, compareCosts(review, { selfUse: 0, exportRate: 1 }));
  assert.equal(noSelfUse.packageName, 'Smart Efficiency Starter');
});
test('missing or inconsistent solar assumptions retain a bill-based recommendation', () => {
  const review = steady();
  assert.equal(recommendEnergy(review).packageName, 'Home Energy Essentials');
  const r = recommendEnergy(review, compareCosts(review, { rate: 1 }));
  assert.equal(r.packageName, 'Home Energy Essentials');
});
test('zero consumption prioritizes verification instead of selling upgrades', () => {
  const review = reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 0, cost: 15 })));
  const r = recommendEnergy(review);
  assert.equal(r.kind, 'verify');
  assert.equal(r.packageName, 'Bill & Meter Review');
  assert.match(r.opportunity, /zero electricity/);
});
test('requires a complete review and does not mutate its input', () => {
  assert.throws(() => recommendEnergy(null));
  assert.throws(() => recommendEnergy({ annualKwh: NaN }));
  const review = steady();
  const original = structuredClone(review);
  recommendEnergy(review, compareCosts(review));
  assert.deepEqual(review, original);
});
