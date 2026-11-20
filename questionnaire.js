const yesNoUnknown = [['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']];
const withUnknown = options => [...options, ['unknown', 'Not sure']];
export const homeQuestionGroups = [
  { title: 'Home & household', questions: [
    { id: 'homeType', label: 'Type of home', options: withUnknown([['detached', 'Detached house'], ['attached', 'Townhouse / attached house'], ['apartment', 'Condo / apartment']]) },
    { id: 'area', label: 'Approximate floor area (square feet)', min: 1, max: 100000, help: 'Leave blank if you do not know. An estimate is fine.' },
    { id: 'homeAge', label: 'Approximate age of the home (years)', min: 0, max: 300 },
    { id: 'floors', label: 'Number of floors', options: withUnknown([['one', 'One'], ['two', 'Two'], ['three-plus', 'Three or more']]) },
    { id: 'residents', label: 'Number of people living here', min: 1, max: 50 },
    { id: 'daytime', label: 'Is someone usually home during the day?', options: withUnknown([['usually', 'Usually'], ['sometimes', 'Sometimes'], ['rarely', 'Rarely']]) },
    { id: 'ownership', label: 'Your connection to the home', options: withUnknown([['owner', 'Owner'], ['renter', 'Renter'], ['other', 'Other / helping someone']]) },
  ] },
  { title: 'Heating, cooling & comfort', questions: [
    { id: 'heating', label: 'Main heating system', options: withUnknown([['resistance', 'Electric furnace / baseboards'], ['heat-pump', 'Heat pump'], ['gas', 'Natural gas'], ['other-fuel', 'Oil / propane / other fuel'], ['none', 'No heating system']]) },
    { id: 'hvacAge', label: 'Heating / cooling equipment age', options: withUnknown([['under-ten', 'Under 10 years'], ['ten-fourteen', '10–14 years'], ['fifteen-plus', '15 years or more']]) },
    { id: 'cooling', label: 'Main cooling system', options: withUnknown([['central', 'Central air conditioning'], ['room', 'Window / portable units'], ['heat-pump', 'Heat pump'], ['none', 'No air conditioning']]) },
    { id: 'heatingTemp', label: 'Usual heating setting (°F)', min: 40, max: 90, help: 'Optional. Do not change a setting that is needed for health or comfort.' },
    { id: 'coolingTemp', label: 'Usual cooling setting (°F)', min: 50, max: 100 },
    { id: 'insulation', label: 'How is the insulation?', options: withUnknown([['good', 'Good / recently checked'], ['mixed', 'Mixed / some rooms uncomfortable'], ['poor', 'Poor / improvement needed']]) },
    { id: 'drafts', label: 'Do you notice drafts or air leaks?', options: yesNoUnknown },
    { id: 'windows', label: 'Window glazing', options: withUnknown([['single', 'Single pane'], ['multiple', 'Double / triple pane'], ['mixed', 'A mixture']]) },
  ] },
  { title: 'Appliances, lighting & controls', questions: [
    { id: 'waterHeating', label: 'Water heater type', options: withUnknown([['resistance', 'Standard electric tank'], ['heat-pump', 'Heat-pump water heater'], ['gas', 'Gas / other fuel'], ['solar', 'Solar water heating']]) },
    { id: 'applianceAge', label: 'Age of major appliances', options: withUnknown([['newer', 'Mostly under 10 years'], ['mixed', 'Mixed ages'], ['older', 'Mostly 10+ years']]) },
    { id: 'extraFreezer', label: 'Extra refrigerator or freezer?', options: yesNoUnknown },
    { id: 'laundry', label: 'Laundry loads per week', options: withUnknown([['few', '0–2'], ['medium', '3–6'], ['many', '7 or more']]) },
    { id: 'dryer', label: 'How do you usually dry laundry?', options: withUnknown([['electric', 'Electric dryer'], ['gas', 'Gas dryer'], ['air', 'Air dry / clothesline']]) },
    { id: 'cooking', label: 'Cooking equipment', options: withUnknown([['electric', 'Electric / induction'], ['gas', 'Gas'], ['mixed', 'A mixture']]) },
    { id: 'lighting', label: 'How much lighting uses LED bulbs?', options: withUnknown([['most', 'All / most'], ['some', 'Some'], ['few', 'Few / none']]) },
    { id: 'smartThermostat', label: 'Do you have a smart thermostat?', options: yesNoUnknown },
    { id: 'standby', label: 'Electronics and plug-in devices', options: withUnknown([['usually-off', 'Usually off when unused'], ['often-on', 'Often left on / in standby']]) },
  ] },
  { title: 'Electric vehicles & other large loads', questions: [
    { id: 'ev', label: 'Electric vehicles charged at home', options: withUnknown([['none', 'None'], ['one', 'One'], ['multiple', 'Two or more']]) },
    { id: 'evCharging', label: 'When do you usually charge?', options: withUnknown([['day', 'Daytime'], ['night', 'Overnight'], ['mixed', 'Varies'], ['na', 'Not applicable']]) },
    { id: 'pool', label: 'Pool pump or pool heater?', options: yesNoUnknown },
    { id: 'hotTub', label: 'Electric hot tub or spa?', options: yesNoUnknown },
    { id: 'spaceHeaters', label: 'Portable electric space heaters', options: withUnknown([['never', 'Never / do not have any'], ['sometimes', 'Sometimes'], ['often', 'Often']]) },
  ] },
  { title: 'Roof, existing solar & installation checks', questions: [
    { id: 'existingSolar', label: 'Does this home already have solar panels?', options: yesNoUnknown, help: 'Existing solar changes how utility bills should be interpreted.' },
    { id: 'roofAge', label: 'Approximate roof age (years)', min: 0, max: 100 },
    { id: 'roofCondition', label: 'Roof condition', options: withUnknown([['good', 'Good / recently checked'], ['repair', 'Repairs may be needed'], ['replace', 'Replacement planned / needed']]) },
    { id: 'shade', label: 'Shade on the roof', options: withUnknown([['little', 'Little / no shade'], ['some', 'Some shade'], ['heavy', 'Heavy shade']]) },
    { id: 'roofDirection', label: 'Main roof direction', options: withUnknown([['south', 'South'], ['east-west', 'East / west'], ['north', 'North'], ['mixed', 'Multiple directions']]) },
    { id: 'solarPermission', label: 'Permission to install rooftop solar?', options: withUnknown([['yes', 'Yes / confirmed'], ['no', 'No / approval still needed']]) },
    { id: 'electricalPanel', label: 'Electrical panel readiness', options: withUnknown([['reviewed', 'A professional has reviewed it'], ['upgrade', 'A professional says an upgrade is needed']]), help: 'Do not open or inspect electrical equipment yourself. Not sure is fine.' },
  ] },
  { title: 'Local conditions & your priorities', questions: [
    { id: 'climate', label: 'Typical climate at your home', options: withUnknown([['cold', 'Mostly a heating climate'], ['hot', 'Mostly a cooling climate'], ['mixed', 'Both hot and cold seasons'], ['mild', 'Mostly mild']]) },
    { id: 'utilityPlan', label: 'Electricity pricing plan', options: withUnknown([['flat', 'Same price throughout the day'], ['time-of-use', 'Price changes by time of day']]) },
    { id: 'estimatedBills', label: 'Do any bills use estimated meter readings?', options: yesNoUnknown },
    { id: 'householdChanges', label: 'Did household size or routines change during the bill year?', options: yesNoUnknown },
    { id: 'goal', label: 'Your main priority', options: withUnknown([['bills', 'Lower bills'], ['comfort', 'More comfortable rooms'], ['solar', 'Explore solar'], ['backup', 'Backup power during outages']]) },
    { id: 'budget', label: 'Optional budget for improvements', options: [['small', 'Under $2,500'], ['medium', '$2,500–$10,000'], ['larger', 'Over $10,000'], ['unknown', 'Not sure / prefer not to say']] },
  ] },
];
const allHomeQuestions = homeQuestionGroups.flatMap(group => group.questions);

