const test=require('node:test');
const assert=require('node:assert/strict');
const M=require('../staff-demo/campaign-math.js');
const campaign={id:'one',budget:100000,expenses:[{date:'2026-10-25',amount:20000},{date:'2026-11-01',amount:30000},{date:'2026-11-22',amount:15000}]};
const prospects=[{campaignId:'one',acquiredDate:'2026-10-25'},{campaignId:'one',acquiredDate:'2026-11-01'},{campaignId:'one',acquiredDate:'2026-11-22'},{campaignId:'two',acquiredDate:'2026-11-22'},{campaignId:'',acquiredDate:'2026-11-22'}];
test('period cost includes only matching acquisition and expense dates, inclusive of boundaries',()=>{
  const result=M.measure(campaign,prospects,'2026-11-01','2026-11-22');
  assert.equal(result.prospects,2);assert.equal(result.spend,45000);assert.equal(result.costPerProspect,22500);
  assert.equal(result.lifetimeSpend,65000);assert.equal(result.remaining,35000);
});
test('all-time and zero-prospect reports do not imply free acquisition when there are no prospects',()=>{
  assert.equal(M.measure(campaign,prospects).prospects,3);
  const result=M.measure(campaign,[],'2026-11-01','2026-11-22');
  assert.equal(result.spend,45000);assert.equal(result.costPerProspect,null);
  assert.equal(M.measure({...campaign,expenses:[]},prospects).costPerProspect,0);
});
test('previous reporting period has equal length without overlapping current dates',()=>{
  assert.deepEqual(M.previousPeriod('2026-11-01','2026-11-22'),{from:'2026-10-10',to:'2026-10-31'});
  assert.deepEqual(M.previousPeriod('2024-03-01','2024-03-01'),{from:'2024-02-29',to:'2024-02-29'});
  assert.equal(M.previousPeriod('','2026-11-22'),null);
});
test('campaign validation rejects reversed dates and invalid budgets; overspend remains visible',()=>{
  assert.match(M.validateCampaign({name:'Test',budget:100,start:'2026-11-22',end:'2026-11-01'}),/before/);
  assert.match(M.validateCampaign({name:'Test',budget:NaN,start:'2026-11-22',end:''}),/budget/);
  assert.equal(M.measure({...campaign,budget:10000},prospects).remaining,-55000);
});
