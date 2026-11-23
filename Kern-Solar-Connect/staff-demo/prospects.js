// All records below are fictional and remain in memory for the classroom demo.
const referralStatuses = ['Not referred', 'Sent', 'Accepted', 'Assessment scheduled', 'Quote provided', 'Installed', 'Declined'];
let prospectSequence = 5;
function emptyKnowledge() {
  return {ownership:'',homeSize:'',household:'',utility:'',ratePlan:'',heatingCooling:'',waterHeating:'',evPool:'',existingSolar:'',roofShade:'',goals:'',timeline:'',decisionMakers:'',contactMethod:'',bestTime:'',nextAction:'',appointment:'',otherAnswers:''};
}
seed.forEach((r,i)=>{
  r.leadSource=['Website','Friend / customer referral','Community event','Social media','Website'][i];
  r.sourceDetail=i===1?'Fictional neighbor referral':'';
  r.lostReason=r.stage==='Closed lost'?'Property / roof suitability':'';
  r.lostDetail=r.stage==='Closed lost'?'Sample outcome: roof shading concerns; prospect chose not to proceed.':'';
  r.referral={installer:i===0?'':'Sample Solar Installer (fictional)',contact:'',email:'',phone:'',date:i===0?'':dateOffset(-12),status:['Not referred','Accepted','Installed','Declined','Quote provided'][i],notes:''};
  r.commission={payer:i===0?'':'Sample Solar Installer (fictional)',trigger:'Sample agreement only: confirm referral milestone with installer.',earnedDate:r.earned?dateOffset(-5):'',dueDate:r.earned?dateOffset(i===2?-1:7):''};
  r.payments=r.paid?[{id:'PAY-SAMPLE-001',amount:r.paid,date:dateOffset(-3),payer:r.commission.payer,reference:'SAMPLE-PARTIAL-001',note:'Fictional partial commission payment.'}]:[];
  r.knowledge=emptyKnowledge();
  r.knowledge.goals=r.question;
  r.knowledge.contactMethod=r.type;
  r.knowledge.nextAction=['Review available bills with prospect.','Check whether the installer has arranged an assessment.','Check expected commission payment date.','No further sales follow-up planned.','Confirm installer’s next milestone.'][i];
  r.knowledgeUpdated='';r.contacts=[];
  if(i===1){
    Object.assign(r.knowledge,{ownership:'Own',homeSize:'1900',evPool:'Planning an EV; charging routine not yet discussed.',timeline:'Exploring options this year.'});
    r.contacts.push({date:dateOffset(-4),method:'Phone',outcome:'Spoke with prospect',summary:'Sample conversation: confirmed homeowner and EV plans. Installer assessment still to be arranged.',nextAction:r.knowledge.nextAction,author:'Group 9 · Team member 2'});
  }
  if(i===3)r.knowledge.roofShade='Prospect reported shading concerns; technical suitability was not verified.';
});
requests=structuredClone(seed);
fillOptions($('#source-filter'),['All sources',...CRM.leadSources]);

function logProgress(record,text) {
  record.activity.unshift({author:identity,time:new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date()),text});
}
function refreshProspect(message) {
  renderList();renderDetail();announce(message);
  const notice=node('p',message,'crm-saved');notice.setAttribute('role','status');$('#request-detail').prepend(notice);
}
function inputField(grid,prefix,label,key,type,value,options) {
  const wrapper=node('label',label),input=node(options?'select':type==='textarea'?'textarea':'input');
  input.id=prefix+'-'+key;input.name=key;wrapper.htmlFor=input.id;
  if(options)fillOptions(input,options,value||'');
  else if(type==='textarea'){input.rows=3;input.maxLength=2000;input.value=value||'';wrapper.classList.add('full-width');}
  else {input.type=type||'text';input.value=value??'';if(type==='date'){input.min='2000-01-01';input.max='2100-12-31';}if(!['date','datetime-local'].includes(type))input.maxLength=500;}
  wrapper.append(input);grid.append(wrapper);return input;
}
function accordion(title,id,open=false) {
  const details=node('details',undefined,'tool-accordion');details.id=id;details.open=open;
  details.append(node('summary',title));const content=node('div',undefined,'accordion-content');details.append(content);return {details,content};
}
function saveButton(form,text) {const button=node('button',text,'button');button.type='submit';form.append(button);return button;}
function formError(form) {const error=node('p',undefined,'crm-error');error.setAttribute('role','alert');error.hidden=true;form.append(error);form.addEventListener('input',()=>error.hidden=true);return error;}
function reportError(error,text) {error.textContent=text;error.hidden=false;error.tabIndex=-1;error.focus();}
function resetFilters() {$('#search').value='';$('#status-filter').value='All statuses';$('#stage-filter').value='All stages';$('#salesperson-filter').value='All salespeople';$('#followup-filter').value='All follow-ups';$('#source-filter').value='All sources';}

