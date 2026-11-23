// Separate staff page, shared in-memory prospects; no live advertising integrations.
const campaignSeed = [
  {id:'CAMP-001',name:'Neighborhood solar search ads',source:'Website',status:'Active',owner:CRM.salespeople[1],start:dateOffset(-30),end:'',budget:100000,tactics:'Fictional search ads directing interested homeowners to the energy worksheet.',expenses:[{id:'EXP-001',date:dateOffset(-17),amount:30000,description:'Sample search advertising'},{id:'EXP-002',date:dateOffset(-4),amount:15000,description:'Sample search advertising'}]},
  {id:'CAMP-002',name:'Neighbors connect referral drive',source:'Friend / customer referral',status:'Active',owner:CRM.salespeople[2],start:dateOffset(-45),end:'',budget:20000,tactics:'Fictional neighborhood outreach encouraging homeowners to refer friends.',expenses:[{id:'EXP-003',date:dateOffset(-16),amount:7500,description:'Sample printed referral cards'}]},
  {id:'CAMP-003',name:'Community energy booth',source:'Community event',status:'Completed',owner:CRM.salespeople[3],start:dateOffset(-60),end:dateOffset(-35),budget:35000,tactics:'Fictional community booth offering information and free consultation sign-ups.',expenses:[{id:'EXP-004',date:dateOffset(-41),amount:25000,description:'Sample booth and handout costs'}]},
  {id:'CAMP-004',name:'Solar questions social campaign',source:'Social media',status:'Active',owner:CRM.salespeople[4],start:dateOffset(-20),end:'',budget:50000,tactics:'Fictional social posts and ads inviting residents to ask questions about solar.',expenses:[{id:'EXP-005',date:dateOffset(-10),amount:18000,description:'Sample social advertising'}]}
];
seed.forEach((record,i)=>{record.campaignId=['CAMP-001','CAMP-002','CAMP-003','CAMP-004','CAMP-001'][i];record.acquiredDate=dateOffset([-3,-15,-40,-8,-20][i]);});
requests=structuredClone(seed);
let campaigns=structuredClone(campaignSeed);
let selectedCampaign=campaigns[0].id;
let reportFrom=todayKey().slice(0,8)+'01';
let reportTo=todayKey();
$('#marketing-from').value=reportFrom;$('#marketing-to').value=reportTo;

