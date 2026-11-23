// Commission values are stored as integer cents. Estimates are never cash received.
const CRM = (() => {
  const stages = ['New lead', 'Contacted', 'Consultation scheduled', 'Referred to installer', 'Installation in progress', 'Closed won', 'Closed lost'];
  const salespeople = ['Unassigned', ...[1,2,3,4].map(n => `Group 9 · Team member ${n}`)];
  const leadSources = ['Unknown', 'Website', 'Friend / customer referral', 'Social media', 'Community event', 'Door-to-door', 'Other'];
  const lostReasons = ['Price / financing', 'Not ready', 'Property / roof suitability', 'Chose another provider', 'Could not reach', 'Other'];
  const isOpen = record => !['Closed won', 'Closed lost'].includes(record.stage);
  const openEstimate = record => isOpen(record) ? Math.max(0, record.estimated - record.earned) : 0;
  function summarize(records) {
    const result = { deals: records.length, openDeals: 0, estimated: 0, earned: 0, paid: 0, unpaid: 0, potential: 0 };
    for (const record of records) {
      if (isOpen(record)) result.openDeals++;
      result.estimated += openEstimate(record);
      result.earned += record.earned;
      result.paid += record.paid;
    }
    result.unpaid = result.earned - result.paid;
    result.potential = result.estimated + result.unpaid;
    return result;
  }
  function parseMoney(value) {
    if (!/^\d+(\.\d{1,2})?$/.test(String(value)) || Number(value) > 1000000) return NaN;
    return Math.round(Number(value) * 100);
  }
  function validate(record) {
    if (!stages.includes(record.stage) || !salespeople.includes(record.salesperson)) return 'Choose a valid pipeline stage and salesperson.';
    if ([record.estimated, record.earned, record.paid].some(value => !Number.isSafeInteger(value) || value < 0)) return 'Enter a nonnegative dollar amount with up to two decimal places in each commission field.';
    if (record.paid > record.earned) return 'Paid commission cannot exceed earned commission. Update the earned amount first if needed.';
    if (record.stage === 'Closed lost' && !lostReasons.includes(record.lostReason)) return 'Select a lost reason so the team can learn from this prospect.';
    return '';
  }
  function validatePayment(payment, payments, earned, editId) {
    if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0) return 'Enter a payment greater than zero with up to two decimal places.';
    if (!payment.date || !payment.payer.trim()) return 'Enter the received date and payer for this payment.';
    const total = payments.filter(p => p.id !== editId).reduce((sum,p) => sum + p.amount, 0) + payment.amount;
    return total > earned ? 'This payment would make total received exceed earned commission. Check the payment or update earned commission first.' : '';
  }
  return { stages, salespeople, leadSources, lostReasons, isOpen, openEstimate, summarize, parseMoney, validate, validatePayment };
})();
if (typeof module !== 'undefined') module.exports = CRM;