$('#create-prospect').addEventListener('click',()=>openProspectEditor());
function openProspectEditor(record) {
  const section=$('#prospect-editor');section.replaceChildren();section.hidden=false;
  const title=node('h2',record?'Edit prospect':'Create a prospect');title.id='editor-title';
  section.append(title,node('p','Class demo only: use fictional contact details. New prospects can be added before their energy worksheet is available.','muted small'));
  const form=node('form');form.id='prospect-form';const grid=node('div',undefined,'crm-form-grid');
  const name=inputField(grid,'prospect','Full name','name','text',record?.name);name.required=true;
  const email=inputField(grid,'prospect','Email','email','email',record?.email);
  const phone=inputField(grid,'prospect','Phone','phone','tel',record?.phone);
  const type=inputField(grid,'prospect','Consultation preference','type',null,record?.type||'Phone',['Phone','In person']);
  const address=inputField(grid,'prospect','Meeting address (in person)','address','text',record?.type==='In person'?record.address:'');
  function syncAddress(){address.required=type.value==='In person';address.disabled=type.value!=='In person';}
  type.addEventListener('change',syncAddress);syncAddress();
  const source=inputField(grid,'prospect','Lead source','leadSource',null,record?.leadSource||'Unknown',CRM.leadSources);
  const campaign=inputField(grid,'prospect','Acquisition campaign','campaignId',null,record?.campaignId||'', ['',...campaigns.map(c=>c.id)]);
  [...campaign.options].forEach(option=>option.textContent=option.value?campaigns.find(c=>c.id===option.value).name:'No campaign / organic / unattributed');
  function syncSource(){const selected=campaigns.find(c=>c.id===campaign.value);if(selected)source.value=selected.source;source.disabled=!!selected;}
  campaign.addEventListener('change',syncSource);syncSource();
  const acquired=inputField(grid,'prospect','Date first acquired','acquiredDate','date',record?.acquiredDate||todayKey());acquired.required=true;acquired.max=todayKey();
  const sourceDetail=inputField(grid,'prospect','Campaign / referral details (optional)','sourceDetail','text',record?.sourceDetail);
  const question=inputField(grid,'prospect','Customer’s questions / initial goals','question','textarea',record?.question);
  form.append(grid);const error=formError(form);const actions=node('div',undefined,'heading-actions');const save=node('button',record?'Save prospect details':'Create prospect','button');save.type='submit';const cancel=node('button','Cancel','outline');cancel.type='button';cancel.addEventListener('click',()=>section.hidden=true);actions.append(save,cancel);form.append(actions);section.append(form);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    if(!name.value.trim())return reportError(error,'Enter the prospect’s name.');
    if(!email.value.trim()&&!phone.value.trim())return reportError(error,'Enter an email address or phone number so the team can follow up.');
    if(type.value==='In person'&&!address.value.trim())return reportError(error,'Enter the fictional meeting address for an in-person consultation.');
    const normalizedPhone=phone.value.replace(/\D/g,'');
    const duplicate=requests.find(r=>r.id!==record?.id&&((email.value.trim()&&r.email.toLowerCase()===email.value.trim().toLowerCase())||(normalizedPhone&&r.phone.replace(/\D/g,'')===normalizedPhone)));
    if(duplicate)return reportError(error,`These contact details match ${duplicate.name} (${duplicate.id}). Edit that prospect instead to avoid a duplicate conversation.`);
    const next={campaignId:campaign.value,acquiredDate:acquired.value,name:name.value.trim(),email:email.value.trim(),phone:phone.value.trim(),type:type.value,address:type.value==='In person'?address.value.trim():'Not needed for phone',leadSource:source.value,sourceDetail:sourceDetail.value.trim(),question:question.value.trim()};
    let target=record;
    if(!target){target={id:'DEMO-'+String(++prospectSequence).padStart(3,'0'),status:'New',stage:'New lead',salesperson:'Unassigned',followUp:'',estimated:0,earned:0,paid:0,usage:Array(12).fill(null),costs:Array(12).fill(null),notes:[],activity:[],lostReason:'',lostDetail:'',referral:{installer:'',contact:'',email:'',phone:'',date:'',status:'Not referred',notes:''},commission:{payer:'',trigger:'',earnedDate:'',dueDate:''},payments:[],knowledge:emptyKnowledge(),knowledgeUpdated:'',contacts:[]};requests.push(target);}
    Object.assign(target,next);if(!record)target.knowledge.goals=next.question;
    logProgress(target,record?'Updated prospect contact details, consultation preference, or lead source.':'Created prospect with source '+target.leadSource+'.');
    selectedId=target.id;resetFilters();section.hidden=true;refreshProspect(`${target.name}: ${record?'details updated':'prospect created'}. Demo only.`);
    $('#detail-title').tabIndex=-1;$('#detail-title').focus();
  });
  section.scrollIntoView({behavior:'instant',block:'start'});name.focus({preventScroll:true});
}