export function normalizeHomeProfile(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid home questionnaire.');
  return Object.fromEntries(allHomeQuestions.map(question => {
    const value = raw[question.id] ?? (question.options ? '' : null);
    if (question.options) {
      if (value !== '' && !question.options.some(([code]) => code === value)) throw new Error('Invalid questionnaire choice.');
    } else if (value !== null && (typeof value !== 'number' || !Number.isInteger(value) || value < question.min || value > question.max)) {
      throw new Error('Invalid questionnaire number.');
    }
    return [question.id, value];
  }));
}

export function homeProfileRows(raw) {
  const profile = normalizeHomeProfile(raw);
  return allHomeQuestions.filter(question => profile[question.id] !== '' && profile[question.id] !== null).map(question => [
    question.label,
    question.options ? question.options.find(([code]) => code === profile[question.id])[1] : String(profile[question.id]),
  ]);
}

export function homeSolarCaution(raw) {
  const profile = normalizeHomeProfile(raw);
  const checks = [];
  if (['repair', 'replace'].includes(profile.roofCondition)) checks.push('roof repairs or replacement');
  if (profile.shade === 'heavy') checks.push('heavy roof shade');
  if (profile.solarPermission === 'no') checks.push('installation permission');
  if (profile.electricalPanel === 'upgrade') checks.push('an electrical-panel upgrade');
  return checks.length ? `Your questionnaire flags ${checks.join(', ')}. Resolve these with a qualified provider before choosing rooftop solar. The cost estimate does not account for these conditions.` : '';
}

