const CampaignMath = (() => {
  const within = (date, from, to) => !!date && (!from || date >= from) && (!to || date <= to);
  function measure(campaign, prospects, from='', to='') {
    const acquired = prospects.filter(p => p.campaignId === campaign.id && within(p.acquiredDate,from,to));
    const spend = campaign.expenses.filter(e => within(e.date,from,to)).reduce((sum,e)=>sum+e.amount,0);
    const lifetimeSpend = campaign.expenses.reduce((sum,e)=>sum+e.amount,0);
    return {prospects:acquired.length, spend, lifetimeSpend, costPerProspect:acquired.length ? spend/acquired.length : null, remaining:campaign.budget-lifetimeSpend};
  }
  function previousPeriod(from,to) {
    if(!from||!to||from>to)return null;
    const day=86400000,start=Date.parse(from+'T00:00:00Z'),end=Date.parse(to+'T00:00:00Z');
    const duration=end-start+day;
    return {from:new Date(start-duration).toISOString().slice(0,10),to:new Date(start-day).toISOString().slice(0,10)};
  }
  function validateCampaign(campaign) {
    if(!campaign.name.trim())return 'Enter a campaign name.';
    if(!Number.isSafeInteger(campaign.budget)||campaign.budget<0)return 'Enter a nonnegative budget with up to two decimal places.';
    if(!campaign.start)return 'Enter the campaign start date.';
    if(campaign.end&&campaign.end<campaign.start)return 'The end date cannot be before the start date.';
    return '';
  }
  return {within,measure,previousPeriod,validateCampaign};
})();
if(typeof module!=='undefined')module.exports=CampaignMath;
