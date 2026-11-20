export const defaults = {
  monthlyKwh: 1000, rate: 0.18, efficiency: 15, solarKw: 6,
  sunHours: 4.5, performance: 80, selfUse: 70, exportRate: 0.05,
  solarCost: 18000, upgradeCost: 1200, incentive: 0, annualCost: 180,
  monthlyFee: 0,
};

export function estimate(input) {
  const v = { ...defaults, ...input };
  for (const [key, value] of Object.entries(v)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a nonnegative number.`);
  }
  for (const key of ['efficiency', 'performance', 'selfUse']) {
    if (v[key] > 100) throw new Error(`${key} cannot exceed 100%.`);
  }
  const annualUsage = v.monthlyKwh * 12;
  const baseline = annualUsage * v.rate;
  const reducedUsage = annualUsage * (1 - v.efficiency / 100);
  const efficiencySavings = (annualUsage - reducedUsage) * v.rate;
  const production = v.solarKw * v.sunHours * 365 * v.performance / 100;
  const solarUsed = Math.min(production * v.selfUse / 100, reducedUsage);
  const exports = production - solarUsed;
  const gridKwh = reducedUsage - solarUsed;
  const importCost = gridKwh * v.rate;
  const exportCredit = exports * v.exportRate;
  const solarSavings = solarUsed * v.rate + exportCredit;
  const operatingCost = v.annualCost + v.monthlyFee * 12;
  const annualSavings = efficiencySavings + solarSavings - operatingCost;
  const annualAfter = importCost - exportCredit + operatingCost;
  const grossCost = v.solarCost + v.upgradeCost;
  const appliedIncentive = Math.min(v.incentive, grossCost);
  const netCost = grossCost - appliedIncentive;
  const payback = netCost === 0 ? 0 : annualSavings > 0 ? netCost / annualSavings : null;
  return { annualUsage, baseline, reducedUsage, efficiencySavings, production, solarUsed,
    exports, gridKwh, importCost, exportCredit, solarSavings, operatingCost, annualSavings,
    annualAfter, grossCost, appliedIncentive, netCost, payback,
    gridReduction: annualUsage ? (annualUsage - gridKwh) / annualUsage * 100 : 0 };
}

export function compareCosts(review, input = {}) {
  if (!review || !Number.isFinite(review.annualKwh) || !Number.isFinite(review.annualCost) ||
      review.annualKwh < 0 || review.annualCost < 0) {
    throw new Error('A complete nonnegative annual bill review is required.');
  }
  const assumptions = { ...defaults, ...input, monthlyKwh: review.annualKwh / 12 };
  const solar = estimate({ ...assumptions, efficiency: 0 });
  const combined = estimate(assumptions);
  if (review.annualKwh === 0) return { available: false, reason: 'zero-usage' };
  const remainder = review.annualCost - solar.baseline;
  // A negative remainder would invent negative retained utility charges.
  if (remainder < -1e-8) return { available: false, reason: 'rate-exceeds-bills' };
  const retainedCharges = Math.max(0, remainder);
  const result = scenario => ({ ...scenario,
    projectedAnnualCost: review.annualCost - scenario.annualSavings,
    projectedMonthlyCost: (review.annualCost - scenario.annualSavings) / 12,
    savingsPercent: review.annualCost > 0 ? scenario.annualSavings / review.annualCost * 100 : null,
  });
  return { available: true, annualCost: review.annualCost, monthlyCost: review.annualCost / 12,
    retainedCharges, assumptions, solar: result(solar), combined: result(combined) };
}

// Educational examples are independent of the homeowner's saved inputs.
export function solarExampleHomes() {
  const assumptions = { rate: 0.18, sunHours: 4.5, performance: 80, selfUse: 100,
    exportRate: 0, efficiency: 0, annualCost: 0, monthlyFee: 0 };
  const homes = [
    { id: 'low', label: 'Low-use example', monthlyKwh: 400, solarKw: 2,
      option: 'Compare a small solar system with efficiency improvements alone. Installation costs may outweigh the benefit for a low-use home.' },
    { id: 'medium', label: 'Medium-use example', monthlyKwh: 900, solarKw: 5,
      option: 'Explore rooftop solar and scheduling flexible appliances during sunny hours. Confirm actual use during daylight.' },
    { id: 'high', label: 'High-use example', monthlyKwh: 1600, solarKw: 8,
      option: 'Review major loads and efficiency first, then size solar for the remaining demand. Roof area and installation costs still matter.' },
  ].map(home => {
    const result = estimate({ ...assumptions, monthlyKwh: home.monthlyKwh, solarKw: home.solarKw });
    return { ...home, monthlyGeneration: result.production / 12, before: result.baseline / 12,
      after: result.annualAfter / 12, difference: result.annualSavings / 12 };
  });
  return { assumptions, homes };
}
