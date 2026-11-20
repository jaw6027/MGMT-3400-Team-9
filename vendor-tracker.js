import { trackingServices, trackingActions, trackingCloseReasons, referralStages, trackingToday, validateReferralRecord, readReferralBackup, referralPerformance } from './referral-tracking.js';
const trackerStorageKey = 'helio-home:referral-tracker:v1';
let trackerRecords = [];
let trackerEditing = null;
const trackerForm = document.querySelector('#tracker-form');
const trackerStatus = message => { document.querySelector('#tracker-status').textContent = message; };
for (const [value, label] of Object.entries(referralStages)) {
  const option = document.createElement('option'); option.value = value; option.textContent = label; trackerForm.elements.stage.append(option);
}
for (const [field, choices] of [['service', trackingServices], ['nextAction', trackingActions], ['closeReason', trackingCloseReasons]]) {
  for (const [value, label] of Object.entries(choices)) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; trackerForm.elements[field].append(option);
  }
}
const trackerFilter = document.querySelector('#tracker-filter');
trackerFilter.addEventListener('change', () => trackerRender());
function trackerResetForm() {
  trackerEditing = null; trackerForm.reset(); trackerForm.elements.referred.value = trackingToday();
  document.querySelector('#tracker-form-title').textContent = 'Add a referral';
  trackerForm.querySelector('[type=submit]').textContent = 'Add referral';
  document.querySelector('#tracker-cancel').hidden = true;
}
function trackerCell(value) { const cell = document.createElement('td'); cell.textContent = value; return cell; }
function trackerRender() {
  const visible = trackerRecords.filter(record => {
    const open = !['installed', 'closed'].includes(record.stage);
    if (trackerFilter.value === 'due') return open && record.followup && record.followup <= trackingToday();
    if (trackerFilter.value === 'unplanned') return open && (!record.nextAction || !record.followup);
    return true;
  });
  document.querySelector('#tracker-count').textContent = `Showing ${visible.length} of ${trackerRecords.length} referrals. Vendor totals always include all records.`;
  const performance = referralPerformance(trackerRecords);
  document.querySelector('#tracker-empty').hidden = trackerRecords.length > 0;
  document.querySelector('#tracker-vendor-totals').replaceChildren(...performance.map(row => {
    const tr = document.createElement('tr');
    tr.append(...[row.vendor, row.referrals, row.contacts, row.installed].map(trackerCell));
    return tr;
  }));
  document.querySelector('#tracker-performance').replaceChildren(...performance.map(row => {
    const tr = document.createElement('tr');
    const values = [row.vendor, row.referrals, row.open, row.installed, row.closed, `${row.installationRate.toFixed(1)}%`, row.contacts ? `${row.averageContactDays.toFixed(1)} (${row.contacts} contacted)` : 'No contact dates', row.ratings ? `${row.averageRating.toFixed(1)}/5 (${row.ratings} ratings)` : 'No ratings', row.due];
    tr.append(...values.map(trackerCell)); return tr;
  }));
  document.querySelector('#tracker-records').replaceChildren(...visible.map(record => {
    const tr = document.createElement('tr');
    tr.append(...[record.id, record.vendor, record.referred, referralStages[record.stage], record.contacted || '—', record.installed || '—', record.followup || '—', record.rating ?? '—'].map(trackerCell));
    const processCell = document.createElement('td');
    const process = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = record.nextAction ? trackingActions[record.nextAction] : 'View process details';
    const fields = document.createElement('dl');
    for (const [label, value] of [['Service', trackingServices[record.service]], ['Team member', record.owner], ['Consultation', record.consultation], ['Quote received', record.quoteDate], ['Next action', trackingActions[record.nextAction]], ['Closed', record.closedDate], ['Closure reason', trackingCloseReasons[record.closeReason]]]) {
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = value || 'Not recorded'; fields.append(dt, dd);
    }
    process.append(summary, fields); processCell.append(process); tr.append(processCell);
    const actions = document.createElement('td');
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit referral ${record.id}`);
    edit.addEventListener('click', () => {
      trackerEditing = record.id;
      for (const field of ['vendor', 'referred', 'stage', 'contacted', 'installed', 'followup', 'rating', 'service', 'owner', 'consultation', 'quoteDate', 'nextAction', 'closedDate', 'closeReason']) trackerForm.elements[field].value = record[field] ?? '';
      document.querySelector('#tracker-form-title').textContent = `Edit referral ${record.id}`;
      trackerForm.querySelector('[type=submit]').textContent = 'Update referral';
      document.querySelector('#tracker-cancel').hidden = false;
      trackerForm.elements.vendor.focus();
    });
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete referral ${record.id}`);
    remove.addEventListener('click', () => {
      if (!confirm('Delete this referral from this tab? Save again to update the device copy.')) return;
      trackerRecords = trackerRecords.filter(item => item.id !== record.id);
      if (trackerEditing === record.id) trackerResetForm();
      trackerRender(); trackerStatus('Referral deleted from this tab. Device copy unchanged until you save.');
    });
    actions.append(edit, remove); tr.append(actions); return tr;
  }));
}
trackerForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (!trackerEditing && trackerRecords.length >= 1000) throw new Error('This prototype supports up to 1,000 referrals.');
    const raw = Object.fromEntries(new FormData(trackerForm));
    raw.id = trackerEditing || crypto.randomUUID(); raw.rating = raw.rating === '' ? null : Number(raw.rating);
    const record = validateReferralRecord(raw);
    if (trackerEditing) trackerRecords = trackerRecords.map(item => item.id === trackerEditing ? record : item);
    else trackerRecords.push(record);
    trackerResetForm(); trackerRender(); trackerStatus('Referral updated in this tab. Save on this device or download a backup to keep your changes.');
  } catch (error) { trackerStatus(error.message); }
});
document.querySelector('#tracker-cancel').addEventListener('click', trackerResetForm);
document.querySelector('#tracker-save').addEventListener('click', () => {
  try { localStorage.setItem(trackerStorageKey, JSON.stringify({ version: 1, records: trackerRecords })); trackerStatus('Saved on this device only. No data was sent or shared.'); }
  catch { trackerStatus('Device saving is unavailable. Download a backup instead.'); }
});
function trackerReplace(records) {
  if (trackerRecords.length && !confirm('Replace all records in this tab with the loaded copy? Download a backup first if needed.')) return;
  trackerRecords = records; trackerResetForm(); trackerRender(); trackerStatus('Records loaded into this tab. Device copy unchanged until you save.');
}
document.querySelector('#tracker-load').addEventListener('click', () => {
  try { const text = localStorage.getItem(trackerStorageKey); if (!text) return trackerStatus('No device copy found.'); trackerReplace(readReferralBackup(text)); }
  catch { trackerStatus('Could not load the device copy. It was not changed.'); }
});
document.querySelector('#tracker-clear').addEventListener('click', () => {
  if (!confirm('Delete the saved tracker copy from this browser? Records in this tab will remain.')) return;
  try { localStorage.removeItem(trackerStorageKey); trackerStatus('Device copy deleted. Records are still in this tab.'); }
  catch { trackerStatus('Could not delete the device copy.'); }
});
document.querySelector('#tracker-export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, records: trackerRecords }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = 'helio-referral-tracker.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  trackerStatus('Backup downloaded. Share it only with your group; it contains your internal vendor performance records.');
});
const trackerFile = document.querySelector('#tracker-file');
document.querySelector('#tracker-import').addEventListener('click', () => trackerFile.click());
trackerFile.addEventListener('change', async () => {
  try {
    const file = trackerFile.files[0]; if (!file) return;
    if (file.size > 1000000) throw new Error('Backup is too large.');
    trackerReplace(readReferralBackup(await file.text()));
  } catch (error) { trackerStatus(`Import failed: ${error.message} Existing records were not changed.`); }
  finally { trackerFile.value = ''; }
});
trackerResetForm(); trackerRender();
