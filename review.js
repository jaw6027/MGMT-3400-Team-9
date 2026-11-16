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
