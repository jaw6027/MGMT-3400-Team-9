const test = require('node:test');
const assert = require('node:assert/strict');
const CRM = require('../staff-demo/crm.js');
const deal = (stage, estimated, earned = 0, paid = 0) => ({stage, estimated, earned, paid, salesperson: 'Unassigned'});

test('forecasts exclude closed deals and separate earned from received without double counting', () => {
  const summary = CRM.summarize([
    deal('New lead', 120000),
    deal('Installation in progress', 220000, 50000),
    deal('Closed won', 150000, 150000, 75000),
    deal('Closed lost', 110000)
  ]);
  assert.equal(summary.openDeals, 2);
  assert.equal(summary.estimated, 290000);
  assert.equal(summary.earned, 200000);
  assert.equal(summary.paid, 75000);
  assert.equal(summary.unpaid, 125000);
  assert.equal(summary.potential, 415000);
});
test('earning above an estimate never produces a negative forecast', () => {
  const summary = CRM.summarize([deal('Referred to installer', 10000, 12000, 12000)]);
  assert.equal(summary.estimated, 0);
  assert.equal(summary.unpaid, 0);
  assert.equal(summary.potential, 0);
});
test('closing a deal changes the estimate, not earned or received amounts', () => {
  const record = deal('New lead', 180000, 20000, 10000);
  assert.equal(CRM.summarize([record]).estimated, 160000);
  record.stage = 'Closed lost';
  const closed = CRM.summarize([record]);
  assert.equal(closed.estimated, 0);
  assert.equal(closed.earned, 20000);
  assert.equal(closed.paid, 10000);
});
test('money is parsed precisely and invalid or overpaid commissions are rejected', () => {
  assert.equal(CRM.parseMoney('1200.10'), 120010);
  assert.equal(CRM.parseMoney('0'), 0);
  for (const invalid of ['', '-1', '0.001', 'Infinity', '1000001']) assert.ok(Number.isNaN(CRM.parseMoney(invalid)));
  assert.match(CRM.validate(deal('Closed won', 10000, 5000, 5001)), /cannot exceed/);
  assert.equal(CRM.validate(deal('Closed won', 10000, 5000, 5000)), '');
  assert.deepEqual(CRM.summarize([]), {deals:0,openDeals:0,estimated:0,earned:0,paid:0,unpaid:0,potential:0});
});

test('payment edits replace the original amount rather than adding it twice', () => {
  const payments = [{id:'one',amount:75000,date:'2026-11-01',payer:'Fictional installer'}];
  const payment = {id:'one',amount:90000,date:'2026-11-02',payer:'Fictional installer'};
  assert.equal(CRM.validatePayment(payment,payments,100000,'one'), '');
  assert.match(CRM.validatePayment(payment,payments,100000,null), /exceed/);
  assert.match(CRM.validatePayment({...payment,amount:0},payments,100000,'one'), /greater than zero/);
  assert.match(CRM.validatePayment({...payment,payer:' '},payments,100000,'one'), /payer/);
});

test('closed lost requires a usable loss reason', () => {
  const lost = deal('Closed lost',100000);
  assert.match(CRM.validate(lost), /lost reason/);
  assert.equal(CRM.validate({...lost,lostReason:'Not ready'}), '');
});
