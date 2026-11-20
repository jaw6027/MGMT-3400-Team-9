import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeHomeProfile, homeProfileRows, homeSolarCaution, tailorHomeRecommendation } from '../questionnaire.js';
import { reviewEnergy, recommendEnergy } from '../review.js';
import { compareCosts, defaults } from '../energy.js';
import { encodeProgress, decodeProgress } from '../progress.js';

const review = () => reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 1000, cost: 200 })));
const baseRecommendation = () => { const r = review(); return recommendEnergy(r, compareCosts(r)); };
const saved = () => ({ version: 1, bills: Array.from({ length: 12 }, () => ({ kwh: null, cost: null })), plan: { ...defaults }, exampleFields: [] });

test('optional unknowns stay unknown, zero ages stay zero, extra personal data is excluded', () => {
  const p = normalizeHomeProfile({ area: 1600, roofAge: 0, insulation: 'unknown', ownerName: 'PRIVATE NAME', address: 'PRIVATE ADDRESS' });
  assert.equal(p.roofAge, 0);
  assert.equal(p.insulation, 'unknown');
  assert.equal(p.heating, '');
  assert.equal(p.residents, null);
  assert.doesNotMatch(JSON.stringify(p), /PRIVATE|ownerName|address/);
  const rows = homeProfileRows(p);
  assert.ok(rows.some(([, value]) => value === 'Not sure'));
  assert.equal(rows.length, 3);
});
test('invalid choices, fractional residents and unsafe numeric values are rejected', () => {
  for (const p of [{ residents: 1.5 }, { area: 0 }, { homeAge: -1 }, { roofAge: Infinity }, { heating: '<script>' }, { roofCondition: 'definitely safe' }]) {
    assert.throws(() => normalizeHomeProfile(p));
  }
});
test('reported drafts change the opportunity without mutating the bill-based recommendation', () => {
  const base = baseRecommendation();
  const copy = structuredClone(base);
  const result = tailorHomeRecommendation(base, { drafts: 'yes' });
  assert.match(result.title, /drafts and insulation/);
  assert.match(result.opportunity, /inspection must confirm/);
  assert.deepEqual(base, copy);
});
test('roof and permission concerns take priority over an optimistic solar cost model', () => {
  const result = tailorHomeRecommendation(baseRecommendation(), { roofCondition: 'repair', shade: 'heavy', solarPermission: 'no' });
  assert.equal(result.packageName, 'Efficiency First + Solar Feasibility Review');
  assert.match(homeSolarCaution({ shade: 'heavy' }), /does not account/);
  assert.match(result.solarNote, /permission/);
});
test('existing solar gets an appropriate review and zero consumption still prioritizes data verification', () => {
  assert.equal(tailorHomeRecommendation(baseRecommendation(), { existingSolar: 'yes' }).packageName, 'Existing Solar & Efficiency Review');
  const zero = reviewEnergy(Array.from({ length: 12 }, () => ({ kwh: 0, cost: 15 })));
  const result = tailorHomeRecommendation(recommendEnergy(zero), { drafts: 'yes', roofCondition: 'repair' });
  assert.equal(result.packageName, 'Bill & Meter Review');
});
test('EV, variable prices and backup preferences produce context without invented savings', () => {
  const result = tailorHomeRecommendation(baseRecommendation(), { ev: 'one', evCharging: 'night', utilityPlan: 'time-of-use', goal: 'backup' });
  assert.ok(result.homeInsights.some(text => /overnight/.test(text)));
  assert.ok(result.homeInsights.some(text => /cannot model that tariff/.test(text)));
  assert.ok(result.homeInsights.some(text => /may shut down during outages/.test(text)));
  assert.ok(result.homeFollowups.some(text => /roof/.test(text)));
});
test('old snapshots remain compatible; optional home snapshots are strictly whitelisted', () => {
  assert.deepEqual(decodeProgress(encodeProgress(saved())), saved());
  const state = saved();
  state.homeProfile = { residents: 3, roofCondition: 'unknown', name: 'PRIVATE NAME', notes: 'PRIVATE NOTES' };
  const encoded = encodeProgress(state);
  assert.doesNotMatch(encoded, /PRIVATE|notes|name/);
  assert.equal(decodeProgress(encoded).homeProfile.residents, 3);
  assert.equal(decodeProgress(encoded).homeProfile.roofCondition, 'unknown');
  assert.throws(() => encodeProgress({ ...saved(), homeProfile: { residents: -1 } }));
});
