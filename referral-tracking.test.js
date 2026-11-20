import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReferralRecord, referralPerformance, readReferralBackup } from './referral-tracking.js';
const today = '2026-11-19';
const base = { id: 'ref-1', vendor: 'Synthetic business', referred: '2026-11-01', stage: 'referred', contacted: '', installed: '', followup: '', rating: null };
test('tracking enforces real chronological dates, status consistency and optional ratings', () => {
  for (const changes of [{ referred: '2026-02-30' }, { referred: '2026-11-20' }, { stage: 'installed' }, { stage: 'contacted' }, { contacted: '2026-11-02' }, { stage: 'scheduled', contacted: '2026-10-31' }, { rating: 0 }, { rating: 6 }, { rating: 2.5 }, { stage: 'closed', installed: '2026-11-03' }]) assert.throws(() => validateReferralRecord({ ...base, ...changes }, today));
  assert.equal(validateReferralRecord({ ...base, followup: '2026-12-01' }, today).followup, '2026-12-01');
  assert.throws(() => validateReferralRecord({ ...base, stage: 'installed', contacted: '2026-11-04', installed: '2026-11-03' }, today));
});
test('performance separates open work, completed installs, contact samples and optional ratings', () => {
  const rows = [base,
    { ...base, id: 'ref-2', vendor: 'synthetic BUSINESS', stage: 'installed', contacted: '2026-11-03', installed: '2026-11-10', followup: '2026-11-10', rating: 5 },
    { ...base, id: 'ref-3', stage: 'closed', contacted: '2026-11-05', rating: 3 },
    { ...base, id: 'ref-4', followup: today },
  ];
  const [result] = referralPerformance(rows, today);
  assert.equal(result.referrals, 4); assert.equal(result.installed, 1); assert.equal(result.open, 2); assert.equal(result.closed, 1);
  assert.equal(result.installationRate, 25); assert.equal(result.due, 1); assert.equal(result.contacts, 2); assert.equal(result.averageContactDays, 3);
  assert.equal(result.ratings, 2); assert.equal(result.averageRating, 4);
  const [missing] = referralPerformance([base], today); assert.equal(missing.averageRating, null); assert.equal(missing.averageContactDays, null);
  assert.deepEqual(referralPerformance([], today), []);
});
test('backup validation rejects corrupted and duplicate records and strips unrelated private fields', () => {
  const stringify = records => JSON.stringify({ version: 1, records });
  assert.deepEqual(readReferralBackup(stringify([{ ...base, email: 'private@example.test', notes: 'private', bill: 'private' }]), today), [base]);
  assert.throws(() => readReferralBackup(stringify([base, base]), today));
  assert.throws(() => readReferralBackup('{"version":2,"records":[]}', today));
  assert.throws(() => readReferralBackup('x'.repeat(1000001), today));
});
test('process details survive backups and reject invalid or contradictory events', () => {
  const detailed = { ...base, stage: 'quoted', contacted: '2026-11-02', service: 'solar', owner: 'TEAM1', consultation: '2026-11-04', quoteDate: '2026-11-05', nextAction: 'review' };
  assert.deepEqual(readReferralBackup(JSON.stringify({ version: 1, records: [detailed] }), today), [detailed]);
  for (const changes of [{ service: 'invalid' }, { owner: 'Homeowner full name' }, { nextAction: 'invalid' }, { closeReason: 'cost' }, { closedDate: '2026-11-06' }, { quoteDate: '2026-11-20' }, { consultation: '2026-11-01' }, { stage: 'installed', installed: '2026-11-03' }]) assert.throws(() => validateReferralRecord({ ...detailed, ...changes }, today));
  const closed = validateReferralRecord({ ...detailed, stage: 'closed', closedDate: '2026-11-10', closeReason: 'cost' }, today);
  assert.equal(closed.closeReason, 'cost');
  assert.throws(() => validateReferralRecord({ ...closed, closedDate: '2026-11-04' }, today));
  assert.equal(validateReferralRecord({ ...detailed, consultation: '2026-12-01' }, today).consultation, '2026-12-01');
});
