import { defaults, estimate } from './energy.js';
import { months, reviewEnergy } from './review.js';

const form = document.querySelector('#calculator');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const set = (id, value) => { document.getElementById(id).textContent = value; };

function render() {
  set('efficiency-value', `${form.elements.efficiency.value}%`);
  const valid = form.checkValidity();
  document.querySelector('#error').hidden = valid;
  document.querySelector('#estimate-results').hidden = !valid;
  const name = form.elements.customer.value.trim();
  set('report-name', name);
  document.querySelector('#report-name').hidden = !name;
  if (!valid) return;
  const values = Object.fromEntries(Object.keys(defaults).map(key => [key, Number(form.elements[key].value)]));
  const r = estimate(values);
  for (const [id, key] of Object.entries({ 'annual-savings': 'annualSavings', 'net-cost': 'netCost', 'efficiency-savings': 'efficiencySavings', 'solar-savings': 'solarSavings', 'operating-cost': 'operatingCost', 'total-savings': 'annualSavings', baseline: 'baseline', 'annual-after': 'annualAfter' })) set(id, money.format(r[key]));
  set('monthly-savings', `${money.format(r.annualSavings / 12)} per month, averaged over a year`);
  set('grid-reduction', `${Math.round(r.gridReduction)}%`);
  set('payback', r.payback === null ? 'No payback' : r.payback === 0 ? 'No upfront cost' : `${r.payback.toFixed(1)} years`);
  for (const [id, key] of Object.entries({ 'annual-usage': 'annualUsage', 'reduced-usage': 'reducedUsage', production: 'production', 'solar-used': 'solarUsed', exports: 'exports', 'grid-kwh': 'gridKwh' })) set(id, `${number.format(r[key])} kWh`);
  const total = r.efficiencySavings + r.solarSavings;
  document.querySelector('#efficiency-bar').style.width = `${total ? r.efficiencySavings / total * 100 : 0}%`;
  document.querySelector('#solar-bar').style.width = `${total ? r.solarSavings / total * 100 : 0}%`;
}

function reset() {
  form.reset();
  for (const [key, value] of Object.entries(defaults)) form.elements[key].value = value;
  render();
}
form.addEventListener('input', render);
document.querySelector('#reset').addEventListener('click', reset);
document.querySelector('#print').addEventListener('click', () => {
  document.querySelector('details').open = true;
  if (!form.reportValidity()) return;
  window.print();
});
reset();

// Monthly bill review is separate from the illustrative solar scenario.
const reviewForm = document.querySelector('#review-form');
const rows = document.querySelector('#bill-rows');
for (const [i, month] of months.entries()) {
  const row = document.createElement('tr');
  row.innerHTML = `<th scope="row">${month}</th><td><input id="bill-kwh-${i}" aria-label="${month} electricity usage in kWh" type="number" min="0" max="100000" step="any" placeholder="kWh" required></td><td><input id="bill-cost-${i}" aria-label="${month} bill cost in dollars" type="number" min="0" max="10000000" step="any" placeholder="$" required></td>`;
  rows.append(row);
}

let currentReview = null;
let lastAppliedUsage = null;
const exampleFields = new Set();
const billedRate = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 3, maximumFractionDigits: 3 });
const billMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
function fillList(id, items) {
  document.getElementById(id).replaceChildren(...items.map(text => {
    const li = document.createElement('li');
    li.textContent = text;
    return li;
  }));
}

