import { months } from './review.js';

// Return only the three requested fields, never OCR text or account details.
export function parseBillText(text, confidence = 100) {
  const missing = label => ({ value: null, status: `Unreadable or not found — enter ${label}.` });
  const result = { month: missing('the billing month'), kwh: missing('usage in kWh'), cost: missing('the bill total') };
  if (typeof text !== 'string' || !text.trim() || !Number.isFinite(confidence) || confidence < 60) {
    if (confidence < 60) for (const field of Object.values(result)) field.status = 'Low reading confidence — check the original bill and enter this value.';
    return result;
  }
  const lines = text.replace(/\r/g, '').split('\n').map(line => line.trim()).filter(Boolean);
  const found = { month: new Set(), kwh: new Set(), cost: new Set() };
  const numeric = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d{1,2})?';
  const usageLabel = /\b(?:(?:total|electric|electricity|energy)\s+)*(?:usage|consumption|used)\b|\btotal\s+kwh\b|\bkwh\s+used\b/i;
  const totalLabel = /\b(?:total\s+amount\s+due|total\s+due|amount\s+due|total\s+bill|bill\s+total|total\s+cost|(?:total\s+)?current\s+charges)\b/i;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const excluded = /\b(?:previous|prior|last\s+(?:month|year)|history|meter\s+reading|account|export|generation|credit)\b/i.test(line);
    if (!excluded) {
      if (usageLabel.test(line)) {
        const quantities = [...line.matchAll(new RegExp(`(?:^|[^\\d.,-])(${numeric})\\s*kwh\\b`, 'gi'))];
        if (quantities.length > 1) for (const quantity of quantities) found.kwh.add(Number(quantity[1].replaceAll(',', '')));
        const tail = line.slice(line.search(usageLabel)).replace(usageLabel, '').replace(/^\s*\(kwh\)/i, '');
        const match = tail.match(new RegExp(`^\\s*[:=]?\\s*(?:kwh\\s*[:=]?\\s*)?(${numeric})\\s*(?:kwh\\b|$)`, 'i'));
        if (match) found.kwh.add(Number(match[1].replaceAll(',', '')));
        else if (!tail.replace(/[:\s]/g, '') && lines[i + 1]) {
          const next = lines[i + 1].match(new RegExp(`^(${numeric})\\s*kwh$`, 'i'));
          if (next) found.kwh.add(Number(next[1].replaceAll(',', '')));
        }
      } else if (!/\b(?:rate|charge|demand|per)\b|\//i.test(line)) {
        const match = line.match(new RegExp(`^(${numeric})\\s*kwh$`, 'i'));
        if (match) found.kwh.add(Number(match[1].replaceAll(',', '')));
      }
      if (totalLabel.test(line)) {
        const tail = line.slice(line.search(totalLabel)).replace(totalLabel, '');
        const valueLine = tail.replace(/[:\s]/g, '') ? tail : (lines[i + 1] || '');
        const match = valueLine.match(new RegExp(`^\\s*:?\\s*\\$?\\s*(${numeric})\\s*(?:USD)?\\s*$`, 'i'));
        if (match) found.cost.add(Number(match[1].replaceAll(',', '')));
      }
    }
    // Use explicitly labeled billing months or bill/statement dates, not due dates or service-period ranges.
    const date = line.match(/\b(?:billing\s+month|bill(?:ing)?\s+date|statement\s+date|statement\s+for)\s*:?\s*(.+)$/i);
    if (date && !excluded) {
      const value = date[1];
      const name = value.match(/^([a-z]+)\b/i);
      const monthIndex = name ? months.findIndex(month => month.toLowerCase().startsWith(name[1].toLowerCase()) && name[1].length >= 3) : -1;
      if (monthIndex >= 0) found.month.add(monthIndex);
      else {
        const iso = value.match(/^\d{4}-(\d{2})-\d{2}\b/);
        const monthYear = value.match(/^(\d{1,2})\/(\d{4})\b/);
        const us = value.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}\b/);
        // Ambiguous numeric day/month ordering is deliberately left for the homeowner.
        const month = iso ? Number(iso[1]) : monthYear ? Number(monthYear[1]) : us && Number(us[2]) > 12 ? Number(us[1]) : null;
        if (month >= 1 && month <= 12) found.month.add(month - 1);
      }
    }
  }
  for (const key of ['month', 'kwh', 'cost']) {
    const candidates = [...found[key]];
    const max = key === 'kwh' ? 100000 : key === 'cost' ? 10000000 : 11;
    if (candidates.length > 1) result[key].status = 'Multiple possible values — check the bill and select or enter the correct value.';
    else if (candidates.length === 1 && candidates[0] <= max) result[key] = { value: candidates[0], status: 'Detected — verify against the original bill.' };
    else if (candidates.length === 1) result[key].status = 'Value is outside the supported range — check the original bill.';
  }
  return result;
}
