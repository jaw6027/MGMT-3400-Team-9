import { normalizeHomeProfile } from './questionnaire.js';

export const PROGRESS_KEY = 'helio-home:progress:v1';
const planLimits = {
  monthlyKwh: 100000, rate: 10, efficiency: 50, solarKw: 1000, sunHours: 24,
  performance: 100, selfUse: 100, exportRate: 10, solarCost: 10000000,
  upgradeCost: 10000000, incentive: 10000000, annualCost: 1000000, monthlyFee: 100000,
};

// Construct a strict whitelist. Never serialize form contents or OCR results wholesale.
export function normalizeProgress(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.bills) || state.bills.length !== 12 ||
      !state.plan || !Array.isArray(state.exampleFields)) throw new Error('Unsupported saved progress.');
  const numeric = (value, max) => {
    if (value === null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error('Invalid saved number.');
    return value;
  };
  const bills = state.bills.map(bill => {
    if (!bill || typeof bill !== 'object') throw new Error('Invalid saved month.');
    return { kwh: numeric(bill.kwh, 100000), cost: numeric(bill.cost, 10000000) };
  });
  const plan = Object.fromEntries(Object.entries(planLimits).map(([key, max]) => [key, numeric(state.plan[key], max)]));
  if (plan.efficiency === null) throw new Error('The efficiency slider must have a value.');
  const exampleFields = [...new Set(state.exampleFields.filter(id => {
    const match = typeof id === 'string' && id.match(/^bill-(kwh|cost)-(\d|1[01])$/);
    return match && bills[Number(match[2])][match[1]] !== null;
  }))].sort();
  const clean = { version: 1, bills, plan, exampleFields };
  if (Object.hasOwn(state, 'homeProfile')) clean.homeProfile = normalizeHomeProfile(state.homeProfile);
  return clean;
}

export function encodeProgress(state) {
  return JSON.stringify(normalizeProgress(state));
}

export function decodeProgress(text) {
  if (typeof text !== 'string' || text.length > 8192) throw new Error('Invalid saved progress.');
  return normalizeProgress(JSON.parse(text));
}

export function setupProgress({ getState, applyState, storage = () => globalThis.localStorage }) {
  const save = document.querySelector('#save-progress');
  const remove = document.querySelector('#delete-progress');
  const status = document.querySelector('#save-progress-status');
  let baseline = null;
  let hasSaved = false;
  let message = 'Not saved yet. Open Save progress to keep your entries on this browser.';
  const say = text => { if (status.textContent !== text) status.textContent = text; };

  function refresh() {
    remove.disabled = !hasSaved;
    try {
      const current = encodeProgress(getState());
      save.disabled = false;
      const dirty = baseline !== null && current !== baseline;
      say(dirty ? 'Unsaved changes — choose Save progress to keep your updates. Your previous saved copy is unchanged.' : message);
    } catch {
      save.disabled = true;
      say('Correct invalid bill numbers, solar settings, or any home answers selected for saving. Blank fields can be saved for later; your previous saved copy is unchanged.');
    }
  }

  try {
    const raw = storage().getItem(PROGRESS_KEY);
    hasSaved = raw !== null;
    if (hasSaved) {
      const state = decodeProgress(raw);
      applyState(state);
      baseline = encodeProgress(state);
      message = 'Saved progress restored on this browser. Choose Save progress again after making changes.';
    }
  } catch {
    message = 'Saved progress could not be loaded, or browser storage is unavailable. You can still use the app. No saved data was overwritten.';
  }
  save.addEventListener('click', () => {
    try {
      const encoded = encodeProgress(getState());
      storage().setItem(PROGRESS_KEY, encoded);
      baseline = encoded;
      hasSaved = true;
      message = 'Progress saved on this browser. Choose Save progress again after changes. Photos and personal contact details were not saved.';
      refresh();
    } catch {
      say('Progress could not be saved. Browser storage may be blocked or full. Your entries are still on screen; do not close the page until you have kept the numbers another way.');
    }
  });
  remove.addEventListener('click', () => {
    try {
      storage().removeItem(PROGRESS_KEY);
      hasSaved = false;
      baseline = null;
      message = 'Saved progress deleted from this browser. Current entries stay on screen and will not be saved again unless you choose Save progress.';
      refresh();
    } catch {
      say('Saved progress could not be deleted because browser storage is unavailable. Try again or remove this site’s data in your browser settings.');
    }
  });
  refresh();
  return { refresh };
}