function renderReview() {
  const entries = months.map((_, i) => {
    const usage = document.getElementById(`bill-kwh-${i}`);
    const cost = document.getElementById(`bill-cost-${i}`);
    const valid = usage.value !== '' && cost.value !== '' && usage.validity.valid && cost.validity.valid;
    return valid ? { kwh: Number(usage.value), cost: Number(cost.value) } : null;
  });
  const count = entries.filter(Boolean).length;
  const complete = count === 12;
  set('review-progress', `${count} of 12 months complete. ${exampleFields.size ? 'Includes example data — replace every sample value with a homeowner bill before using this review.' : complete ? 'Your review is ready. Calculated from your entered bills.' : 'Enter valid usage and cost for every month to see your review.'}`);
  document.querySelector('#review-results').hidden = !complete;
  document.querySelector('#review-empty').hidden = complete;
  set('review-applied', '');
  currentReview = null;
  if (!complete) return;
  const r = reviewEnergy(entries);
  currentReview = r;
  set('review-kwh', `${number.format(r.annualKwh)} kWh`);
  set('review-cost', billMoney.format(r.annualCost));
  set('review-average-kwh', `${number.format(r.averageKwh)} kWh`);
  set('review-average-cost', billMoney.format(r.averageCost));
  set('review-rate', r.billedRate === null ? 'N/A — no usage entered' : `${billedRate.format(r.billedRate)} / kWh`);
  const findings = [];
  if (r.peakMonths.length) findings.push(`Highest usage: ${r.peakMonths.join(', ')} (${number.format(r.peakKwh)} kWh${r.peakMonths.length > 1 ? ' each' : ''}).`);
  else findings.push('All entered months have zero usage. Confirm this matches the bills before planning upgrades.');
  if (r.costliestMonths.length) findings.push(`Highest bill: ${r.costliestMonths.join(', ')} (${billMoney.format(r.peakCost)}${r.costliestMonths.length > 1 ? ' each' : ''}).`);
  if (r.highUsageMonths.length) findings.push(`More than 20% above your monthly usage average: ${r.highUsageMonths.join(', ')}.`);
  else if (r.annualKwh > 0) findings.push('No month is more than 20% above your monthly usage average.');
  fillList('review-findings', findings);
  const recommendations = r.annualKwh === 0
    ? ['Check that usage was entered in kWh, rather than dollars or meter readings. Solar sizing needs representative consumption.']
    : [r.highUsageMonths.length
      ? `Compare ${r.highUsageMonths.join(', ')} with weather, heating or cooling schedules, household changes, and billing-period length to investigate the higher usage.`
      : 'Review everyday loads such as water heating, refrigeration, lighting, and standby devices for efficiency opportunities.',
    'Confirm your variable electricity rate and any fixed charges on your utility bill before using the solar savings calculator.',
    'Use your average monthly usage in the solar plan, then confirm roof shading, solar output, and installation costs with a local installer.'];
  if (r.annualKwh === 0 && r.annualCost > 0) recommendations.push('Bills with no recorded usage may include fixed fees. Check the breakdown with your utility.');
  fillList('review-recommendations', recommendations);
  document.querySelector('#review-chart').replaceChildren(...entries.map((entry, i) => {
    const column = document.createElement('div');
    column.className = 'chart-column';
    column.setAttribute('role', 'img');
    column.setAttribute('aria-label', `${months[i]}: ${number.format(entry.kwh)} kWh`);
    column.title = `${months[i]}: ${number.format(entry.kwh)} kWh`;
    const track = document.createElement('div');
    track.className = 'chart-track';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${r.peakKwh ? entry.kwh / r.peakKwh * 100 : 0}%`;
    track.append(bar);
    const label = document.createElement('span');
    label.textContent = months[i].slice(0, 3);
    column.append(track, label);
    return column;
  }));
  const apply = document.querySelector('#review-apply');
  apply.disabled = r.annualKwh === 0;
  if (lastAppliedUsage !== null && Number(form.elements.monthlyKwh.value) !== r.averageKwh) {
    set('review-applied', 'Your solar plan still has its previous usage. Apply this review to update it.');
  }
}
reviewForm.addEventListener('submit', event => event.preventDefault());
reviewForm.addEventListener('input', event => {
  exampleFields.delete(event.target.id);
  renderReview();
});
document.querySelector('#review-clear').addEventListener('click', () => {
  reviewForm.reset();
  exampleFields.clear();
  renderReview();
  set('review-progress', '0 of 12 months complete. Bills cleared; your solar plan has not been changed.');
});
document.querySelector('#review-example').addEventListener('click', () => {
  const sampleKwh = [1200, 1100, 900, 750, 800, 1050, 1400, 1350, 1000, 800, 950, 1150];
  sampleKwh.forEach((kwh, i) => {
    document.getElementById(`bill-kwh-${i}`).value = kwh;
    document.getElementById(`bill-cost-${i}`).value = (kwh * 0.18 + 15).toFixed(2);
    exampleFields.add(`bill-kwh-${i}`);
    exampleFields.add(`bill-cost-${i}`);
  });
  renderReview();
});
document.querySelector('#review-apply').addEventListener('click', () => {
  if (!currentReview || currentReview.annualKwh === 0) return;
  form.elements.monthlyKwh.value = currentReview.averageKwh;
  lastAppliedUsage = currentReview.averageKwh;
  render();
  set('review-applied', `Average usage applied: ${number.format(currentReview.averageKwh)} kWh/month. Your electricity rate and other solar assumptions were kept. Confirm the variable rate on your bill.`);
});
document.querySelector('#reset').addEventListener('click', () => {
  lastAppliedUsage = null;
  set('review-applied', currentReview ? 'Solar plan reset. Your bills are unchanged; apply your average usage again when ready.' : '');
});
renderReview();