export function tailorHomeRecommendation(base, raw) {
  const profile = normalizeHomeProfile(raw);
  const result = { ...base, services: [...base.services], homeInsights: [], homeFollowups: [] };
  if (!homeProfileRows(profile).length) return result;
  const add = text => result.homeInsights.push(text);
  if (profile.estimatedBills === 'yes') add('You reported estimated meter readings. Compare them with actual readings through your utility before treating bill patterns as representative.');
  if (profile.householdChanges === 'yes') add('Household routines changed during the bill year. Choose representative usage before sizing a future system.');
  if (profile.heating === 'resistance') add('You reported electric resistance heating. Ask an assessor to compare controls, insulation, and heat-pump options for your climate; savings are not established by this answer alone.');
  if (profile.waterHeating === 'resistance') add('A standard electric water heater is reported. Discuss hot-water demand, maintenance, and efficient replacement options when appropriate.');
  if (profile.lighting === 'few') add('Few or no LED bulbs are reported. Review frequently used lights for suitable LED replacements.');
  if (profile.applianceAge === 'older' || profile.extraFreezer === 'yes') add('Review appliance condition and extra refrigeration use before replacing working equipment.');
  if (['one', 'multiple'].includes(profile.ev)) add(`You charge an electric vehicle at home${profile.evCharging === 'night' ? ' overnight' : ''}. Review charging schedules against utility prices and solar production; charging demand is not automatically waste.`);
  if (profile.pool === 'yes' || profile.hotTub === 'yes') add('A pool or spa is reported. Review pump and heating schedules while keeping equipment and water-care requirements in place.');
  if (profile.utilityPlan === 'time-of-use') add('Your rate changes by time of day. The current single-rate annual calculator cannot model that tariff; obtain a time-based analysis before relying on the savings estimate.');
  if (profile.goal === 'backup') add('Backup power is a priority. Standard solar alone may shut down during outages; discuss a compatible battery or backup system. Battery costs are excluded from this calculator.');
  if (profile.goal === 'comfort') add('Comfort is your priority. Ask for a room-by-room review of temperature differences, controls, insulation, and air leaks.');
  if (profile.budget === 'small') add('You selected a budget under $2,500. Ask for a staged, itemized plan; this does not establish that a solar installation fits that budget.');
  if (['unknown', ''].includes(profile.hvacAge)) result.homeFollowups.push('Confirm heating/cooling equipment age and condition.');
  if (['unknown', ''].includes(profile.roofCondition) || ['unknown', ''].includes(profile.shade)) result.homeFollowups.push('Have an installer verify roof condition, usable area, and shade.');
  if (['unknown', ''].includes(profile.solarPermission)) result.homeFollowups.push('Confirm ownership, landlord, or association approvals for rooftop work.');
  if (base.kind === 'verify') return result;
  if (profile.insulation === 'poor' || profile.drafts === 'yes') {
    result.title = 'Check drafts and insulation before sizing upgrades';
    result.opportunity = 'You reported poor insulation or drafts. Start with an inspection of air leaks, insulation, and room comfort so your home may need less heating and cooling. The inspection must confirm the cause and suitable improvements.';
    result.evidence += ' Your questionnaire reports insulation or air-leak concerns; these have not been independently verified.';
    result.services.unshift('Inspect reported insulation and draft concerns');
  } else if (profile.hvacAge === 'fifteen-plus' || profile.spaceHeaters === 'often') {
    result.title = 'Review heating and cooling performance';
    result.opportunity = 'You reported older heating/cooling equipment or frequent space-heater use. Review equipment condition, controls, and room comfort with an assessor before choosing a replacement.';
    result.services.unshift('Review reported equipment age and supplemental heating');
  }
  const caution = homeSolarCaution(profile);
  if (caution) {
    result.packageName = 'Efficiency First + Solar Feasibility Review';
    result.why = 'Your home details raise installation questions that a favorable cost estimate cannot resolve. Prioritize efficiency and feasibility checks before committing to solar.';
    result.solarNote = caution;
  }
  if (profile.existingSolar === 'yes') {
    result.packageName = 'Existing Solar & Efficiency Review';
    result.why = 'Your home already has solar. Review generation, imported/exported electricity, equipment, and efficiency together before planning an expansion.';
    result.solarNote = 'The current bill comparison assumes a home without solar, so it is not used for this existing-solar home. An assessor needs generation and import/export records.';
  }
  if (!result.homeInsights.length) add('Bring these home details to the assessment. They provide context, but do not identify exact appliance loads or establish savings.');
  result.services = [...new Set(result.services)];
  return result;
}

