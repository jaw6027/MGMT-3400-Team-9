import { referralAttention, referralAttentionLabels, recordReferralStage, trackingServices, trackingActions, trackingCloseReasons, referralStages, trackingToday, validateReferralRecord, readReferralBackup, referralPerformance } from './referral-tracking.js';
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
function trackerShowFilter(value) {
  trackerFilter.value = value; trackerRender(); trackerFilter.scrollIntoView({ block: 'center' }); trackerFilter.focus();
}
document.querySelector('#tracker-show-all').addEventListener('click', () => trackerShowFilter('all'));
let trackerShared = false;
let trackerLocalRecords = null;
let trackerEditingRevision = null;
let trackerPolling = false;
let trackerSharedEpoch = 0;
let trackerSharedToday = null;
const trackerSharedMessage = message => { document.querySelector('#tracker-shared-status').textContent = message; };
async function trackerApi(path, method = 'GET', data) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Shared request failed.');
  return result;
}
const trackerLocalSaveDescription = document.querySelector('#tracker-save-description').textContent;
function trackerSharedControls() {
  document.querySelector('#tracker-save-description').textContent = trackerShared ? 'Shared changes save automatically to the server. Device-copy controls are disabled to keep local and shared records separate. Download backup exports the anonymous tracking records, not contact emails or vendor access links. Sign out to return to your local copy.' : trackerLocalSaveDescription;
  document.querySelector('#tracker-login').hidden = trackerShared;
  document.querySelector('#tracker-logout').hidden = !trackerShared;
  for (const id of ['tracker-save', 'tracker-load', 'tracker-import', 'tracker-clear']) document.getElementById(id).disabled = trackerShared;
}
function trackerEnterShared(records) {
  if (!trackerShared) {
    if (trackerRecords.length && !confirm('Switch to shared records? Your current local copy will stay in this tab and return when you sign out. Save or download it first if you need it after closing this page.')) return;
    trackerLocalRecords = trackerRecords;
  }
  trackerSharedEpoch++; trackerShared = true; trackerRecords = records; trackerResetForm(); trackerRender(); trackerSharedControls();
  trackerSharedMessage('Connected. Changes save to the shared server automatically.');
  trackerStatus('Showing shared team records. Local records have not been uploaded.');
}
async function trackerRefreshShared() {
  if (!trackerShared || trackerPolling) return;
  trackerPolling = true; const epoch = trackerSharedEpoch;
  try {
    const result = await trackerApi('/api/referrals');
    if (!trackerShared || epoch !== trackerSharedEpoch) return;
    if (JSON.stringify(result.records) !== JSON.stringify(trackerRecords) || trackerSharedToday !== result.today) { trackerSharedToday = result.today; trackerRecords = result.records; trackerRender(); }
    trackerSharedMessage('Connected. Shared records refresh every 10 seconds. Unsaved edits remain in the form.');
  } catch (error) { trackerSharedMessage(`Refresh paused: ${error.message} Current records and any form edits are retained.`); }
  finally { trackerPolling = false; }
}
document.querySelector('#tracker-login').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget;
  try { await trackerApi('/api/login', 'POST', { password: form.elements.password.value }); form.reset(); const result = await trackerApi('/api/referrals'); trackerSharedToday = result.today; trackerEnterShared(result.records); }
  catch (error) { form.reset(); trackerSharedMessage(error.message); }
});
document.querySelector('#tracker-logout').addEventListener('click', async () => {
  try { await trackerApi('/api/logout', 'POST', {}); trackerSharedEpoch++; trackerShared = false; trackerRecords = trackerLocalRecords || []; trackerLocalRecords = null; trackerResetForm(); trackerRender(); trackerSharedControls(); trackerSharedMessage('Signed out. Shared records are no longer displayed.'); trackerStatus('Local copy restored in this tab.'); }
  catch (error) { trackerSharedMessage(error.message); }
});
document.querySelector('#tracker-link-close').addEventListener('click', () => document.querySelector('#tracker-link-dialog').close());
document.querySelector('#tracker-link-dialog').addEventListener('close', () => { document.querySelector('#tracker-private-link').value = ''; });
if (['http:', 'https:'].includes(location.protocol)) {
  trackerApi('/api/config').then(async config => {
    if (!config.enabled) return;
    document.querySelector('#tracker-shared').hidden = false;
    document.querySelector('#tracker-shared-unavailable').hidden = true;
    try { const result = await trackerApi('/api/referrals'); trackerSharedToday = result.today; trackerEnterShared(result.records); } catch { /* Sign-in is shown without exposing data. */ }
  }).catch(() => {});
  setInterval(trackerRefreshShared, 10000);
}
function trackerResetForm() {
  trackerEditing = null; trackerEditingRevision = null; trackerForm.reset(); trackerForm.elements.referred.value = trackerShared ? trackerSharedToday : trackingToday();
  document.querySelector('#tracker-form-title').textContent = 'Add a referral';
  trackerForm.querySelector('[type=submit]').textContent = 'Add referral';
  document.querySelector('#tracker-cancel').hidden = true;
}
function trackerCell(value) { const cell = document.createElement('td'); cell.textContent = value; return cell; }
const trackerChartSort = document.querySelector('#tracker-chart-sort');
trackerChartSort.addEventListener('change', () => trackerRender());
function trackerRenderCharts(performance) {
  document.querySelector('#tracker-charts-empty').hidden = performance.length > 0;
  document.querySelector('#tracker-charts').hidden = performance.length === 0;
  trackerChartSort.disabled = performance.length === 0;
  const rows = [...performance].sort((a, b) => {
    if (trackerChartSort.value === 'completion') return b.installationRate - a.installationRate || a.vendor.localeCompare(b.vendor);
    if (trackerChartSort.value === 'response') return (a.averageContactDays ?? Infinity) - (b.averageContactDays ?? Infinity) || a.vendor.localeCompare(b.vendor);
    return a.vendor.localeCompare(b.vendor);
  });
  const responseMax = Math.max(1, ...rows.map(row => Math.ceil(row.averageContactDays ?? 0)));
  document.querySelector('#tracker-response-max').textContent = `${responseMax} days`;
  function chartRow(row, metric) {
    const rate = metric === 'rate';
    const value = rate ? row.installationRate : row.averageContactDays;
    const item = document.createElement('li');
    const label = document.createElement('div'); label.className = 'chart-label';
    const name = document.createElement('strong'); name.textContent = row.vendor;
    const amount = document.createElement('span');
    amount.textContent = value === null ? 'Not available' : `${value.toFixed(1)}${rate ? '%' : ' days'}`;
    label.append(name, amount);
    const track = document.createElement('div'); track.className = 'chart-track'; track.setAttribute('aria-hidden', 'true');
    const bar = document.createElement('div'); bar.className = 'chart-bar'; bar.style.width = `${value === null ? 0 : value / (rate ? 100 : responseMax) * 100}%`; track.append(bar);
    const sample = document.createElement('p'); sample.className = 'chart-sample';
    sample.textContent = rate ? `${row.installed} installed / ${row.referrals} referrals · ${row.open} still open`
      : `${row.contacts} with a contact date · ${row.referrals - row.contacts} without a contact date`;
    item.append(label, track, sample); return item;
  }
  document.querySelector('#tracker-rate-chart').replaceChildren(...rows.map(row => chartRow(row, 'rate')));
  document.querySelector('#tracker-response-chart').replaceChildren(...rows.map(row => chartRow(row, 'response')));
}
function trackerRender() {
  const visible = trackerRecords.filter(record => {
    const open = !['installed', 'closed'].includes(record.stage);
    if (Object.hasOwn(referralAttentionLabels, trackerFilter.value)) return referralAttention(record, trackerShared ? trackerSharedToday : undefined).includes(trackerFilter.value);
    if (trackerFilter.value === 'unplanned') return open && (!record.nextAction || !record.followup);
    return true;
  });
  document.querySelector('#tracker-count').textContent = `Showing ${visible.length} of ${trackerRecords.length} referrals. Vendor totals always include all records.`;
  document.querySelector('#tracker-attention').replaceChildren(...Object.entries(referralAttentionLabels).map(([key, label]) => {
    const count = trackerRecords.filter(record => referralAttention(record, trackerShared ? trackerSharedToday : undefined).includes(key)).length;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.attention = key;
    const number = document.createElement('strong'); number.textContent = count;
    button.append(number, document.createTextNode(label)); button.addEventListener('click', () => trackerShowFilter(key)); return button;
  }));
  const attentionCount = trackerRecords.filter(record => referralAttention(record, trackerShared ? trackerSharedToday : undefined).length).length;
  document.querySelector('#tracker-attention-empty').textContent = !trackerRecords.length ? 'Add or load referrals to see what needs attention.' : attentionCount ? `${attentionCount} open referrals need attention based on recorded details.` : 'No open referrals are flagged by these checks.';
  const performance = referralPerformance(trackerRecords, trackerShared ? trackerSharedToday : undefined);
  trackerRenderCharts(performance);
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
    process.append(summary, fields);
    const timeline = document.createElement('details'); timeline.className = 'referral-timeline';
    const timelineTitle = document.createElement('summary'); timelineTitle.textContent = 'Stage timeline';
    const note = document.createElement('p'); note.textContent = 'Times show when stages were recorded in this tracker, not when vendor events occurred. Earlier changes and field edits are not reconstructed. This is not a verified audit log.';
    timeline.append(timelineTitle, note);
    if (!record.history?.length) {
      const empty = document.createElement('p'); empty.textContent = 'No stage history recorded for this older referral. Saving an edit starts tracking from its current stage.'; timeline.append(empty);
    } else {
      const events = document.createElement('ol'); events.className = 'timeline';
      for (const event of record.history) {
        const item = document.createElement('li');
        const time = document.createElement('time'); time.dateTime = event.at; time.textContent = new Date(event.at).toLocaleString();
        item.append(time, document.createTextNode(` — ${referralStages[event.stage]}${event.kind === 'baseline' ? ' (first tracked; earlier history unknown)' : event.kind === 'initial' ? ' (record created)' : ' (stage changed)'}`)); events.append(item);
      }
      timeline.append(events);
    }
    processCell.append(process, timeline); tr.append(processCell);
    const actions = document.createElement('td');
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit referral ${record.id}`);
    edit.addEventListener('click', () => {
      trackerEditing = record.id; trackerEditingRevision = record.revision;
      for (const field of ['vendor', 'referred', 'stage', 'contacted', 'installed', 'followup', 'rating', 'service', 'owner', 'consultation', 'quoteDate', 'nextAction', 'closedDate', 'closeReason']) trackerForm.elements[field].value = record[field] ?? '';
      document.querySelector('#tracker-form-title').textContent = `Edit referral ${record.id}`;
      trackerForm.querySelector('[type=submit]').textContent = 'Update referral';
      document.querySelector('#tracker-cancel').hidden = false;
      trackerForm.elements.vendor.focus();
    });
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete referral ${record.id}`);
    remove.addEventListener('click', async () => {
      if (!confirm('Delete this referral from this tab? Save again to update the device copy.')) return;
      if (trackerShared) {
        try { await trackerApi(`/api/referrals/${record.id}`, 'DELETE', { revision: record.revision }); if (trackerEditing === record.id) trackerResetForm(); await trackerRefreshShared(); trackerStatus('Deleted from shared records.'); } catch (error) { trackerStatus(error.message); }
        return;
      }
      trackerRecords = trackerRecords.filter(item => item.id !== record.id);
      if (trackerEditing === record.id) trackerResetForm();
      trackerRender(); trackerStatus('Referral deleted from this tab. Device copy unchanged until you save.');
    });
    actions.append(edit, remove);
    if (trackerShared) {
      const link = document.createElement('button'); link.textContent = 'Vendor link';
      link.addEventListener('click', async () => {
        try { const result = await trackerApi(`/api/referrals/${record.id}/link`, 'POST', {}); document.querySelector('#tracker-private-link').value = result.url; document.querySelector('#tracker-link-expiry').textContent = `Expires ${new Date(result.expires).toLocaleString()}`; document.querySelector('#tracker-link-dialog').showModal(); }
        catch (error) { trackerStatus(error.message); }
      });
      const revoke = document.createElement('button'); revoke.textContent = 'Revoke link';
      revoke.addEventListener('click', async () => { try { await trackerApi(`/api/referrals/${record.id}/link`, 'DELETE', {}); trackerStatus('Vendor link and its active sessions revoked.'); } catch (error) { trackerStatus(error.message); } });
      actions.append(link, revoke);
    }
    tr.append(actions); return tr;
  }));
}
trackerForm.addEventListener('submit', async event => {
  event.preventDefault();
  try {
    if (!trackerEditing && trackerRecords.length >= 1000) throw new Error('This prototype supports up to 1,000 referrals.');
    const raw = Object.fromEntries(new FormData(trackerForm));
    raw.id = trackerEditing || crypto.randomUUID(); raw.rating = raw.rating === '' ? null : Number(raw.rating);
    if (trackerShared) {
      const button = trackerForm.querySelector('[type=submit]'); button.disabled = true;
      try {
        await trackerApi(trackerEditing ? `/api/referrals/${trackerEditing}` : '/api/referrals', trackerEditing ? 'PUT' : 'POST', { record: validateReferralRecord(raw, trackerSharedToday), revision: trackerEditingRevision });
        trackerResetForm(); await trackerRefreshShared(); trackerStatus('Saved to shared records.');
      } finally { button.disabled = false; }
      return;
    }
    const record = recordReferralStage(validateReferralRecord(raw), trackerRecords.find(item => item.id === trackerEditing));
    const updated = trackerEditing ? trackerRecords.map(item => item.id === trackerEditing ? record : item) : [...trackerRecords, record];
    trackerBackupText(updated);
    trackerRecords = updated;
    trackerResetForm(); trackerRender(); trackerStatus('Referral updated in this tab. Save on this device or download a backup to keep your changes.');
  } catch (error) { trackerStatus(error.message); }
});
document.querySelector('#tracker-cancel').addEventListener('click', trackerResetForm);
function trackerBackupText(records = trackerRecords) {
  const text = JSON.stringify({ version: 1, records });
  if (new Blob([text]).size > 1000000) throw new Error('Tracker backup exceeds 1 MB. Download an archive before removing older referrals to make room.');
  return text;
}
document.querySelector('#tracker-save').addEventListener('click', () => {
  try { localStorage.setItem(trackerStorageKey, trackerBackupText()); trackerStatus('Saved on this device only. No data was sent or shared.'); }
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
  let text; try { text = trackerBackupText(); } catch (error) { trackerStatus(error.message); return; }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
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
