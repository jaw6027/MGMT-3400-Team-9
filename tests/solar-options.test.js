import test from 'node:test';
import assert from 'node:assert/strict';
import { solarOptionsForUsage } from '../questionnaire.js';
import { reviewEnergy } from '../review.js';

const bills = (peak = false, kwh = 600) => reviewEnergy(Array.from({ length: 12 }, (_, i) => ({ kwh: peak && i === 6 ? kwh * 3 : kwh, cost: 120 })));
const text = options => JSON.stringify(options);

test('steady and peaky bills connect to different solar planning steps without inferring hourly use', () => {
  assert.match(text(solarOptionsForUsage(bills())), /relatively steady/);
  const peaks = text(solarOptionsForUsage(bills(true)));
  assert.match(peaks, /July/);
  assert.match(peaks, /remaining demand/);
  assert.match(peaks, /monthly solar production/);
  assert.match(text(solarOptionsForUsage(bills())), /daytime demand has not been established/);
});

test('daytime and overnight use connect to direct solar use and scheduling or storage respectively', () => {
  const day = text(solarOptionsForUsage(bills(), { daytime: 'usually' }));
  assert.match(day, /direct use of rooftop solar/);
  assert.match(day, /Being home does not establish/);
  const night = text(solarOptionsForUsage(bills(), { ev: 'one', evCharging: 'night' }));
  assert.match(night, /will not directly supply overnight/);
  assert.match(night, /counted twice/);
  assert.doesNotMatch(text(solarOptionsForUsage(bills(), { ev: 'none', evCharging: 'night' })), /overnight EV/);
});

test('time-of-use and backup needs require specific analysis and compatible equipment', () => {
  const options = text(solarOptionsForUsage(bills(), { utilityPlan: 'time-of-use', goal: 'backup' }));
  assert.match(options, /interval-based tariff analysis/);
  assert.match(options, /may shut down during outages/);
  assert.match(options, /essential circuits/);
  assert.match(options, /Batteries and backup costs are excluded/);
});

test('roof barriers and renting prioritize feasibility or community solar over rooftop equipment', () => {
  for (const profile of [{ shade: 'heavy' }, { roofCondition: 'replace' }, { solarPermission: 'no' }, { electricalPanel: 'upgrade' }, { ownership: 'renter' }]) {
    const options = text(solarOptionsForUsage(bills(), { ...profile, daytime: 'usually', goal: 'backup' }));
    assert.match(options, /community solar where available/);
    assert.match(options, /subscription charges/);
    assert.doesNotMatch(options, /direct use of rooftop solar|compatible battery and backup controls/);
  }
});

test('existing systems and zero use do not trigger new-system suggestions', () => {
  const existing = solarOptionsForUsage(bills(), { existingSolar: 'yes', goal: 'backup' });
  assert.equal(existing.length, 1);
  assert.match(text(existing), /generation and grid import\/export records/);
  const zero = solarOptionsForUsage(bills(false, 0), { daytime: 'usually', ev: 'one', goal: 'backup' });
  assert.equal(zero.length, 1);
  assert.match(text(zero), /Verify usage/);
});

test('unrepresentative bills are flagged and input data remains unchanged', () => {
  const review = bills();
  const profile = { estimatedBills: 'yes', householdChanges: 'yes', daytime: 'unknown' };
  const original = structuredClone({ review, profile });
  assert.match(text(solarOptionsForUsage(review, profile)), /unrepresentative year/);
  assert.deepEqual({ review, profile }, original);
  assert.throws(() => solarOptionsForUsage(null));
});
