import { defaults, estimate, compareCosts } from './energy.js';
import { months, reviewEnergy, recommendEnergy } from './review.js';
import { setupBillImport } from './bill-ui.js';
import { setupProgress } from './progress.js';
import { setupHomeQuestionnaire, tailorHomeRecommendation, homeProfileRows, homeSolarCaution, solarOptionsForUsage } from './questionnaire.js';

const form = document.querySelector('#calculator');
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const set = (id, value) => { document.getElementById(id).textContent = value; };
let progressControl = null;
let homeQuestionnaire = null;

function render() {
  progressControl?.refresh();
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
form.addEventListener('invalid', event => {
  const details = event.target.closest('details');
  if (details) details.open = true;
}, true);
const expandSolarDetails = () => form.querySelectorAll('details').forEach(details => { details.open = true; });
window.addEventListener('beforeprint', expandSolarDetails);
document.querySelector('#reset').addEventListener('click', reset);
document.querySelector('#print').addEventListener('click', () => {
  expandSolarDetails();
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
let currentRecommendation = null;
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
  progressControl?.refresh();
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
  set('bill-added-status', '');
  reviewForm.reset();
  exampleFields.clear();
  renderReview();
  set('review-progress', '0 of 12 months complete. Bills cleared; your solar plan has not been changed.');
});
document.querySelector('#review-example').addEventListener('click', () => {
  set('bill-added-status', '');
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
    renderRecommendation();
    notice.textContent = 'Complete all 12 months in Homeowner Energy Review to compare your entered bill costs with solar estimates.';
    return;
  }
  if (!form.checkValidity()) {
    renderRecommendation(null, 'The solar plan contains invalid inputs. This recommendation uses your bill patterns only.');
    notice.textContent = 'Correct the invalid solar plan inputs to update this comparison. Previous estimates are hidden.';
    return;
  }
  if (homeQuestionnaire?.read().profile.existingSolar === 'yes') {
    renderRecommendation();
    notice.textContent = 'Your questionnaire says this home already has solar. This comparison assumes bills from a home without solar, so estimates are hidden. Ask an assessor to review your generation and grid import/export records before considering changes.';
    return;
  }
  const values = Object.fromEntries(Object.keys(defaults).map(key => [key, Number(form.elements[key].value)]));
  const c = compareCosts(currentReview, values);
  if (!c.available) {
    renderRecommendation(null, 'The solar comparison is unavailable. Check the comparison message before considering solar.');
    notice.textContent = c.reason === 'zero-usage'
      ? 'Your entered bills show no electricity use. Confirm your kWh values before estimating solar costs.'
      : 'Your electricity price × entered annual kWh exceeds your total entered bills. Confirm the variable electricity price (excluding fixed fees), kWh values, and bill costs. A comparison is not shown because these assumptions would imply negative remaining utility charges.';
    return;
  }
  results.hidden = false;
  renderRecommendation(c);
  const homeProfile = homeQuestionnaire?.read().profile;
  const homeCaution = [
    homeSolarCaution(homeProfile),
    homeProfile?.utilityPlan === 'time-of-use' ? 'Your electricity price changes by time of day. This single-rate annual comparison does not model that tariff; get a time-based analysis before relying on these savings.' : '',
    homeProfile?.estimatedBills === 'yes' ? 'Some entered bills may use estimated readings. Confirm actual usage with your utility before relying on this comparison.' : '',
  ].filter(Boolean).join(' ');
  set('home-solar-caution', homeCaution);
  document.querySelector('#home-solar-caution').hidden = !homeCaution;
  set('meaning-bills', `Your ${exampleFields.size ? 'example' : 'entered'} bills add up to ${billMoney.format(c.annualCost)} for the year, or about ${billMoney.format(c.monthlyCost)} a month. You used ${number.format(currentReview.annualKwh)} kWh of electricity over the year.`);
  const saving = c.solar.annualSavings;
  const solarChange = Math.abs(saving) < 0.005 ? 'leave ongoing costs roughly unchanged'
    : saving > 0 ? `lower ongoing costs by about ${billMoney.format(saving)} a year (${billMoney.format(saving / 12)} a month on average)`
      : `increase ongoing costs by about ${billMoney.format(-saving)} a year (${billMoney.format(-saving / 12)} a month on average)`;
  set('meaning-solar', `Under the current settings, solar alone could ${solarChange}. This includes maintenance and monitoring, but not installation or loan payments. ${c.solar.projectedAnnualCost < 0 ? 'The negative cost shown is a net credit; your utility may limit or not pay out these credits. ' : ''}Confirm the settings and a full quote before deciding.`);
  set('meaning-efficiency', `Solar replaces some electricity you buy from the grid; it does not make your appliances use less. Smart upgrades are separately assumed to reduce electricity use by ${values.efficiency}%. ${values.efficiency > 0 ? `That would mean about ${number.format(currentReview.annualKwh * values.efficiency / 100)} fewer kWh used per year, if those improvements are achieved.` : 'No reduction in electricity use from upgrades is assumed in this scenario.'} Your recommendation explains what to check first.`);
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

function renderRecommendation(comparison = null, solarStatus = '') {
  const complete = currentReview !== null;
  document.querySelector('#recommendation-results').hidden = !complete;
  document.querySelector('#recommendation-empty').hidden = complete;
  currentRecommendation = complete ? tailorHomeRecommendation(recommendEnergy(currentReview, comparison), homeQuestionnaire?.read().profile) : null;
  if (!complete) return;
  const r = currentRecommendation;
  r.solarOptions = solarOptionsForUsage(currentReview, homeQuestionnaire?.read().profile);
  const solarOptions = document.querySelector('#solar-usage-options');
  solarOptions.replaceChildren(...r.solarOptions.map(option => {
    const item = document.createElement('li');
    const situation = document.createElement('p');
    situation.className = 'solar-option-situation';
    situation.textContent = option.situation;
    const heading = document.createElement('h4');
    heading.textContent = option.option;
    const nextStep = document.createElement('p');
    nextStep.textContent = option.nextStep;
    item.append(situation, heading, nextStep);
    return item;
  }));
  set('recommendation-source', exampleFields.size ? 'EXAMPLE DATA · SUGGESTED NEXT STEP' : 'BASED ON YOUR 12 ENTERED MONTHS');
  set('recommendation-title', r.title);
  set('recommendation-opportunity', r.opportunity);
  set('recommendation-evidence', r.evidence);
  set('recommendation-package', r.packageName);
  set('recommendation-why', r.why);
  fillList('recommendation-services', r.services);
  set('recommendation-solar-note', solarStatus ? `${solarStatus} ${r.solarNote}` : r.solarNote);
  fillList('home-recommendation-insights', r.homeInsights);
  fillList('home-recommendation-followups', r.homeFollowups);
  document.querySelector('#home-recommendation-context').hidden = !r.homeInsights.length && !r.homeFollowups.length;
}

const assessmentDialog = document.querySelector('#assessment-dialog');
const assessmentForm = document.querySelector('#assessment-form');
let assessmentMode = 'energy';
function openHomeAssessment(mode) {
  if (mode === 'energy' && !currentRecommendation) return;
  assessmentMode = mode;
  set('assessment-package', mode === 'inspection' ? 'Home Information & Inspection Visit' : currentRecommendation.packageName);
  document.querySelector('#inspection-request-note').hidden = mode !== 'inspection';
  set('assessment-status', '');
  assessmentDialog.showModal();
}
document.querySelector('#request-assessment').addEventListener('click', () => openHomeAssessment('energy'));
document.querySelector('#request-inspection').addEventListener('click', () => openHomeAssessment('inspection'));
document.querySelector('#assessment-close').addEventListener('click', () => assessmentDialog.close());
assessmentDialog.addEventListener('close', () => {
  assessmentForm.reset();
  set('assessment-status', '');
});
assessmentForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!assessmentForm.reportValidity() || (assessmentMode === 'energy' && (!currentRecommendation || !currentReview))) return;
  const r = currentRecommendation || {
    title: 'Gather the home information needed for an energy review',
    opportunity: 'The homeowner would like someone to inspect the home and help identify equipment, insulation, roof conditions, and the information needed for planning.',
    evidence: 'The bill review is incomplete. No complete-year savings conclusion is included.',
    why: 'Unknown answers are a reason to request an assessment, not to guess.',
    services: ['Confirm household energy equipment and controls', 'Review insulation, drafts, and major electric loads', 'Arrange qualified roof and electrical suitability checks where needed'],
    homeInsights: [], homeFollowups: ['Confirm missing questionnaire details and representative bill data during the visit.'],
  };
  const fields = new FormData(assessmentForm);
  const contact = name => String(fields.get(name) || '').trim();
  const billLines = months.map((month, i) => `${month}: usage ${document.getElementById(`bill-kwh-${i}`).value || 'not supplied'} kWh; cost ${document.getElementById(`bill-cost-${i}`).value ? '$' + document.getElementById(`bill-cost-${i}`).value : 'not supplied'}`);
  const comparisonVisible = !document.querySelector('#comparison-results').hidden;
  const text = [
    'HELIO HOME — HOME ASSESSMENT REQUEST DRAFT',
    'Prepared locally. Nothing has been sent and no appointment has been booked.',
    exampleFields.size ? 'CONTAINS EXAMPLE BILL DATA — replace before requesting a real assessment.' : 'Based on homeowner-entered bill data; not independently verified.',
    '', `Name: ${contact('name')}`, `Email: ${contact('email')}`, `ZIP / postal code: ${contact('postal') || 'Not supplied'}`,
    '', `Request type: ${assessmentMode === 'inspection' ? 'Please contact me to arrange an in-home information and inspection visit.' : 'Home energy assessment.'}`,
    `Suggested package: ${assessmentMode === 'inspection' ? 'Home Information & Inspection Visit' : r.packageName}`, `Main opportunity: ${r.title}`, r.opportunity, r.evidence, r.why,
    '', 'Services to discuss:', ...r.services.map(service => `- ${service}`),
    '', 'Solar options for your usage:', ...(r.solarOptions?.flatMap(option => [option.situation, option.option, option.nextStep, '']) || ['Complete a bill review to connect solar options to your usage.']),
    '', ...(currentReview ? [`Annual use: ${number.format(currentReview.annualKwh)} kWh`, `Annual bill costs: ${billMoney.format(currentReview.annualCost)}`] : ['Annual bill totals are unavailable because the 12-month review is incomplete.']),
    '', 'Entered monthly bills:', ...billLines,
    '', 'HOME ENERGY QUESTIONNAIRE (self-reported, not independently verified):',
    ...(homeProfileRows(homeQuestionnaire?.read().profile).length ? homeProfileRows(homeQuestionnaire.read().profile).map(([label, answer]) => `${label}: ${answer}`) : ['No home answers supplied yet. The homeowner is requesting help gathering this information.']),
    ...(homeQuestionnaire?.read().invalid.length ? ['Some questionnaire numbers were invalid and excluded. Confirm these during the assessment.'] : []),
    '', 'Home-specific assessment notes:', ...r.homeInsights, ...r.homeFollowups,
    '', 'Solar assessment note:', currentRecommendation ? document.querySelector('#recommendation-solar-note').textContent : 'Solar suitability and savings have not been established. Confirm representative consumption and on-site conditions.',
    '', 'Solar cost comparison:', comparisonVisible
      ? `Current: ${document.querySelector('#compare-current-annual').textContent}/year; solar only: ${document.querySelector('#compare-solar-annual').textContent}/year; solar + upgrades: ${document.querySelector('#compare-combined-annual').textContent}/year.\n${document.querySelector('#comparison-assumptions').innerText}`
      : document.querySelector('#comparison-notice').textContent,
    '', `Homeowner notes: ${contact('notes') || 'None'}`,
    '', 'Planning recommendations are not a diagnosis, quote, or savings guarantee. Confirm bills, equipment, roof suitability, installation costs, financing, and utility rules with a qualified provider.',
    'Share this file with your chosen provider to request an assessment. It contains your contact details and energy data.',
  ].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helio-home-assessment-request.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  set('assessment-status', 'Your request file is ready to share with a provider. Nothing was sent and no appointment was booked.');
});
const helpDialog = document.querySelector('#help-dialog');
document.querySelector('#open-help').addEventListener('click', () => helpDialog.showModal());
document.querySelector('#close-help').addEventListener('click', () => helpDialog.close());
document.querySelector('#help-review-link').addEventListener('click', () => {
  helpDialog.close();
  document.getElementById('bill-kwh-0').focus({ preventScroll: true });
});
setupBillImport((month, kwh, cost) => {
  document.getElementById(`bill-kwh-${month}`).value = kwh;
  document.getElementById(`bill-cost-${month}`).value = cost;
  exampleFields.delete(`bill-kwh-${month}`);
  exampleFields.delete(`bill-cost-${month}`);
  renderReview();
});
homeQuestionnaire = setupHomeQuestionnaire(() => renderReview());
reset();
renderReview();
progressControl = setupProgress({
  getState() {
    const readNumber = input => {
      if (input.value === '' && !input.validity.badInput) return null;
      if (!input.validity.valid) throw new Error('Invalid input.');
      return input.valueAsNumber;
    };
    const state = {
      version: 1,
      bills: months.map((_, i) => ({ kwh: readNumber(document.getElementById(`bill-kwh-${i}`)), cost: readNumber(document.getElementById(`bill-cost-${i}`)) })),
      plan: Object.fromEntries(Object.keys(defaults).map(key => [key, readNumber(form.elements[key])])),
      exampleFields: [...exampleFields],
    };
    if (document.querySelector('#save-home-profile').checked) {
      const home = homeQuestionnaire.read();
      if (home.invalid.length) throw new Error('Invalid home answers.');
      state.homeProfile = home.profile;
    }
    return state;
  },
  applyState(state) {
    state.bills.forEach((bill, i) => {
      document.getElementById(`bill-kwh-${i}`).value = bill.kwh ?? '';
      document.getElementById(`bill-cost-${i}`).value = bill.cost ?? '';
    });
    for (const [key, value] of Object.entries(state.plan)) form.elements[key].value = value ?? '';
    exampleFields.clear();
    for (const id of state.exampleFields) exampleFields.add(id);
    document.querySelector('#save-home-profile').checked = Object.hasOwn(state, 'homeProfile');
    homeQuestionnaire.restore(state.homeProfile);
    render();
    renderReview();
  },
});
document.querySelector('#save-home-profile').addEventListener('change', () => progressControl.refresh());
