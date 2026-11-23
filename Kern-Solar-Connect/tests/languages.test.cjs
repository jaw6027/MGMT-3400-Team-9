const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const scope = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/translations.js'),'utf8')+'; globalThis.copy=CustomerCopy;',scope);
const copy = scope.copy;
const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).sort().join(',');

test('all six languages cover the same customer copy, accessible labels, and dynamic messages', () => {
  assert.equal(Object.keys(copy.phrases).length,6);
  for(const language of ['en','es','pa','tl','ar','vi']) {
    assert.deepEqual(Object.keys(copy.phrases[language]).sort(),Object.keys(copy.phrases.en).sort());
    assert.deepEqual(Object.keys(copy.ui[language]).sort(),Object.keys(copy.ui.en).sort());
    assert.equal(copy.months[language].length,12);
    for(const text of Object.values(copy.phrases[language])) assert.ok(text.trim());
    for(const key of Object.keys(copy.ui.en)) assert.equal(placeholders(copy.ui[language][key]),placeholders(copy.ui.en[key]),`${language}: ${key}`);
  }
});
test('worksheet months, labels, and key warnings have translations in every language', () => {
  for(const language of ['es','pa','tl','ar','vi']) {
    assert.notEqual(copy.phrases[language]['Home energy usage worksheet'],'Home energy usage worksheet');
    assert.notEqual(copy.phrases[language]['January usage (kWh)'],'January usage (kWh)');
    assert.notEqual(copy.phrases[language]['Consultation address'],'Consultation address');
    assert.notEqual(copy.ui[language].pairError,copy.ui.en.pairError);
    assert.notEqual(copy.ui[language].confirmation,copy.ui.en.confirmation);
  }
});
