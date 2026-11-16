import { defaults, estimate, compareCosts } from './energy.js';
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
  renderComparison();
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
  if (!complete) {
    renderComparison();
    return;
  }
  const r = reviewEnergy(entries);
  currentReview = r;
  renderComparison();
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

function renderComparison() {
  const results = document.querySelector('#comparison-results');
  const notice = document.querySelector('#comparison-notice');
  results.hidden = true;
  notice.hidden = false;
  if (!currentReview) {
    notice.textContent = 'Complete all 12 months in Homeowner Energy Review to compare your entered bill costs with solar estimates.';
    return;
  }
  if (!form.checkValidity()) {
    notice.textContent = 'Correct the invalid solar plan inputs to update this comparison. Previous estimates are hidden.';
    return;
  }
  const values = Object.fromEntries(Object.keys(defaults).map(key => [key, Number(form.elements[key].value)]));
  const c = compareCosts(currentReview, values);
  if (!c.available) {
    notice.textContent = c.reason === 'zero-usage'
      ? 'Your entered bills show no electricity use. Confirm your kWh values before estimating solar costs.'
      : 'Your electricity price × entered annual kWh exceeds your total entered bills. Confirm the variable electricity price (excluding fixed fees), kWh values, and bill costs. A comparison is not shown because these assumptions would imply negative remaining utility charges.';
    return;
  }
  results.hidden = false;
  notice.hidden = true;
  set('comparison-source', exampleFields.size ? 'EXAMPLE BILL DATA · ILLUSTRATIVE SOLAR ESTIMATE' : 'ENTERED BILL DATA · ILLUSTRATIVE SOLAR ESTIMATE');
  set('compare-current-annual', billMoney.format(c.annualCost));
  set('compare-current-monthly', `${billMoney.format(c.monthlyCost)} / month on average`);
  for (const [prefix, scenario] of [['solar', c.solar], ['combined', c.combined]]) {
    set(`compare-${prefix}-annual`, billMoney.format(scenario.projectedAnnualCost));
    set(`compare-${prefix}-monthly`, `${billMoney.format(scenario.projectedMonthlyCost)} / month on average`);
    const percent = scenario.savingsPercent === null ? '' : ` (${Math.abs(scenario.savingsPercent).toFixed(1)}%)`;
    set(`compare-${prefix}-savings`, `${billMoney.format(Math.abs(scenario.annualSavings))}${percent} ${scenario.annualSavings >= 0 ? 'lower' : 'higher'} per year`);
  }
  const table = document.querySelector('#comparison-breakdown');
  table.replaceChildren();
  const costs = [
    ['Grid electricity', c.solar.baseline, c.solar.importCost, c.combined.importCost],
    ['Remaining bill charges (held constant)', c.retainedCharges, c.retainedCharges, c.retainedCharges],
    ['Export credits (subtracted)', 0, -c.solar.exportCredit, -c.combined.exportCredit],
    ['Annual maintenance', 0, values.annualCost, values.annualCost],
    ['Monitoring subscription', 0, values.monthlyFee * 12, values.monthlyFee * 12],
    ['Total annual cost', c.annualCost, c.solar.projectedAnnualCost, c.combined.projectedAnnualCost],
  ];
  for (const [label, ...amounts] of costs) {
    const row = document.createElement('tr');
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(heading);
    for (const amount of amounts) {
      const cell = document.createElement('td');
      cell.textContent = billMoney.format(amount);
      row.append(cell);
    }
    table.append(row);
  }
  const decimal = value => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(value);
  const assumptions = [
    ['Consumption source', `${number.format(currentReview.annualKwh)} kWh/year from your 12 entered months; independent of the solar plan’s monthly usage field.`],
    ['Variable electricity price', `${billedRate.format(values.rate)} / kWh; confirm this excludes fixed fees and reflects your bill year.`],
    ['Remaining charges', `${billMoney.format(c.retainedCharges)} / year = entered bill total minus kWh × variable price; assumed unchanged after solar.`],
    ['Solar production', `${decimal(values.solarKw)} kW × ${decimal(values.sunHours)} peak sun hours/day × 365 × ${decimal(values.performance)}% performance = ${number.format(c.solar.production)} kWh/year.`],
    ['Solar used at home', `${decimal(values.selfUse)}% of generation, capped at annual demand: ${number.format(c.solar.solarUsed)} kWh with solar only; ${number.format(c.combined.solarUsed)} kWh with upgrades.`],
    ['Exports and credit rate', `${number.format(c.solar.exports)} kWh with solar only; ${number.format(c.combined.exports)} kWh with upgrades. Credited at ${billedRate.format(values.exportRate)} / kWh with no credit cap assumed.`],
    ['Efficiency improvements', `0% reduction for solar only; ${decimal(values.efficiency)}% for solar + smart upgrades.`],
    ['Ongoing costs', `${billMoney.format(values.annualCost)} / year maintenance + ${billMoney.format(values.monthlyFee)} / month monitoring, applied to both solar options.`],
    ['Upfront costs excluded from annual totals', `${billMoney.format(values.solarCost)} solar installation; ${billMoney.format(values.upgradeCost)} additional smart upgrades; ${billMoney.format(values.incentive)} entered incentives. These are separate one-time amounts, not annual bill savings.`],
  ];
  const list = document.querySelector('#comparison-assumptions');
  list.replaceChildren(...assumptions.map(([label, text]) => {
    const pair = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = text;
    pair.append(dt, dd);
    return pair;
  }));
}
reset();
renderReview();
