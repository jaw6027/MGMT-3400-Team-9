import test from 'node:test';
import assert from 'node:assert/strict';
import { solarExampleHomes, defaults } from '../energy.js';

test('published example amounts reflect the stated electricity-only assumptions', () => {
  const original = { ...defaults };
  const { assumptions, homes } = solarExampleHomes();
  assert.equal(assumptions.selfUse, 100);
  assert.equal(assumptions.efficiency, 0);
  assert.equal(assumptions.annualCost, 0);
  assert.equal(assumptions.monthlyFee, 0);
  const expected = [[72, 32.58, 219], [162, 63.45, 547.5], [288, 130.32, 876]];
  homes.forEach((home, index) => {
    const [before, after, generation] = expected[index];
    assert.ok(Math.abs(home.before - before) < 1e-8);
    assert.ok(Math.abs(home.after - after) < 1e-8);
    assert.ok(Math.abs(home.monthlyGeneration - generation) < 1e-8);
    assert.ok(Math.abs(home.difference - (before - after)) < 1e-8);
  });
  assert.deepEqual(defaults, original);
});