export function setupHomeQuestionnaire(onChange) {
  const homeForm = document.querySelector('#home-questionnaire-form');
  const groups = document.querySelector('#home-questionnaire-groups');
  const controls = new Map();
  homeQuestionGroups.forEach((group, index) => {
    const details = document.createElement('details');
    details.className = 'home-question-group';
    details.open = index === 0;
    const summary = document.createElement('summary');
    summary.textContent = `${index + 1}. ${group.title}`;
    const grid = document.createElement('div');
    grid.className = 'field-grid';
    for (const question of group.questions) {
      const label = document.createElement('label');
      label.htmlFor = `home-${question.id}`;
      label.textContent = question.label;
      const input = document.createElement(question.options ? 'select' : 'input');
      input.id = label.htmlFor;
      input.name = question.id;
      if (question.options) {
        input.add(new Option('Choose an answer (optional)', ''));
        for (const [value, text] of question.options) input.add(new Option(text, value));
      } else {
        input.type = 'number'; input.min = question.min; input.max = question.max; input.step = '1'; input.placeholder = 'Not sure? Leave blank';
      }
      label.append(input);
      if (question.help) {
        const hint = document.createElement('span');
        hint.className = 'field-help'; hint.id = `${input.id}-help`; hint.textContent = question.help;
        input.setAttribute('aria-describedby', hint.id); label.append(hint);
      }
      controls.set(question.id, input); grid.append(label);
    }
    details.append(summary, grid); groups.append(details);
  });
  function read() {
    const raw = {};
    const invalid = [];
    for (const question of allHomeQuestions) {
      const input = controls.get(question.id);
      if (question.options) raw[question.id] = input.value;
      else if (!input.validity.valid) { raw[question.id] = null; invalid.push(question.label); }
      else raw[question.id] = input.value === '' ? null : input.valueAsNumber;
    }
    return { profile: normalizeHomeProfile(raw), invalid };
  }
  function refresh() {
    const { profile, invalid } = read();
    const rows = homeProfileRows(profile);
    const unsure = Object.values(profile).filter(value => value === 'unknown').length;
    document.querySelector('#home-questionnaire-status').textContent = `${rows.length} of ${allHomeQuestions.length} questions answered${unsure ? `; ${unsure} marked Not sure` : ''}. ${invalid.length ? `Correct these numbers: ${invalid.join(', ')}. Invalid values are not used.` : 'Skipped and Not sure answers become follow-up questions, not assumed facts.'}`;
    const dl = document.querySelector('#home-questionnaire-summary');
    dl.replaceChildren(...rows.map(([label, value]) => {
      const pair = document.createElement('div');
      const dt = document.createElement('dt'); const dd = document.createElement('dd');
      dt.textContent = label; dd.textContent = value; pair.append(dt, dd); return pair;
    }));
    document.querySelector('#home-profile-summary-panel').hidden = rows.length === 0;
    document.querySelector('#home-questionnaire').classList.toggle('has-home-answers', rows.length > 0);
  }
  homeForm.addEventListener('submit', event => event.preventDefault());
  homeForm.addEventListener('input', () => { refresh(); onChange(); });
  document.querySelector('#clear-home-questionnaire').addEventListener('click', () => { homeForm.reset(); refresh(); onChange(); });
  refresh();
  return {
    read,
    restore(profile = {}) {
      const clean = normalizeHomeProfile(profile);
      for (const [id, input] of controls) input.value = clean[id] ?? '';
      refresh();
    },
  };
}
