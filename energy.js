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