function renderProspectTools(record) {
  const wrapper=node('div',undefined,'prospect-tools');
  const top=node('div',undefined,'profile-overview'),edit=node('button','Edit prospect','outline');edit.type='button';edit.addEventListener('click',()=>openProspectEditor(record));
  const attribution=node('div');attribution.append(node('p',`Campaign: ${campaigns.find(c=>c.id===record.campaignId)?.name||'Unattributed / organic'} · Acquired: ${record.acquiredDate}`,'muted small'));top.append(attribution);
  top.append(node('p',`Lead source: ${record.leadSource}${record.sourceDetail?' · '+record.sourceDetail:''}`,'muted small'),edit);wrapper.append(top);
  const recap=node('div',undefined,'conversation-recap');recap.append(node('strong','Read before contacting this prospect'),node('p',`Next action: ${record.knowledge.nextAction||'Not yet recorded'}`));
  if(record.contacts.length){const latest=record.contacts[0];recap.append(node('p',`Last conversation: ${latest.date} · ${latest.method} · ${latest.outcome}`),node('p',latest.summary));}
  else recap.append(node('p','No conversation has been logged yet. Check known answers below before asking questions.'));
  if(record.knowledge.appointment)recap.append(node('p','Consultation appointment: '+record.knowledge.appointment.replace('T',' at ')+' · Bakersfield time (demo only)'));
  wrapper.append(recap,renderKnowledge(record),renderContacts(record));return wrapper;
}

