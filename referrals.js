import { normalizeHomeProfile, homeSolarCaution } from './questionnaire.js';

export const referralServices = {
  assessment: 'Home energy assessment',
  solar: 'Rooftop solar consultation',
  maintenance: 'Existing solar system review',
  storage: 'Solar and battery consultation',
  backup: 'Battery and outage-backup design',
  community: 'Community solar eligibility review',
};

// Monthly bills support a consultation, not equipment sizing or a savings quote.
export function referralOptions(review, raw) {
  const profile = normalizeHomeProfile(raw);
  const options = [{ service: 'assessment', reason: !review
    ? 'Start with an assessment while you gather your bills and home details.'
    : review.highUsageMonths.length
      ? 'Review seasonal peaks and efficiency opportunities before sizing solar.'
      : 'Check equipment and energy-saving opportunities alongside solar.' }];
  const add = (service, reason) => options.push({ service, reason });
  if (profile.existingSolar === 'yes') {
    add('maintenance', 'Review generation and import/export records before adding equipment.');
    return options;
  }
  if (!review || review.annualKwh === 0) return options;
  if (profile.ownership === 'renter' || homeSolarCaution(profile)) {
    add('community', 'Rooftop constraints need review. Community solar depends on local availability, eligibility and contract terms.');
    return options;
  }
  add('solar', `Use your entered ${Math.round(review.annualKwh).toLocaleString('en-US')} kWh/year to request a production and cost comparison. Roof, shade, utility rules and hourly use still need checking.`);
  if (profile.daytime === 'rarely' || (['one', 'multiple'].includes(profile.ev) && profile.evCharging === 'night') || profile.utilityPlan === 'time-of-use') {
    add('storage', 'Compare solar alone, load scheduling and optional storage using hourly usage and your tariff. Battery savings are not established by monthly bills.');
  }
  if (profile.goal === 'backup') add('backup', 'Ask about essential circuits, backup hours and compatible isolation controls. Ordinary solar or a battery alone may not provide outage power.');
  return options;
}

export function publicVendorContacts(vendor) {
  const contacts = [];
  if (typeof vendor.phone === 'string') {
    const digits = vendor.phone.replace(/[^0-9]/g, '').replace(/^1(?=\d{10}$)/, '');
    if (/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) contacts.push({ label: `Call ${vendor.phone}`, href: `tel:+1${digits}` });
  }
  if (typeof vendor.email === 'string' && /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(vendor.email)) {
    contacts.push({ label: `Email ${vendor.email}`, href: `mailto:${vendor.email}` });
  }
  try {
    const url = new URL(vendor.website);
    if (url.protocol === 'https:' && !url.username && !url.password) contacts.push({ label: 'Visit website', href: url.href });
  } catch { /* Invalid contact URLs are never rendered. */ }
  return contacts;
}

