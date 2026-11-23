const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const seed = [
  {id:'DEMO-001', name:'Alex Rivera', email:'alex@example.com', phone:'(661) 555-0101', type:'Phone', status:'New', address:'Not needed for phone', question:'I would like to understand my summer electricity use and explore solar options.', usage:[620,590,610,650,780,990,1180,1130,910,720,null,null], costs:[145.20,138.40,142.10,151.30,181.50,230.60,275.80,264.20,212.70,168.30,null,null], notes:[]},
  {id:'DEMO-002', name:'Jordan Lee', email:'jordan@example.com', phone:'(661) 555-0102', type:'In person', status:'Contacted', address:'123 Sample Lane, Bakersfield, CA 93301 (fictional)', question:'We are planning an electric vehicle and want to discuss what to ask an installer.', usage:[540,510,520,550,660,850,1010,980,790,620,560,580], costs:[126,119,121,128,154,198,235,228,184,144,130,135], notes:[{author:'Group 9 · Team member 2', text:'Sample note: initial conversation completed. Ask about expected home EV charging.'}]},
  {id:'DEMO-003', name:'Taylor Morgan', email:'taylor@example.com', phone:'(661) 555-0103', type:'Phone', status:'Scheduled', address:'Not needed for phone', question:'I have a few months of bills and would like help understanding my options.', usage:[null,null,null,null,null,880,1040,1000,830,null,null,null], costs:[null,null,null,null,null,205.10,242.40,233.00,193.40,null,null,null], notes:[{author:'Group 9 · Team member 1', text:'Sample note: follow-up phone consultation arranged; bring available bills.'}]},
  {id:'DEMO-004', name:'Casey Brooks', email:'casey@example.com', phone:'(661) 555-0104', type:'In person', status:'New', address:'456 Example Court, Bakersfield, CA 93309 (fictional)', question:'Can you help us prepare questions about our roof shade and electricity usage?', usage:[470,460,480,520,610,800,950,920,740,580,500,510], costs:[109.50,107.10,111.80,121.10,142.10,186.40,221.40,214.40,172.40,135.10,116.50,118.80], notes:[]}
];
// Fictional CRM amounts are cents; dates are relative to the present in Bakersfield.
function todayKey() {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part = type => parts.find(p=>p.type===type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function dateOffset(days) { const date=new Date(todayKey()+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10); }
const crmSamples = [
  {stage:'New lead',salesperson:'Unassigned',followUp:dateOffset(0),estimated:120000,earned:0,paid:0},
  {stage:'Referred to installer',salesperson:CRM.salespeople[2],followUp:dateOffset(-2),estimated:180000,earned:0,paid:0},
  {stage:'Closed won',salesperson:CRM.salespeople[1],followUp:dateOffset(3),estimated:150000,earned:150000,paid:75000},
  {stage:'Closed lost',salesperson:CRM.salespeople[3],followUp:'',estimated:110000,earned:0,paid:0}
];
seed.forEach((r,i)=>Object.assign(r,crmSamples[i],{activity:[]}));
seed.push({...structuredClone(seed[0]),id:'DEMO-005',name:'Quinn Parker',email:'quinn@example.com',phone:'(661) 555-0105',status:'Scheduled',stage:'Installation in progress',salesperson:CRM.salespeople[4],followUp:dateOffset(2),estimated:220000,earned:50000,paid:0,question:'I would like to review the next steps with the installer.',notes:[],activity:[]});
let requests = structuredClone(seed);
let selectedId = requests[0].id;
let identity = '';
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const number = value => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);
function totals(record){return {count:record.usage.filter(x=>x!==null).length, usage:record.usage.reduce((a,b)=>a+Math.round((b??0)*100),0)/100, cost:record.costs.reduce((a,b)=>a+Math.round((b??0)*100),0)/100};}
function node(tag, text, className){const el=document.createElement(tag); if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function announce(text){$('#staff-status').textContent=text;}
function renderList(){
  renderOverview();
  const query=$('#search').value.trim().toLowerCase(), filter=$('#status-filter').value;
  const stage=$('#stage-filter').value, salesperson=$('#salesperson-filter').value, followUp=$('#followup-filter').value;
  const filtered=requests.filter(r=>(r.name+' '+r.id).toLowerCase().includes(query)
    &&(filter==='All statuses'||r.status===filter)
    &&(stage==='All stages'||r.stage===stage)
    &&(salesperson==='All salespeople'||r.salesperson===salesperson)
    &&($('#source-filter').value==='All sources'||r.leadSource===$('#source-filter').value)
    &&(followUp==='All follow-ups'||followUpState(r.followUp)===followUp));
  if(!filtered.some(r=>r.id===selectedId)) selectedId=filtered[0]?.id??null;
  $('#result-count').textContent=`${filtered.length} of ${requests.length} sample prospects`;
  $('#no-results').hidden=filtered.length>0;
  $('#request-list').replaceChildren(...filtered.map(r=>{
    const button=node('button',undefined,'request-card');button.type='button';button.setAttribute('aria-pressed',String(r.id===selectedId));button.setAttribute('aria-label',`View ${r.name}, ${r.id}`);
    const top=node('span',undefined,'card-top');top.append(node('span',r.name,'request-name'),node('span',r.stage,'badge '+(r.stage==='Closed lost'?'badge-lost':r.stage==='Closed won'?'badge-scheduled':'badge-contacted')));
    button.append(top,node('span',`${r.id} · ${r.type}`,'request-meta'),node('span',r.salesperson,'request-meta'),node('span',`Follow-up: ${formatFollowUp(r.followUp)}`,'request-meta '+(followUpState(r.followUp)==='Overdue'?'overdue':'')),node('span',`Expected commission: ${money(r.estimated/100)} · ${totals(r).count}/12 months`,'request-meta'));
    button.addEventListener('click',()=>{selectedId=r.id;renderList();renderDetail();});return button;
  }));
}
function renderDetail(){
  const panel=$('#request-detail');panel.replaceChildren();const r=requests.find(r=>r.id===selectedId);
  if(!r){const heading=node('h2','Request details');heading.id='detail-title';panel.append(heading,node('p','Select a matching request to see its details.','empty'));return;}
  const header=node('div',undefined,'detail-header'), title=node('div');title.append(node('p',r.id+' / FICTIONAL CUSTOMER','eyebrow'));const h=node('h2',r.name);h.id='detail-title';title.append(h,node('p',r.type+' consultation','muted'));
  const statusLabel=node('label','Consultation status','status-control'), status=node('select');status.id='request-status';
  ['New','Contacted','Scheduled'].forEach(s=>{const option=node('option',s);option.value=s;status.append(option);});status.value=r.status;statusLabel.append(status);
  status.addEventListener('change',()=>{r.status=status.value;renderList();if(selectedId!==r.id)renderDetail();announce(`${r.name} updated to ${r.status}. Demo change only.`);});header.append(title,statusLabel);panel.append(header);
  const contact=node('dl',undefined,'contact-grid');for(const [label,value] of [['Email',r.email],['Phone',r.phone],['Meeting address',r.address]]){const group=node('div');if(label==='Meeting address')group.className='wide';group.append(node('dt',label),node('dd',value));contact.append(group);}panel.append(contact);panel.append(renderProspectTools(r));panel.append(renderCrmForm(r));panel.append(renderReferral(r));panel.append(renderPayments(r));
  const question=node('section',undefined,'detail-section');question.append(node('h3','What they’d like to discuss'),node('p',r.question,'customer-question'));panel.append(question);
  const energy=node('section',undefined,'detail-section');const t=totals(r);energy.append(node('h3','Home energy worksheet'),node('p',`${t.count} of 12 months entered · totals cover entered months only`,'coverage'));
  const cards=node('div',undefined,'worksheet-totals');for(const [label,value] of [['Total usage',number(t.usage)+' kWh'],['Total cost',money(t.cost)]]){const card=node('div');card.append(node('span',label),node('strong',value));cards.append(card);}energy.append(cards);
  const tableWrap=node('div',undefined,'table-wrap'), table=node('table');table.append(node('caption','Fictional monthly electricity bills'));const head=node('thead'),hr=node('tr');['Month','Usage (kWh)','Cost (USD)'].forEach(s=>{const th=node('th',s);th.scope='col';hr.append(th);});head.append(hr);table.append(head);const body=node('tbody');
  monthNames.forEach((month,i)=>{const row=node('tr'),missing=r.usage[i]===null;const th=node('th',month);th.scope='row';row.append(th,node('td',missing?'⚑ Missing':number(r.usage[i])),node('td',missing?'Not provided':money(r.costs[i])));if(missing)row.className='missing-row';body.append(row);});table.append(body);tableWrap.append(table);energy.append(tableWrap,node('p',t.count===12?'All 12 months are included.':`Missing: ${monthNames.filter((m,i)=>r.usage[i]===null).join(', ')}. Blank months are not counted as zero.`,'missing'));panel.append(energy);
  const notes=node('section',undefined,'detail-section');notes.append(node('h3','Internal team notes'),node('p','Visible in this staff demo only. Use fictional information.','muted small'));
  const noteForm=node('form',undefined,'note-form'),label=node('label','Add a note'),textarea=node('textarea');textarea.id='new-note';textarea.rows=3;textarea.maxLength=1500;textarea.required=true;textarea.placeholder='Next steps, questions, or follow-up details…';label.htmlFor='new-note';noteForm.append(label,textarea);const save=node('button','Save demo note','button');save.type='submit';noteForm.append(save);notes.append(noteForm);
  const noteList=node('ul',undefined,'note-list');if(!r.notes.length)notes.append(node('p','No notes yet. Add the team’s first next step.','muted small'));
  r.notes.forEach(note=>{const item=node('li');item.append(node('strong',note.author),node('p',note.text));noteList.append(item);});notes.append(noteList);panel.append(notes);
  noteForm.addEventListener('submit',event=>{event.preventDefault();const text=textarea.value.trim();if(!text){textarea.setCustomValidity('Enter a note before saving.');textarea.reportValidity();return;}r.notes.unshift({author:identity,text});renderDetail();$('#new-note').focus({preventScroll:true});announce(`Note saved for ${r.name}. This change lasts until reload or sign-out.`);});textarea.addEventListener('input',()=>textarea.setCustomValidity(''));
}
$('#login-form').addEventListener('submit',event=>{event.preventDefault();if(!$('#login-form').reportValidity())return;identity=$('#team-member').value;$('#signed-in-as').textContent=identity;$('#sign-in').hidden=true;$('#workspace').hidden=false;renderList();renderDetail();window.scrollTo(0,0);showStaffPage(staffPageFromHash(),false);});
for(const event of ['input','change'])$('#search').addEventListener(event,()=>{renderList();renderDetail();});
for(const id of ['status-filter','stage-filter','salesperson-filter','followup-filter','source-filter']) $('#'+id).addEventListener('change',()=>{renderList();renderDetail();});
function resetData(){resetMarketingData();requests=structuredClone(seed);selectedId=requests[0].id;$('#search').value='';$('#status-filter').value='All statuses';$('#stage-filter').value='All stages';$('#salesperson-filter').value='All salespeople';$('#followup-filter').value='All follow-ups';$('#source-filter').value='All sources';$('#prospect-editor').hidden=true;}
$('#reset-demo').addEventListener('click',()=>{resetData();renderList();renderDetail();announce('Sample records, statuses, and notes restored.');});
$('#sign-out').addEventListener('click',()=>{resetData();identity='';$('#workspace').hidden=true;$('#sign-in').hidden=false;$('#login-form').reset();$('#request-list').replaceChildren();$('#request-detail').replaceChildren();$('#signed-in-as').textContent='';window.scrollTo(0,0);$('#team-member').focus();});

function followUpState(date) {
  if (!date) return 'No date';
  const today=todayKey();
  return date<today?'Overdue':date===today?'Due today':'Upcoming';
}
function formatFollowUp(date) {
  if (!date) return 'No date set';
  const formatted=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
  return `${formatted} · ${followUpState(date)}`;
}
function renderOverview() {
  renderLearningInsights();renderMarketing();
  const summary=CRM.summarize(requests);
  for(const key of ['estimated','earned','paid','unpaid','potential']) $('#crm-'+key).textContent=money(summary[key]/100);
  $('#crm-open').textContent=summary.openDeals;
  $('#sales-rollup').replaceChildren(...CRM.salespeople.map(person=>{
    const totals=CRM.summarize(requests.filter(r=>r.salesperson===person));
    const row=node('tr'),name=node('th',person);name.scope='row';
    row.append(name,node('td',String(totals.openDeals)),...['estimated','earned','paid','unpaid'].map(key=>node('td',money(totals[key]/100))));return row;
  }));
}
function fillOptions(select, options, current) {
  options.forEach(value=>{const option=node('option',value);option.value=value;select.append(option);});
  if(current!==undefined)select.value=current;
}
fillOptions($('#stage-filter'),['All stages',...CRM.stages]);
fillOptions($('#salesperson-filter'),['All salespeople',...CRM.salespeople]);

function renderCrmForm(record) {
  const section=node('section',undefined,'crm-editor detail-section');
  section.append(node('h3','Sales progress & commissions'),node('p','Save changes to update this prospect and the team totals. All amounts are fictional USD.','muted small'));
  const edit=node('form'),grid=node('div',undefined,'crm-form-grid');edit.id='crm-form';
  function control(text,id,type,value,options) {
    const label=node('label',text),input=node(options?'select':'input');label.htmlFor=id;input.id=id;input.name=id;
    if(options)fillOptions(input,options,value);
    else {input.type=type;input.value=value;if(type==='number'){input.min='0';input.max='1000000';input.step='0.01';input.required=true;input.inputMode='decimal';}}
    label.append(input);grid.append(label);return input;
  }
  const stage=control('Pipeline stage','deal-stage',null,record.stage,CRM.stages);
  const salesperson=control('Assigned salesperson','deal-salesperson',null,record.salesperson,CRM.salespeople);
  const followUp=control('Next follow-up date','deal-followup','date',record.followUp);followUp.min='2000-01-01';followUp.max='2100-12-31';
  const estimated=control('Estimated total commission ($)','deal-estimated','number',(record.estimated/100).toFixed(2));
  const earned=control('Earned commission to date ($)','deal-earned','number',(record.earned/100).toFixed(2));
  const paid=control('Paid / received—payment ledger ($)','deal-paid','number',(record.paid/100).toFixed(2));paid.readOnly=true;
  const lossReason=control('Lost reason (required for closed lost)','deal-loss-reason',null,record.lostReason,['',...CRM.lostReasons]);
  lossReason.options[0].textContent='Select a lost reason';
  const lossDetail=control('Lost reason details (optional)','deal-loss-detail','text',record.lostDetail||'');lossDetail.maxLength=500;
  function toggleLoss(){lossReason.required=stage.value==='Closed lost';}
  stage.addEventListener('change',toggleLoss);toggleLoss();
  edit.append(grid,node('p','Earned is the amount confirmed as owed, including payments already received. Paid is calculated from the payment ledger below and cannot exceed earned. Leave follow-up blank if not arranged.','muted small'));
  const explanation=node('p',record.stage==='Closed lost'?'Closed lost: unearned estimates are excluded from the open pipeline. Previously earned and paid amounts remain in the totals.':'Pipeline stages and commissions are tracked independently. Set earned and paid amounts only when their milestones actually occur.','crm-help');edit.append(explanation);
  const problem=node('p',undefined,'crm-error');problem.id='crm-error';problem.setAttribute('role','alert');problem.hidden=true;edit.append(problem);
  const save=node('button','Save prospect updates','button');save.type='submit';edit.append(save);section.append(edit);
  const balances=node('div',undefined,'deal-balances');balances.append(node('span',`Open estimate, not yet earned: ${money(CRM.openEstimate(record)/100)}`),node('span',`Earned, awaiting payment: ${money((record.earned-record.paid)/100)}`));section.append(balances);
  const history=node('details',undefined,'activity-history'),summary=node('summary',`Progress history (${record.activity.length})`);history.append(summary);
  if(!record.activity.length)history.append(node('p','No progress updates yet. Save a change to add an entry.','muted small'));
  record.activity.forEach(entry=>{const item=node('div',undefined,'activity-item');item.append(node('strong',entry.author+' · '+entry.time),node('p',entry.text));history.append(item);});section.append(history);
  edit.addEventListener('submit',event=>{
    event.preventDefault();if(!edit.reportValidity())return;
    const next={stage:stage.value,salesperson:salesperson.value,followUp:followUp.value,estimated:CRM.parseMoney(estimated.value),earned:CRM.parseMoney(earned.value),paid:record.payments.reduce((total,payment)=>total+payment.amount,0),lostReason:lossReason.value,lostDetail:lossDetail.value.trim()};
    const error=CRM.validate(next);
    if(error){problem.textContent=error;problem.hidden=false;paid.focus();return;}
    const changes=[];
    for(const key of ['stage','salesperson','followUp','estimated','earned','paid','lostReason','lostDetail']) {
      if(record[key]===next[key])continue;
      const labels={stage:'Stage',salesperson:'Salesperson',followUp:'Follow-up',estimated:'Estimated',earned:'Earned',paid:'Received',lostReason:'Lost reason',lostDetail:'Lost details'};
      const display=value=>['estimated','earned','paid'].includes(key)?money(value/100):(value||'not set');
      changes.push(`${labels[key]}: ${display(record[key])} → ${display(next[key])}`);
    }
    if(changes.length) {
      record.activity.unshift({author:identity,time:new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date()),text:changes.join('; ')});
      Object.assign(record,next);
    }
    renderList();renderDetail();announce(`${record.name}: ${changes.length?'progress saved and totals updated':'no changes to save'}. Demo only.`);
    const confirmation=node('p',changes.length?'Prospect updated. Team totals have been recalculated.':'No changes to save.','crm-saved');confirmation.setAttribute('role','status');
    $('#request-detail').prepend(confirmation);
  });
  edit.addEventListener('input',()=>{problem.hidden=true;});
  return section;
}
