import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../energy.js';
import { encodeProgress, decodeProgress, normalizeProgress } from '../progress.js';

const sample = () => ({
  version: 1,
  bills: Array.from({ length: 12 }, () => ({ kwh: null, cost: null })),
  plan: { ...defaults },
  exampleFields: [],
});

test('partial progress preserves blanks, zero and decimal values across serialization', () => {
  const state = sample();
  state.bills[0] = { kwh: 0, cost: 15.47 };
  state.bills[1] = { kwh: 123.45, cost: null };
  state.plan.rate = null;
  assert.deepEqual(decodeProgress(encodeProgress(state)), state);
});
test('only numeric progress and valid sample labels are serialized, never extra personal fields', () => {
  const state = sample();
  state.customer = 'PRIVATE NAME';
  state.email = 'private@example.com';
  state.ocrText = 'RAW BILL WITH ACCOUNT DETAILS';
  state.plan.notes = 'PRIVATE NOTES';
  state.bills[0] = { kwh: 100, cost: 20, address: 'PRIVATE ADDRESS' };
  state.exampleFields = ['bill-kwh-0', 'bill-kwh-0', 'bill-cost-0', 'PRIVATE NAME', 'bill-kwh-20', 'bill-kwh-1'];
  const text = encodeProgress(state);
  assert.doesNotMatch(text, /PRIVATE|private@|RAW BILL|address|email|ocrText|notes|customer/);
  assert.deepEqual(decodeProgress(text).exampleFields, ['bill-cost-0', 'bill-kwh-0']);
});
test('rejects corrupt, unsupported and oversized records instead of restoring guesses', () => {
  for (const text of ['not JSON', 'null', '{}', JSON.stringify({ ...sample(), version: 2 }), ' '.repeat(8193)]) {
    assert.throws(() => decodeProgress(text));
  }
  assert.throws(() => normalizeProgress({ ...sample(), bills: [] }));
});
test('rejects invalid numeric types and values outside the UI ranges', () => {
  for (const value of ['100', -1, NaN, Infinity, true, 100001]) {
    const state = sample();
    state.bills[0].kwh = value;
    assert.throws(() => encodeProgress(state));
  }
  for (const [key, value] of [['selfUse', 101], ['efficiency', null], ['rate', -1], ['sunHours', 25]]) {
    const state = sample();
    state.plan[key] = value;
    assert.throws(() => encodeProgress(state));
  }
});