const discoveryFields=[
  ['ownership','Own or rent?',null,['','Own','Rent','Other']],['homeSize','Approximate home size (sq ft)','number'],['household','Household size','number'],
  ['utility','Electricity provider','text'],['ratePlan','Electricity rate plan','text'],['heatingCooling','Heating / cooling type','text'],['waterHeating','Water heating fuel / type','text'],
  ['evPool','EV charging, pool, or other major loads','text'],['existingSolar','Existing solar?',null,['','Yes','No']],['roofShade','Known roof age, shade, or roof concerns','textarea'],
  ['goals','Goals and priorities already shared','textarea'],['timeline','Desired timeline','text'],['decisionMakers','Decision-makers / owner permission status','text'],
  ['contactMethod','Preferred contact method',null,['','Phone','Email','Text','In person']],['bestTime','Preferred contact times','text'],['nextAction','Next action for the team','textarea'],
  ['appointment','Consultation appointment (Bakersfield time)','datetime-local'],['otherAnswers','Other questions already answered / important notes','textarea']
];
function renderKnowledge(record) {
  const known=Object.values(record.knowledge).filter(Boolean).length;
  const {details,content}=accordion(`Known information · ${known}/${discoveryFields.length} fields recorded`,'known-information');
  content.append(node('p','Check these answers before calling. Blank fields mean “Not yet asked / unknown.” Enter “None” or “Not applicable” where the prospect has confirmed it. No credit, banking, or utility account numbers.','muted small'));
  if(record.knowledgeUpdated)content.append(node('p','Last reviewed: '+record.knowledgeUpdated,'muted small'));
  const form=node('form'),grid=node('div',undefined,'crm-form-grid'),controls={};form.id='knowledge-form';
  discoveryFields.forEach(([key,label,type,options])=>{const control=inputField(grid,'known',label,key,type,record.knowledge[key],options);if(options)control.options[0].textContent='Not yet asked / unknown';if(type==='number'){control.min='1';control.max=key==='household'?'100':'1000000';control.step='1';}controls[key]=control;});
  form.append(grid,node('p','Appointment time is a recorded plan for the demo; it does not book a calendar event or send reminders.','muted small'));saveButton(form,'Save known information');content.append(form);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;Object.entries(controls).forEach(([key,input])=>record.knowledge[key]=input.value.trim());record.knowledgeUpdated=identity+' · '+todayKey();logProgress(record,'Reviewed and updated known answers, contact preferences, and next steps.');refreshProspect('Known information updated—review it before the next conversation.');$('#known-information').open=true;});return details;
}
function renderContacts(record) {
  const {details,content}=accordion(`Conversation history · ${record.contacts.length} logged`,'contact-history');
  content.append(node('p','Record what was discussed and the agreed next step so another teammate can pick up the conversation.','muted small'));
  const form=node('form'),grid=node('div',undefined,'crm-form-grid');form.id='contact-log-form';
  const date=inputField(grid,'contact','Contact date','date','date',todayKey());date.required=true;date.max=todayKey();
  const method=inputField(grid,'contact','Contact method','method',null,'Phone',['Phone','In person','Email','Text','Other']);
  const outcome=inputField(grid,'contact','Outcome','outcome',null,'Spoke with prospect',['Spoke with prospect','Left message','No answer','Information sent','Meeting completed']);
  const summary=inputField(grid,'contact','What was discussed / answers confirmed','summary','textarea','');summary.required=true;
  const next=inputField(grid,'contact','Agreed next action','nextAction','textarea',record.knowledge.nextAction);
  form.append(grid);const error=formError(form);saveButton(form,'Log conversation');content.append(form);
  const list=node('ul',undefined,'note-list');record.contacts.forEach(entry=>{const item=node('li');item.append(node('strong',`${entry.date} · ${entry.method} · ${entry.author}`),node('p',entry.outcome+': '+entry.summary),node('p','Next action: '+(entry.nextAction||'Not recorded')));list.append(item);});content.append(list);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;if(!summary.value.trim())return reportError(error,'Enter what was discussed or what contact was attempted.');record.contacts.unshift({date:date.value,method:method.value,outcome:outcome.value,summary:summary.value.trim(),nextAction:next.value.trim(),author:identity});record.contacts.sort((a,b)=>b.date.localeCompare(a.date));record.knowledge.nextAction=next.value.trim();logProgress(record,'Logged contact: '+outcome.value+'.');refreshProspect('Conversation logged. The shared recap is updated.');$('#contact-history').open=true;});return details;
}

