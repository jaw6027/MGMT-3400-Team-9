const worksheet = document.querySelector('#energy-worksheet');
const summary = document.querySelector('#worksheet-summary');
const error = document.querySelector('#worksheet-error');
const form = document.querySelector('#consultation-form');
const fields = document.querySelector('#consultation-fields');
const gate = document.querySelector('#consultation-gate');
const context = document.querySelector('#consultation-context');
const addressField = document.querySelector('#address-field');
const addressInput = document.querySelector('#consultation-address');
const worksheetAddress = document.querySelector('#worksheet-home-address');
const worksheetOwnership = document.querySelector('#worksheet-ownership');
const worksheetGoals = document.querySelector('#worksheet-goals');
let lastWorksheetGoalsApplied = '';
let reviewed = null;
let lastError = null;
let completedRequest = null;

function updateAddressField() {
  const inPerson = form.querySelector('input[name="consultation"]:checked').value === 'in person';
  addressField.hidden = !inPerson;
  addressInput.disabled = !inPerson;
  addressInput.required = inPerson;
}
form.querySelectorAll('input[name="consultation"]').forEach(input => input.addEventListener('change',updateAddressField));
form.addEventListener('reset',() => queueMicrotask(updateAddressField));
updateAddressField();

function displayError() {
  if (!lastError) return;
  const params = lastError.index === undefined ? {} : {month:SiteLanguage.month(lastError.index)};
  error.textContent = SiteLanguage.t(lastError.key,params);
}
function displaySummary() {
  if (!reviewed) return;
  const {t,number,money,month} = SiteLanguage;
  document.querySelector('#summary-home-address').textContent = reviewed.address;
  const ownershipKeys = {own:'ownershipOwn',rent:'ownershipRent',other:'ownershipOther'};
  document.querySelector('#summary-ownership').textContent = t(ownershipKeys[reviewed.ownership] || 'notProvided');
  document.querySelector('#summary-goals').textContent = reviewed.goals || t('notProvided');
  document.querySelector('#month-coverage').textContent = t(reviewed.count === 12 ? 'completeCoverage' : 'coverage',{count:reviewed.count,missing:12-reviewed.count});
  document.querySelector('#total-usage').textContent = `${number(reviewed.usage)} kWh`;
  document.querySelector('#total-cost').textContent = money(reviewed.cost);
  document.querySelector('#month-flags').replaceChildren(...reviewed.entries.map((entry,index) => {
    const item = document.createElement('li');
    const missing = entry.usage === null;
    item.className = missing ? 'month-missing' : 'month-entered';
    item.textContent = t(missing?'missing':'entered',{month:month(index),usage:missing?'':number(entry.usage),cost:missing?'':money(entry.cost)});
    return item;
  }));
  context.textContent = t('context',{count:reviewed.count,usage:number(reviewed.usage),cost:money(reviewed.cost)});
}
function displayConfirmation() {
  if (!completedRequest) return;
  const {t,number,money} = SiteLanguage;
  document.querySelector('#form-result').textContent = t('confirmation',{
    type:t(completedRequest.type === 'phone' ? 'phoneType' : 'personType'),
    count:completedRequest.count,usage:number(completedRequest.usage),cost:money(completedRequest.cost)
  });
}
document.addEventListener('customer-language-change',() => {
  displayError();displaySummary();displayConfirmation();
});

function invalidateSummary() {
  reviewed = null;lastError = null;completedRequest = null;
  summary.hidden = true;error.hidden = true;
  fields.disabled = true;fields.hidden = true;
  gate.hidden = false;context.hidden = true;
  document.querySelector('#form-result').hidden = true;
}
worksheet.addEventListener('input',invalidateSummary);
worksheet.addEventListener('change',invalidateSummary);
worksheet.addEventListener('reset',() => {invalidateSummary();form.reset();});
worksheet.addEventListener('submit',event => {
  event.preventDefault();invalidateSummary();
  const entries = Array.from({length:12},(_,index) => ({index,usage:document.querySelector(`#usage-${index}`),cost:document.querySelector(`#cost-${index}`)}));
  function showError(key,input,index) {
    lastError = {key,index};displayError();error.hidden = false;input.focus();
  }
  if (!worksheetAddress.value.trim()) {
    showError('addressRequired',worksheetAddress);return;
  }
  for (const entry of entries) {
    for (const input of [entry.usage,entry.cost]) {
      if (!input.validity.valid) {showError('rangeError',input,entry.index);return;}
    }
    if ((entry.usage.value === '') !== (entry.cost.value === '')) {
      showError('pairError',entry.usage.value === '' ? entry.usage : entry.cost,entry.index);return;
    }
  }
  const included = entries.filter(entry => entry.usage.value !== '');
  if (!included.length) {showError('emptyError',entries[0].usage);return;}
  // Sum hundredths to preserve decimal bill amounts precisely.
  const usage = included.reduce((sum,e) => sum+Math.round(Number(e.usage.value)*100),0)/100;
  const cost = included.reduce((sum,e) => sum+Math.round(Number(e.cost.value)*100),0)/100;
  reviewed = {address:worksheetAddress.value.trim(),ownership:worksheetOwnership.value,goals:worksheetGoals.value.trim(),count:included.length,usage,cost,entries:entries.map(e => ({usage:e.usage.value === '' ? null : Number(e.usage.value),cost:e.cost.value === '' ? null : Number(e.cost.value)}))};
  displaySummary();summary.hidden = false;summary.focus();
});
document.querySelector('#request-from-summary').addEventListener('click',() => {
  if (!reviewed) return;
  addressInput.value = reviewed.address;
  const message = form.querySelector('[name="message"]');
  if (!message.value || message.value === lastWorksheetGoalsApplied) {
    message.value = reviewed.goals;
    lastWorksheetGoalsApplied = reviewed.goals;
  }
  gate.hidden = true;displaySummary();context.hidden = false;
  fields.hidden = false;fields.disabled = false;
  document.querySelector('#consultation').scrollIntoView({behavior:'instant',block:'start'});
  form.querySelector('input[name="consultation"]').focus({preventScroll:true});
});
form.addEventListener('submit',event => {
  event.preventDefault();
  if (!reviewed || fields.disabled) {worksheet.scrollIntoView({behavior:'instant'});return;}
  if (!form.reportValidity()) return;
  completedRequest = {count:reviewed.count,usage:reviewed.usage,cost:reviewed.cost,type:new FormData(form).get('consultation')};
  displayConfirmation();form.reset();
  const result = document.querySelector('#form-result');result.hidden = false;result.focus();
});
