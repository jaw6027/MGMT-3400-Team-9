export const referralStages = { referred: 'Referred', contacted: 'Contacted', scheduled: 'Consultation scheduled', quoted: 'Quote received', installed: 'Installed', closed: 'Closed without installation' };
export const trackingServices = { assessment: 'Home energy assessment', solar: 'Rooftop solar', maintenance: 'Existing solar review', storage: 'Solar and battery', backup: 'Outage backup', community: 'Community solar eligibility' };
export const trackingActions = { contact: 'Contact vendor', consultation: 'Confirm consultation', quote: 'Request written quote', review: 'Review quote with homeowner', installation: 'Confirm installation plans', feedback: 'Request customer feedback', verify: 'Verify project outcome' };
export const trackingCloseReasons = { cost: 'Cost or financing', suitability: 'Home or roof unsuitable', declined: 'Homeowner declined', unresponsive: 'No response', unavailable: 'Vendor unavailable', alternative: 'Another option chosen', other: 'Other / discuss with team' };
export function trackingToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function trackingDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateReferralRecord(raw, today = trackingToday()) {
  if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(raw.id)
    || typeof raw.vendor !== 'string' || !raw.vendor.trim() || raw.vendor.trim().length > 100
    || !Object.hasOwn(referralStages, raw.stage) || !trackingDate(raw.referred) || raw.referred > today) throw new Error('Check the business name, stage and referral date. Future referral dates are not allowed.');
  const record = { id: raw.id, vendor: raw.vendor.trim(), stage: raw.stage, referred: raw.referred };
  for (const key of ['contacted', 'installed', 'followup']) {
    const value = raw[key] || '';
    if (typeof value !== 'string' || (value && (!trackingDate(value) || value < raw.referred || (key !== 'followup' && value > today)))) throw new Error('Event dates must be valid, on or after the referral date, and not in the future. Follow-up dates may be in the future.');
    record[key] = value;
  }
  if (['contacted', 'scheduled', 'quoted', 'installed'].includes(raw.stage) && !record.contacted) throw new Error('Enter the first contact date for this stage.');
  if (raw.stage === 'referred' && record.contacted) throw new Error('Choose a contacted or later stage when a contact date is supplied.');
  if (raw.stage === 'installed' && (!record.installed || record.installed < record.contacted)) throw new Error('Enter an installation date on or after first contact.');
  if (raw.stage !== 'installed' && record.installed) throw new Error('An installation date requires the Installed stage.');
  if (raw.rating !== '' && raw.rating != null && (!Number.isInteger(raw.rating) || raw.rating < 1 || raw.rating > 5)) throw new Error('Choose a customer rating from 1 to 5, or leave it blank.');
  record.rating = raw.rating === '' || raw.rating == null ? null : raw.rating;
  // Optional fields keep older version 1 backups usable without inventing history.
  for (const [key, choices] of [['service', trackingServices], ['nextAction', trackingActions], ['closeReason', trackingCloseReasons]]) {
    if (raw[key] == null || raw[key] === '') continue;
    if (typeof raw[key] !== 'string' || !Object.hasOwn(choices, raw[key])) throw new Error('Choose a listed service, next action or closure reason.');
    record[key] = raw[key];
  }
  if (raw.owner != null && raw.owner !== '') {
    if (typeof raw.owner !== 'string' || !/^[a-z0-9-]{1,12}$/i.test(raw.owner)) throw new Error('Use a team member code of up to 12 letters, digits or hyphens.');
    record.owner = raw.owner;
  }
  for (const key of ['consultation', 'quoteDate', 'closedDate']) {
    if (raw[key] == null || raw[key] === '') continue;
    if (!trackingDate(raw[key]) || raw[key] < (record.contacted || record.referred) || (key !== 'consultation' && raw[key] > today)) throw new Error('Process dates must follow referral/first contact. Only a planned consultation may be in the future.');
    record[key] = raw[key];
  }
  if ((record.closeReason || record.closedDate) && record.stage !== 'closed') throw new Error('Closure details require the Closed stage.');
  if (record.quoteDate && !record.contacted) throw new Error('Record first contact before recording a received quote.');
  if (record.stage === 'referred' && record.consultation) throw new Error('Choose a contacted or later stage before scheduling a consultation.');
  if (record.installed && [record.consultation, record.quoteDate].some(date => date && date > record.installed)) throw new Error('Installation cannot precede a recorded consultation or quote.');
  if (record.closedDate && record.quoteDate && record.closedDate < record.quoteDate) throw new Error('Closure cannot precede the received quote.');
  return record;
}
export function readReferralBackup(text, today = trackingToday()) {
  if (typeof text !== 'string' || text.length > 1000000) throw new Error('Backup is too large.');
  const data = JSON.parse(text);
  if (data?.version !== 1 || !Array.isArray(data.records) || data.records.length > 1000) throw new Error('Use a version 1 tracker backup with up to 1,000 referrals.');
  const records = data.records.map(record => validateReferralRecord(record, today));
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('Duplicate referral IDs in backup.');
  return records;
}
export function referralPerformance(records, today = trackingToday()) {
  const vendors = new Map();
  for (const raw of records) {
    const r = validateReferralRecord(raw, today);
    const key = r.vendor.toLocaleLowerCase('en-US');
    if (!vendors.has(key)) vendors.set(key, { vendor: r.vendor, referrals: 0, open: 0, installed: 0, closed: 0, due: 0, contacts: 0, contactDays: 0, ratings: 0, ratingTotal: 0 });
    const row = vendors.get(key);
    row.referrals++;
    if (r.stage === 'installed') row.installed++;
    else if (r.stage === 'closed') row.closed++;
    else { row.open++; if (r.followup && r.followup <= today) row.due++; }
    if (r.contacted) { row.contacts++; row.contactDays += (Date.parse(r.contacted) - Date.parse(r.referred)) / 86400000; }
    if (r.rating !== null) { row.ratings++; row.ratingTotal += r.rating; }
  }
  return [...vendors.values()].sort((a, b) => a.vendor.localeCompare(b.vendor)).map(row => ({ ...row,
    installationRate: row.installed / row.referrals * 100,
    averageContactDays: row.contacts ? row.contactDays / row.contacts : null,
    averageRating: row.ratings ? row.ratingTotal / row.ratings : null,
  }));
}