function staffPageFromHash() {
  const page=location.hash.slice(1);
  return ['overview','sales','marketing'].includes(page)?page:'overview';
}
function showStaffPage(page,updateHash=true) {
  const selected=['overview','sales','marketing'].includes(page)?page:'overview';
  for(const name of ['overview','sales','marketing']) {
    $('#'+name+'-view').hidden=name!==selected;
    const link=$('#'+name+'-page-link');
    if(name===selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  if(updateHash)history.replaceState(null,'','#'+selected);
  if(selected==='marketing')renderMarketing();
  if(selected==='overview')renderOverview();
  window.scrollTo({top:0,behavior:'instant'});
}
for(const page of ['overview','sales','marketing'])$('#'+page+'-page-link').addEventListener('click',event=>{event.preventDefault();showStaffPage(page);});
window.addEventListener('hashchange',()=>{if(!$('#workspace').hidden)showStaffPage(staffPageFromHash(),false);});
$('#overview-sales').addEventListener('click',()=>showStaffPage('sales'));
$('#overview-reset').addEventListener('click',()=>$('#reset-demo').click());
$('#marketing-reset').addEventListener('click',()=>$('#reset-demo').click());
$('#create-campaign').addEventListener('click',()=>openCampaignEditor());
$('#marketing-range').addEventListener('submit',event=>{
  event.preventDefault();if(!$('#marketing-range').reportValidity())return;
  const from=$('#marketing-from').value,to=$('#marketing-to').value,error=$('#marketing-range-error');
  if(from&&to&&from>to){error.textContent='Choose an end date on or after the start date.';error.hidden=false;return;}
  error.hidden=true;reportFrom=from;reportTo=to;renderMarketing();
});
$('#marketing-all-time').addEventListener('click',()=>{reportFrom='';reportTo='';$('#marketing-from').value='';$('#marketing-to').value='';$('#marketing-range-error').hidden=true;renderMarketing();});
function resetMarketingData() {
  campaigns=structuredClone(campaignSeed);selectedCampaign=campaigns[0].id;
  reportFrom=todayKey().slice(0,8)+'01';reportTo=todayKey();
  $('#marketing-from').value=reportFrom;$('#marketing-to').value=reportTo;
  $('#marketing-range-error').hidden=true;$('#campaign-editor').hidden=true;
}
function campaignMessage(text) {
  renderList();renderDetail();announce(text);
  const message=node('p',text,'crm-saved');message.setAttribute('role','status');$('#campaign-detail').prepend(message);
}
function renderMarketing() {
  const results=campaigns.map(campaign=>({campaign,...CampaignMath.measure(campaign,requests,reportFrom,reportTo)}));
  const acquired=results.reduce((sum,row)=>sum+row.prospects,0),spent=results.reduce((sum,row)=>sum+row.spend,0);
  $('#marketing-prospects').textContent=String(acquired);$('#marketing-spend').textContent=money(spent/100);
  $('#marketing-cpl').textContent=acquired?money(spent/100/acquired):'—';
  $('#marketing-period').textContent=`Reporting period: ${reportFrom||'earliest date'} through ${reportTo||'latest date'} (inclusive). Expenses use their spend date; prospects use their first-acquired date.`;
  const previous=CampaignMath.previousPeriod(reportFrom,reportTo);
  if(previous) {
    const prior=campaigns.reduce((sum,c)=>sum+CampaignMath.measure(c,requests,previous.from,previous.to).prospects,0),delta=acquired-prior;
    $('#marketing-growth').textContent=(delta>0?'+':'')+delta;
    $('#marketing-growth-note').textContent=`${acquired} vs ${prior} prospects · previous period ${previous.from}–${previous.to}${prior?' · '+number(delta/prior*100)+'% change':''}`;
  }else{$('#marketing-growth').textContent='—';$('#marketing-growth-note').textContent='Set both dates to compare equal-length periods.';}
  const unattributed=requests.filter(r=>!campaigns.some(c=>c.id===r.campaignId)&&CampaignMath.within(r.acquiredDate,reportFrom,reportTo)).length;
  $('#marketing-unattributed').textContent=`${unattributed} prospect(s) in this period have no campaign attribution and are excluded from campaign counts and cost per prospect. Cost per prospect is a period comparison, not a lifetime conversion or profit measure.`;
  $('#campaign-rows').replaceChildren(...results.map(row=>{
    const tr=node('tr'),name=node('th');name.scope='row';name.append(node('strong',row.campaign.name),node('small',row.campaign.source,'campaign-source'));
    tr.append(name,node('td',row.campaign.status),node('td',money(row.campaign.budget/100)),node('td',money(row.spend/100)),node('td',String(row.prospects)),node('td',row.costPerProspect===null?'—':money(row.costPerProspect/100)));
    const cell=node('td'),button=node('button','View','outline');button.type='button';button.setAttribute('aria-label','View campaign '+row.campaign.name);button.addEventListener('click',()=>{selectedCampaign=row.campaign.id;renderCampaignDetail();$('#campaign-detail-title').tabIndex=-1;$('#campaign-detail-title').focus();});cell.append(button);tr.append(cell);return tr;
  }));
  renderCampaignDetail();
}
function openCampaignEditor(campaign) {
  const section=$('#campaign-editor');section.hidden=false;section.replaceChildren();
  const title=node('h2',campaign?'Edit campaign':'Create a campaign');title.id='campaign-editor-title';section.append(title,node('p','Describe how the team plans to find new prospects. Budget is planned spending; add actual dated expenses separately. Fictional demo only.','muted small'));
  const form=node('form'),grid=node('div',undefined,'crm-form-grid');form.id='campaign-form';
  const name=inputField(grid,'campaign','Campaign name','name','text',campaign?.name);name.required=true;
  const source=inputField(grid,'campaign','Acquisition source / channel','source',null,campaign?.source||'Website',CRM.leadSources);
  const status=inputField(grid,'campaign','Campaign status','status',null,campaign?.status||'Planned',['Planned','Active','Completed','Paused']);
  const owner=inputField(grid,'campaign','Team owner','owner',null,campaign?.owner||'Unassigned',CRM.salespeople);
  const start=inputField(grid,'campaign','Start date','start','date',campaign?.start||todayKey());start.required=true;
  const end=inputField(grid,'campaign','End date (optional)','end','date',campaign?.end||'');
  const budget=inputField(grid,'campaign','Total planned budget ($)','budget','number',((campaign?.budget||0)/100).toFixed(2));budget.min='0';budget.max='1000000';budget.step='0.01';budget.required=true;
  const tactics=inputField(grid,'campaign','How we find prospects / outreach approach','tactics','textarea',campaign?.tactics||'');tactics.required=true;
  form.append(grid);const error=formError(form);saveButton(form,campaign?'Save campaign':'Create campaign');const cancel=node('button','Cancel','quiet');cancel.type='button';cancel.addEventListener('click',()=>section.hidden=true);form.append(cancel);section.append(form);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const values={name:name.value.trim(),source:source.value,status:status.value,owner:owner.value,start:start.value,end:end.value,budget:CRM.parseMoney(budget.value),tactics:tactics.value.trim()};
    const validation=CampaignMath.validateCampaign(values);if(validation)return reportError(error,validation);
    if(!values.tactics)return reportError(error,'Describe the outreach approach for this campaign.');
    if(campaigns.some(c=>c.id!==campaign?.id&&c.name.toLowerCase()===values.name.toLowerCase()))return reportError(error,'A campaign already has this name. Use a distinct name or edit the existing one.');
    let target=campaign;
    if(!target){target={id:'CAMP-'+crypto.randomUUID(),expenses:[]};campaigns.push(target);}
    Object.assign(target,values);
    requests.filter(r=>r.campaignId===target.id).forEach(r=>{if(r.leadSource!==target.source){r.leadSource=target.source;logProgress(r,'Campaign channel updated to '+target.source+'.');}});
    selectedCampaign=target.id;section.hidden=true;campaignMessage(`${target.name}: campaign ${campaign?'updated':'created'}.`);
    $('#campaign-detail-title').tabIndex=-1;$('#campaign-detail-title').focus();
  });
  section.scrollIntoView({behavior:'instant',block:'start'});name.focus({preventScroll:true});
}
function renderCampaignDetail() {
  const panel=$('#campaign-detail');panel.replaceChildren();const campaign=campaigns.find(c=>c.id===selectedCampaign)||campaigns[0];
  if(!campaign)return;
  const heading=node('div',undefined,'panel-heading'),title=node('h2',campaign.name);title.id='campaign-detail-title';
  const edit=node('button','Edit campaign','outline');edit.type='button';edit.addEventListener('click',()=>openCampaignEditor(campaign));heading.append(title,edit);panel.append(heading);
  panel.append(node('p',`${campaign.source} · ${campaign.status} · ${campaign.owner} · ${campaign.start} through ${campaign.end||'ongoing'}`,'muted small'),node('p',campaign.tactics,'campaign-tactics'));
  const lifetime=CampaignMath.measure(campaign,requests),period=CampaignMath.measure(campaign,requests,reportFrom,reportTo),summary=node('div',undefined,'campaign-budget');
  summary.append(node('span','Total budget: '+money(campaign.budget/100)),node('span','Lifetime spend: '+money(lifetime.lifetimeSpend/100)),node('strong',lifetime.remaining<0?'Over budget by '+money(-lifetime.remaining/100):'Budget remaining: '+money(lifetime.remaining/100)));
  panel.append(summary,node('p',`Selected period: ${period.prospects} acquired prospect(s) · ${money(period.spend/100)} spent. Linked prospects below include all dates.`,'muted small'));
  const linked=requests.filter(r=>r.campaignId===campaign.id),prospectList=node('ul',undefined,'campaign-prospects');
  linked.forEach(r=>{const item=node('li'),button=node('button',r.name+' · '+r.acquiredDate+' · '+r.stage,'quiet');button.type='button';button.addEventListener('click',()=>{selectedId=r.id;resetFilters();renderList();renderDetail();showStaffPage('sales');$('#detail-title').tabIndex=-1;$('#detail-title').focus();});item.append(button);prospectList.append(item);});
  panel.append(node('h3','Linked prospects'),linked.length?prospectList:node('p','No prospects linked yet. Use Create/Edit prospect in Sales CRM to assign this campaign.','muted small'));
  const details=accordion('Actual spend log · '+campaign.expenses.length+' expense(s)','campaign-expenses',true);panel.append(details.details);
  details.content.append(node('p','Record actual marketing expenses, not the planned budget. Changes update spend and cost-per-prospect calculations.','muted small'));
  const tableWrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('thead'),hr=node('tr');['Spend date','Expense','Amount','Action'].forEach(text=>{const th=node('th',text);th.scope='col';hr.append(th);});head.append(hr);table.append(head);const body=node('tbody');let editingId=null;
  campaign.expenses.forEach(expense=>{const tr=node('tr'),action=node('td'),button=node('button','Edit','quiet');button.type='button';button.setAttribute('aria-label','Edit expense '+expense.description);button.addEventListener('click',()=>{editingId=expense.id;date.value=expense.date;amount.value=(expense.amount/100).toFixed(2);description.value=expense.description;save.textContent='Save expense changes';cancel.hidden=false;amount.focus();});action.append(button);tr.append(node('td',expense.date),node('td',expense.description),node('td',money(expense.amount/100)),action);body.append(tr);});table.append(body);tableWrap.append(table);details.content.append(tableWrap);
  const form=node('form'),grid=node('div',undefined,'crm-form-grid');form.id='expense-form';
  const date=inputField(grid,'expense','Spend date','date','date',todayKey());date.required=true;date.max=todayKey();
  const amount=inputField(grid,'expense','Actual expense amount ($)','amount','number','');amount.required=true;amount.min='0.01';amount.max='1000000';amount.step='0.01';
  const description=inputField(grid,'expense','Expense description','description','text','');description.required=true;
  form.append(grid);const error=formError(form),save=saveButton(form,'Record expense');
  const cancel=node('button','Cancel expense edit','quiet');cancel.type='button';cancel.hidden=true;cancel.addEventListener('click',()=>{editingId=null;date.value=todayKey();amount.value='';description.value='';save.textContent='Record expense';cancel.hidden=true;error.hidden=true;});form.append(cancel);details.content.append(form);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const expense={id:editingId||'EXP-'+crypto.randomUUID(),date:date.value,amount:CRM.parseMoney(amount.value),description:description.value.trim()};
    if(!expense.description)return reportError(error,'Describe what the campaign expense was for.');
    if(!Number.isSafeInteger(expense.amount)||expense.amount<=0)return reportError(error,'Enter an expense greater than zero, with up to two decimal places.');
    if(editingId)campaign.expenses=campaign.expenses.map(e=>e.id===editingId?expense:e);else campaign.expenses.push(expense);
    campaignMessage('Campaign expense saved. Spending and acquisition costs have been recalculated.');
  });
}
