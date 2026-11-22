import { trackingServices, trackingCloseReasons, referralStages } from './referral-tracking.js';
const vendorStatus = document.querySelector('#vendor-status');
const vendorForm = document.querySelector('#vendor-update-form');
let vendorRecord = null;
const vendorToken = new URLSearchParams(location.hash.slice(1)).get('token');
let vendorExpectedId = new URL(location.href).searchParams.get('ref');
history.replaceState(null, '', location.pathname + (vendorExpectedId ? `?ref=${encodeURIComponent(vendorExpectedId)}` : ''));
for (const [value, label] of Object.entries(trackingCloseReasons)) {
  const option = document.createElement('option'); option.value = value; option.textContent = label; vendorForm.elements.closeReason.append(option);
}
async function vendorApi(path, method = 'GET', data) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'Update failed.'); return value;
}
function vendorRender(record) {
  vendorRecord = record;
  document.querySelector('#vendor-details').hidden = false;
  document.querySelector('#vendor-name').textContent = record.vendor;
  document.querySelector('#vendor-reference').textContent = `Referral: ${record.id}`;
  document.querySelector('#vendor-service').textContent = `Service: ${trackingServices[record.service] || 'Discuss service with the team'}`;
  document.querySelector('#vendor-current').textContent = `Current stage: ${referralStages[record.stage]}`;
  document.querySelector('#vendor-contact').textContent = record.email ? `Homeowner contact email (shared with permission): ${record.email}` : 'No contact email was supplied for this manually created referral. Ask the team for its approved contact process.';
  for (const name of ['contacted', 'consultation', 'quoteDate', 'installed', 'closedDate', 'closeReason']) vendorForm.elements[name].value = record[name] || '';
  vendorForm.elements.stage.value = record.stage === 'referred' ? 'contacted' : record.stage;
  vendorForm.elements.confirmed.checked = false;
}
vendorForm.addEventListener('submit', async event => {
  event.preventDefault(); const button = vendorForm.querySelector('button'); button.disabled = true;
  try {
    const fields = Object.fromEntries(new FormData(vendorForm)); fields.confirmed = vendorForm.elements.confirmed.checked; fields.revision = vendorRecord.revision; fields.id = vendorRecord.id;
    const updated = await vendorApi('/api/vendor/referral', 'PATCH', fields); vendorRender(updated); vendorStatus.textContent = 'Update saved. The team dashboard will pick it up automatically.';
  } catch (error) { vendorStatus.textContent = `${error.message} Your changes remain in the form. Reopen the private link to load the latest record before retrying a conflicting update.`; }
  finally { button.disabled = false; }
});
(async () => {
  try { if (vendorToken) { const session = await vendorApi('/api/vendor/session', 'POST', { token: vendorToken }); vendorExpectedId = session.id; history.replaceState(null, '', `${location.pathname}?ref=${encodeURIComponent(vendorExpectedId)}`); } vendorRender(await vendorApi('/api/vendor/referral' + (vendorExpectedId ? `?ref=${encodeURIComponent(vendorExpectedId)}` : ''))); vendorStatus.textContent = 'Review the referral and report its current progress.'; }
  catch (error) { document.querySelector('#vendor-details').hidden = true; vendorStatus.textContent = `${error.message} Ask the team for a current private link.`; }
})();
