import { defaults, estimate } from './energy.js';

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