export function matchReferralVendors(directory, area, service) {
  if (area !== 'bakersfield-ca' || !Object.hasOwn(referralServices, service)) return [];
  const seen = new Set();
  return directory.filter(vendor => {
    if (!vendor || typeof vendor.id !== 'string' || !vendor.id.trim() || seen.has(vendor.id)
      || typeof vendor.name !== 'string' || !vendor.name.trim()
      || !Array.isArray(vendor.areas) || !vendor.areas.includes(area)
      || !Array.isArray(vendor.services) || !vendor.services.includes(service)
      || !publicVendorContacts(vendor).length) return false;
    seen.add(vendor.id);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Only a public service name and the chosen city enter an external search.
export function referralSearchUrl(area, service) {
  if (area !== 'bakersfield-ca' || !Object.hasOwn(referralServices, service)) return null;
  const url = new URL('https://www.google.com/search');
  url.searchParams.set('q', `${referralServices[service]} providers Bakersfield California`);
  return url.href;
}

export function setupReferrals({ directory, getContext }) {
  const area = document.querySelector('#referral-area');
  const service = document.querySelector('#referral-service');
  const list = document.querySelector('#referral-list');
  let options = [];
  let sharedProviderIds = new Set();
  if (['http:', 'https:'].includes(location.protocol)) fetch('/api/config').then(response => response.ok ? response.json() : null).then(config => {
    if (config?.enabled) { sharedProviderIds = new Set(config.vendors.map(vendor => vendor.id)); showMatches(); }
  }).catch(() => {});
  function requestSharedReferral(vendor, selectedService) {
    const dialog = document.createElement('dialog');
    const title = document.createElement('h3'); title.textContent = `Request a referral to ${vendor.name}`;
    const info = document.createElement('p'); info.textContent = 'Your email and selected service will be stored on the shared server and made available to this vendor through a private link. No bill images, monthly bills or home questionnaire answers are sent. No email is sent automatically and no appointment is booked.';
    const form = document.createElement('form');
    const emailLabel = document.createElement('label'); emailLabel.textContent = 'Contact email';
    const email = document.createElement('input'); email.type = 'email'; email.required = true; email.maxLength = 254; email.autocomplete = 'email'; emailLabel.append(email);
    const consentLabel = document.createElement('label'); const consent = document.createElement('input'); consent.type = 'checkbox'; consent.required = true;
    consentLabel.append(consent, document.createTextNode(` I agree to share my contact email and service request with ${vendor.name} so they can contact me.`));
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Submit referral request';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.addEventListener('click', () => dialog.close());
    form.append(emailLabel, consentLabel, submit); dialog.append(title, info, form, status, close); document.body.append(dialog);
    dialog.addEventListener('close', () => { email.value = ''; dialog.remove(); });
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (!form.reportValidity()) return; submit.disabled = true;
      try {
        const response = await fetch('/api/public/referrals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vendorId: vendor.id, area: area.value, service: selectedService, email: email.value, consent: consent.checked }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Referral could not be saved.');
        email.value = ''; form.hidden = true; status.textContent = `Referral reference: ${result.id}. ${result.message}`;
      } catch (error) { status.textContent = error.message; submit.disabled = false; }
    });
    dialog.showModal();
  }
  function showMatches() {
    const selected = options.find(option => option.service === service.value);
    document.querySelector('#referral-reason').textContent = selected?.reason || '';
    const matches = matchReferralVendors(directory, area.value, service.value);
    const discovery = document.querySelector('#referral-discovery');
    const searchLink = document.querySelector('#referral-search');
    const searchUrl = referralSearchUrl(area.value, service.value);
    discovery.hidden = !searchUrl;
    if (searchUrl) {
      searchLink.href = searchUrl;
      searchLink.textContent = `Search for ${referralServices[service.value].toLowerCase()} providers in Bakersfield ↗`;
    } else searchLink.removeAttribute('href');
    document.querySelector('#referral-status').textContent = !area.value
      ? 'Choose your service area to see directory matches.'
      : area.value !== 'bakersfield-ca'
        ? 'This directory currently covers Bakersfield only. You can still prepare an inspection request.'
        : !matches.length
          ? 'No matching providers are listed in our Bakersfield directory yet. This does not mean no providers are available. You can prepare an inspection request below to share with a provider you choose.'
          : `${matches.length} directory match${matches.length === 1 ? '' : 'es'}. Listed alphabetically, not ranked by quality or price. Confirm coverage at your address, availability, qualifications and pricing directly.`;
    list.replaceChildren(...matches.map(vendor => {
      const card = document.createElement('li');
      const heading = document.createElement('h4'); heading.textContent = vendor.name;
      const why = document.createElement('p'); why.textContent = `Listed for Bakersfield · ${referralServices[service.value]}`;
      const contacts = document.createElement('p');
      publicVendorContacts(vendor).forEach(contact => {
        const link = document.createElement('a'); link.textContent = contact.label; link.href = contact.href;
        if (contact.href.startsWith('https:')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        contacts.append(link, document.createTextNode(' '));
      });
      const price = document.createElement('p');
      price.textContent = 'Price: request a written quote. We have no comparable price data to rate this provider as affordable.';
      card.append(heading, why, price, contacts);
      if (sharedProviderIds.has(vendor.id) && !getContext().example) {
        const request = document.createElement('button'); request.type = 'button'; request.textContent = 'Request a tracked referral';
        const chosen = service.value;
        request.addEventListener('click', () => requestSharedReferral(vendor, chosen)); card.append(request);
      }
      return card;
    }));
  }
  function refresh() {
    const previous = service.value;
    const { review, profile, example } = getContext();
    options = referralOptions(review, profile);
    service.replaceChildren(...options.map(item => {
      const option = document.createElement('option'); option.value = item.service; option.textContent = referralServices[item.service]; return option;
    }));
    if (options.some(item => item.service === previous)) service.value = previous;
    document.querySelector('#referral-example').hidden = !example;
    showMatches();
  }
  area.addEventListener('change', showMatches);
  service.addEventListener('change', showMatches);
  return { refresh };
}