function renderReferral(record) {
  const r=record.referral,{details,content}=accordion(`Installer referral · ${r.status}`,'installer-referral');
  content.append(node('p','Track the installer handoff here. Saving does not send a referral or change the pipeline stage automatically. Installer names and contacts must be fictional in this demo.','muted small'));
  const form=node('form'),grid=node('div',undefined,'crm-form-grid');form.id='referral-form';
  const installer=inputField(grid,'referral','Installer / company','installer','text',r.installer);
  const contact=inputField(grid,'referral','Installer contact person','contact','text',r.contact);
  const email=inputField(grid,'referral','Installer email','email','email',r.email);
  const phone=inputField(grid,'referral','Installer phone','phone','tel',r.phone);
  const date=inputField(grid,'referral','Date referred','date','date',r.date);date.max=todayKey();
  const status=inputField(grid,'referral','Referral status','status',null,r.status,referralStatuses);
  const notes=inputField(grid,'referral','Referral details / installer response','notes','textarea',r.notes);
  function required(){installer.required=status.value!=='Not referred';date.required=status.value!=='Not referred';}required();status.addEventListener('change',required);
  form.append(grid);const error=formError(form);saveButton(form,'Save referral details');content.append(form);
  form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;if(status.value!=='Not referred'&&!installer.value.trim())return reportError(error,'Enter the installer receiving this referral.');record.referral={installer:installer.value.trim(),contact:contact.value.trim(),email:email.value.trim(),phone:phone.value.trim(),date:date.value,status:status.value,notes:notes.value.trim()};logProgress(record,`Referral updated: ${status.value}${installer.value.trim()?' · '+installer.value.trim():''}.`);refreshProspect('Installer referral details updated.');$('#installer-referral').open=true;});return details;
}

