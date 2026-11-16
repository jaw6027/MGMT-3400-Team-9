export const months = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function reviewEnergy(entries) {
  if (!Array.isArray(entries) || entries.length !== 12) {
    throw new Error('Enter usage and bill cost for all 12 months.');
  }
  for (const entry of entries) {
    if (!entry || !Number.isFinite(entry.kwh) || !Number.isFinite(entry.cost) ||
        entry.kwh < 0 || entry.cost < 0) {
      throw new Error('Every month needs nonnegative numeric usage and bill cost.');
    }
  }
  const annualKwh = entries.reduce((total, entry) => total + entry.kwh, 0);
  const annualCost = entries.reduce((total, entry) => total + entry.cost, 0);
  const averageKwh = annualKwh / 12;
  const peakKwh = Math.max(...entries.map(entry => entry.kwh));
  const peakCost = Math.max(...entries.map(entry => entry.cost));
  const peakMonths = peakKwh > 0 ? entries.flatMap((entry, i) => entry.kwh === peakKwh ? [months[i]] : []) : [];
  const costliestMonths = peakCost > 0 ? entries.flatMap((entry, i) => entry.cost === peakCost ? [months[i]] : []) : [];
  const highUsageMonths = entries.flatMap((entry, i) => entry.kwh > averageKwh * 1.2 ? [months[i]] : []);
  return { annualKwh, annualCost, averageKwh, averageCost: annualCost / 12,
    billedRate: annualKwh > 0 ? annualCost / annualKwh : null,
    peakKwh, peakCost, peakMonths, costliestMonths, highUsageMonths };
}

export function recommendEnergy(review, comparison = null) {
  if (!review || !Number.isFinite(review.annualKwh) || review.annualKwh < 0 ||
      !Number.isFinite(review.averageKwh) || !Number.isFinite(review.peakKwh) ||
      !Array.isArray(review.highUsageMonths)) {
    throw new Error('A completed homeowner energy review is required.');
  }
  if (review.annualKwh === 0) return {
    kind: 'verify', title: 'Start by checking your bill data',
    opportunity: 'All 12 entered months show zero electricity use. Verify the kWh values and meter or billing information before choosing equipment or estimating savings.',
    evidence: 'There is no recorded consumption to size an efficiency or solar project against.',
    packageName: 'Bill & Meter Review',
    why: 'A data check is the appropriate first step when consumption cannot yet be established.',
    services: ['Review bill units and meter readings', 'Check missing or estimated readings with the utility', 'Collect representative consumption before sizing upgrades'],
    solarNote: 'No solar suitability or energy-saving conclusion can be made from zero recorded use.',
  };
  const peaks = review.highUsageMonths.length > 0;
  const peakPercent = Math.round((review.peakKwh / review.averageKwh - 1) * 100);
  const favorableSolar = comparison?.available === true && comparison.solar.annualSavings > 0 && comparison.solar.solarUsed > 0;
  const recommendation = {
    kind: peaks ? 'peak' : 'steady',
    title: peaks ? 'Investigate your higher-use months first' : 'Look for savings in everyday electricity use',
    opportunity: peaks
      ? `Start with ${review.highUsageMonths.join(', ')}. Compare heating and cooling schedules, thermostat settings, weather, household activity, and billing-period length. An assessment can check equipment controls and insulation before recommending upgrades.`
      : 'Review everyday loads such as water heating, refrigeration, lighting, and devices left running. Monitoring and an appliance audit can help identify which changes are worth making.',
    evidence: peaks
      ? `These months are more than 20% above your monthly usage average. Your peak month is approximately ${peakPercent}% above average.`
      : 'None of your months is more than 20% above your average. This points to reviewing everyday loads, but does not prove that usage is efficient or identify a particular appliance.',
    packageName: peaks ? 'Smart Efficiency Starter' : 'Home Energy Essentials',
    why: peaks ? 'This package focuses on understanding usage peaks and checking practical efficiency improvements first.' : 'This package focuses on understanding recurring loads and prioritizing efficiency improvements.',
    services: peaks
      ? ['Heating and cooling schedule review', 'Insulation and air-leak inspection', 'Smart thermostat compatibility and controls assessment']
      : ['Appliance, lighting, and hot-water energy audit', 'Home energy monitoring compatibility review', 'Prioritized efficiency action plan'],
    solarNote: 'Solar generates electricity; it does not by itself reduce how much electricity appliances use. Confirm the solar assumptions and complete a roof and utility review before choosing a solar package.',
  };
  if (favorableSolar) {
    recommendation.packageName = 'Efficiency + Solar Assessment';
    recommendation.why = 'Your usage review supports starting with efficiency, and the current solar-only model shows positive ongoing savings. Assess both opportunities together before selecting equipment.';
    recommendation.services.push('Roof, shading, and electrical-panel suitability review', 'Utility export-rule check and itemized solar quote');
    recommendation.solarNote = 'Solar looks worth assessing under the current assumptions because modeled solar-only operating costs are lower than your bills. Installation costs and financing are excluded from that comparison; roof suitability, utility rules, and payback still need verification.';
  } else if (comparison?.available === true) {
    recommendation.solarNote = 'The current solar assumptions do not support a solar package recommendation: solar-only ongoing savings are not positive, or no solar power is used at home. Start with the efficiency review and revisit system size, costs, and utility rates with an assessor.';
  }
  return recommendation;
}
