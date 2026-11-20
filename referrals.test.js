import test from 'node:test';
import assert from 'node:assert/strict';
import { referralOptions, publicVendorContacts, matchReferralVendors, referralSearchUrl } from './referrals.js';
const review = { annualKwh: 12000, highUsageMonths: ['July'] };
const codes = (r, p) => referralOptions(r, p).map(item => item.service);
test('referrals require representative demand before solar, and respect roof and ownership constraints', () => {
  assert.deepEqual(codes(null, {}), ['assessment']);
  assert.deepEqual(codes({ ...review, annualKwh: 0 }, {}), ['assessment']);
  assert.deepEqual(codes(review, { existingSolar: 'yes', goal: 'backup' }), ['assessment', 'maintenance']);
  for (const profile of [{ ownership: 'renter' }, { roofCondition: 'replace' }, { solarPermission: 'no' }, { shade: 'heavy' }, { electricalPanel: 'upgrade' }]) {
    assert.deepEqual(codes(review, profile), ['assessment', 'community']);
  }
  assert.deepEqual(codes(review, {}), ['assessment', 'solar']);
  assert.deepEqual(codes(review, { daytime: 'rarely', goal: 'backup' }), ['assessment', 'solar', 'storage', 'backup']);
});
test('directory matches explicit area and service without treating generic storage as outage backup', () => {
  const vendor = { id: 'fixture', name: 'Synthetic provider', areas: ['bakersfield-ca'], services: ['storage'], website: 'https://example.test/' };
  assert.equal(matchReferralVendors([vendor], '', 'storage').length, 0);
  assert.equal(matchReferralVendors([vendor], 'other', 'storage').length, 0);
  assert.equal(matchReferralVendors([vendor], 'bakersfield-ca', 'backup').length, 0);
  assert.equal(matchReferralVendors([vendor, vendor, null, { ...vendor, id: 'invalid', website: 'javascript:alert(1)' }], 'bakersfield-ca', 'storage').length, 1);
});
test('contact links reject executable URLs, credentials, demo phone and email header injection', () => {
  assert.deepEqual(publicVendorContacts({ website: 'javascript:alert(1)', phone: '661-111-111', email: 'test@example.test\nBcc:other@example.test' }), []);
  assert.deepEqual(publicVendorContacts({ website: 'https://user:secret@example.test' }), []);
  assert.deepEqual(publicVendorContacts({ phone: '(202) 555-0100', email: 'hello@example.test', website: 'https://example.test/contact' }).map(c => c.href), ['tel:+12025550100', 'mailto:hello@example.test', 'https://example.test/contact']);
});

test('discovery searches use only a known service and Bakersfield, never homeowner details', () => {
  assert.equal(referralSearchUrl('', 'solar'), null);
  assert.equal(referralSearchUrl('other', 'solar'), null);
  assert.equal(referralSearchUrl('bakersfield-ca', 'private bill data'), null);
  const url = new URL(referralSearchUrl('bakersfield-ca', 'solar'));
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.searchParams.get('q'), 'Rooftop solar consultation providers Bakersfield California');
  assert.equal([...url.searchParams].length, 1);
});
