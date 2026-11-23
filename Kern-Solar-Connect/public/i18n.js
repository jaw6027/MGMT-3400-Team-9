const SiteLanguage = (() => {
  const locales = {en:'en-US',es:'es-US',pa:'pa-Guru-IN',tl:'fil-PH',ar:'ar',vi:'vi-VN'};
  const htmlLanguages = {en:'en',es:'es',pa:'pa-Guru',tl:'fil',ar:'ar',vi:'vi'};
  let language = 'en';
  const picker = document.querySelector('#site-language');
  const textNodes = [];
  const attributes = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('script, style, svg, noscript, .language-picker')) continue;
    const original = node.nodeValue;
    const key = original.trim();
    if (Object.hasOwn(CustomerCopy.phrases.en, key)) textNodes.push({node,key,original});
  }
  for (const element of document.querySelectorAll('[placeholder], [aria-label], [title], [alt], meta[name="description"]')) {
    for (const name of ['placeholder','aria-label','title','alt','content']) {
      const key = element.getAttribute(name);
      if (key && Object.hasOwn(CustomerCopy.phrases.en,key)) attributes.push({element,name,key});
    }
  }
  function t(key, params = {}) {
    const template = CustomerCopy.ui[language][key] ?? CustomerCopy.ui.en[key] ?? key;
    return template.replace(/\{(\w+)\}/g, (match,name) => params[name] ?? match);
  }
  function number(value) { return new Intl.NumberFormat(locales[language],{maximumFractionDigits:2}).format(value); }
  function money(value) { return new Intl.NumberFormat(locales[language],{style:'currency',currency:'USD'}).format(value); }
  function month(index) { return CustomerCopy.months[language][index]; }
  function setLanguage(next, save = true) {
    language = Object.hasOwn(locales,next) ? next : 'en';
    document.documentElement.lang = htmlLanguages[language];
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    picker.value = language;
    for (const item of textNodes) {
      // Replace only the original text node, preserving labels, icons, inputs, and focus.
      item.node.nodeValue = item.original.replace(item.key, () => CustomerCopy.phrases[language][item.key]);
    }
    for (const item of attributes) item.element.setAttribute(item.name,CustomerCopy.phrases[language][item.key]);
    document.querySelector('#site-language-label').textContent = t('languageLabel');
    picker.setAttribute('aria-label',t('language'));
    document.querySelector('#number-format-help').textContent = t('numberHelp');
    document.querySelectorAll('input, textarea').forEach(input => input.setCustomValidity(''));
    if (save) {
      try { localStorage.setItem('kern-customer-language',language); } catch { /* Preference storage is optional. */ }
      document.querySelector('#language-status').textContent = t('changed');
    }
    document.dispatchEvent(new CustomEvent('customer-language-change'));
  }
  picker.addEventListener('change',() => setLanguage(picker.value));
  // Native validation bubbles should use the selected page language, not the browser language.
  document.addEventListener('invalid',event => {
    const input = event.target;
    if (!input.matches('input, textarea')) return;
    input.setCustomValidity('');
    const validity = input.validity;
    const key = validity.valueMissing ? 'required' : validity.typeMismatch && input.type === 'email' ? 'emailError' : input.type === 'number' ? 'numberError' : 'invalid';
    input.setCustomValidity(t(key));
  },true);
  document.addEventListener('input',event => { if (event.target.matches('input, textarea')) event.target.setCustomValidity(''); });
  let initial;
  try { initial = new URLSearchParams(location.search).get('lang') || localStorage.getItem('kern-customer-language'); } catch { initial = 'en'; }
  setLanguage(initial || 'en',false);
  return {t,number,money,month,setLanguage,get language(){return language;}};
})();