function renderPayments(record) {
  const outstanding=record.earned-record.paid;
  const overdue=outstanding>0&&record.commission.dueDate&&record.commission.dueDate<todayKey();
  const {details,content}=accordion(`Commission details & payments · ${money(outstanding/100)} awaiting payment${overdue?' · overdue':''}`,'commission-payments');
  content.append(node('p','Track who owes the commission, its earning milestone, and each payment actually received. Received totals are calculated from this ledger.','muted small'));
  const metadata=node('form'),grid=node('div',undefined,'crm-form-grid');metadata.id='commission-details-form';
  const payer=inputField(grid,'commission','Commission payer / installer','payer','text',record.commission.payer);
  const trigger=inputField(grid,'commission','Agreed earning milestone / terms','trigger','textarea',record.commission.trigger);
  const earnedDate=inputField(grid,'commission','Date commission earned','earnedDate','date',record.commission.earnedDate);earnedDate.max=todayKey();
  const dueDate=inputField(grid,'commission','Expected payment date','dueDate','date',record.commission.dueDate);
  metadata.append(grid);saveButton(metadata,'Save commission details');content.append(metadata);
  if(overdue)content.append(node('p',`Payment overdue: ${money(outstanding/100)} outstanding; expected ${record.commission.dueDate}.`,'crm-error'));
  metadata.addEventListener('submit',event=>{event.preventDefault();if(!metadata.reportValidity())return;record.commission={payer:payer.value.trim(),trigger:trigger.value.trim(),earnedDate:earnedDate.value,dueDate:dueDate.value};logProgress(record,'Updated commission payer, earning terms, or expected payment date.');refreshProspect('Commission payment details updated.');$('#commission-payments').open=true;});
  content.append(node('h3','Payments received'));
  const tableWrap=node('div',undefined,'table-wrap'),table=node('table'),head=node('thead'),tr=node('tr');['Received','Payer / reference','Amount','Action'].forEach(text=>{const th=node('th',text);th.scope='col';tr.append(th);});head.append(tr);table.append(head);const body=node('tbody');
  let editingId=null;
  record.payments.forEach(payment=>{const row=node('tr'),action=node('td'),edit=node('button','Edit','quiet');edit.type='button';edit.setAttribute('aria-label','Edit payment '+payment.reference+' '+payment.date);edit.addEventListener('click',()=>{editingId=payment.id;payDate.value=payment.date;payAmount.value=(payment.amount/100).toFixed(2);payPayer.value=payment.payer;reference.value=payment.reference;note.value=payment.note;save.textContent='Save payment changes';cancel.hidden=false;payAmount.focus();});action.append(edit);row.append(node('td',payment.date),node('td',payment.payer+(payment.reference?' · '+payment.reference:'')),node('td',money(payment.amount/100)),action);body.append(row);});table.append(body);tableWrap.append(table);content.append(tableWrap);
  if(!record.payments.length)content.append(node('p','No payments received yet.','muted small'));
  const form=node('form'),payGrid=node('div',undefined,'crm-form-grid');form.id='payment-form';
  const payDate=inputField(payGrid,'payment','Received date','date','date',todayKey());payDate.required=true;payDate.max=todayKey();
  const payAmount=inputField(payGrid,'payment','Payment amount ($)','amount','number','');payAmount.min='0.01';payAmount.max='1000000';payAmount.step='0.01';payAmount.required=true;
  const payPayer=inputField(payGrid,'payment','Payment received from','payer','text',record.commission.payer);payPayer.required=true;
  const reference=inputField(payGrid,'payment','Payment reference (optional)','reference','text','');
  const note=inputField(payGrid,'payment','Payment note (optional)','note','textarea','');
  form.append(payGrid);const error=formError(form),save=saveButton(form,'Record payment');
  const cancel=node('button','Cancel payment edit','quiet');cancel.type='button';cancel.hidden=true;cancel.addEventListener('click',()=>{editingId=null;form.reset();payDate.value=todayKey();payPayer.value=record.commission.payer;save.textContent='Record payment';cancel.hidden=true;error.hidden=true;});form.append(cancel);content.append(form);
  form.addEventListener('submit',event=>{
    event.preventDefault();if(!form.reportValidity())return;
    const payment={id:editingId||'PAY-'+crypto.randomUUID(),date:payDate.value,amount:CRM.parseMoney(payAmount.value),payer:payPayer.value.trim(),reference:reference.value.trim(),note:note.value.trim()};
    const problem=CRM.validatePayment(payment,record.payments,record.earned,editingId);if(problem)return reportError(error,problem);
    const duplicate=record.payments.find(p=>p.id!==editingId&&payment.reference&&p.reference.toLowerCase()===payment.reference.toLowerCase()&&p.payer.toLowerCase()===payment.payer.toLowerCase());
    if(duplicate)return reportError(error,'This payer and payment reference are already recorded. Edit the existing payment instead.');
    if(editingId)record.payments=record.payments.map(p=>p.id===editingId?payment:p);else record.payments.push(payment);
    record.paid=record.payments.reduce((sum,p)=>sum+p.amount,0);
    logProgress(record,`${editingId?'Edited':'Recorded'} payment ${money(payment.amount/100)} from ${payment.payer} on ${payment.date}.`);
    refreshProspect('Payment ledger and received commission totals updated.');$('#commission-payments').open=true;
  });return details;
}

function renderLearningInsights() {
  $('#source-insights').replaceChildren(...CRM.leadSources.filter(source=>requests.some(r=>r.leadSource===source)).map(source=>{const records=requests.filter(r=>r.leadSource===source),row=node('tr'),th=node('th',source);th.scope='row';row.append(th,node('td',String(records.length)),node('td',String(records.filter(r=>r.stage==='Closed won').length)),node('td',String(records.filter(r=>r.stage==='Closed lost').length)));return row;}));
  const lost=requests.filter(r=>r.stage==='Closed lost'),reasons=[...new Set(lost.map(r=>r.lostReason||'Not recorded'))];
  $('#loss-insights').replaceChildren(...(reasons.length?reasons.map(reason=>node('li',`${reason}: ${lost.filter(r=>(r.lostReason||'Not recorded')===reason).length}`)):[node('li','No closed-lost prospects yet.')]));
}
