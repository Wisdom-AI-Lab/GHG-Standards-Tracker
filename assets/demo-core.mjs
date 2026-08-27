import {PUBLIC_SOURCE,PUBLIC_ENTITIES,FICTIONAL_ENTITIES,SCENARIOS,DEMO_RULES,GUIDED_QUESTIONS} from '../data/client-demo.mjs';
import {dateRange} from './core.mjs';

export {PUBLIC_SOURCE,PUBLIC_ENTITIES,SCENARIOS,GUIDED_QUESTIONS};
export const RESULTS={match:'Demo trigger matched',no_match:'Demo trigger not met',unknown:'Requires more facts',outside:'Outside scenario group'};
export const BOUNDARIES={financial_control:'Financial control',operational_control:'Operational control',equity_share:'Equity share'};
export function createDemoState() {
  return {profile:'fictional',scenario:'baseline',asOf:'2027-02-01',boundary:'financial_control',entity:'all',jurisdiction:'all',tab:'graph',sources:['public-entities','fictional-facts','demo-rules','ifrs'],question:'',answer:null,saved:[],notice:''};
}
export function snapshot({scenario='baseline',asOf='2027-02-01'}={}) {
  if(!Object.hasOwn(SCENARIOS,scenario)||!dateRange(asOf)||asOf.length!==10)throw new Error('Invalid demo scenario or date');
  const entities=structuredClone(FICTIONAL_ENTITIES), rules=structuredClone(DEMO_RULES);
  const event=SCENARIOS[scenario];
  const applied=!!event.effective_on&&asOf>=event.effective_on;
  if(applied&&scenario==='acquisition')Object.assign(entities.find(e=>e.id==='orchid'),{member:true,ownership:40,financial_control:true,operational_control:false});
  if(applied&&scenario==='divestment')Object.assign(entities.find(e=>e.id==='atlas-au'),{member:false,ownership:0,financial_control:false,operational_control:false});
  if(applied&&scenario==='regulation')Object.assign(rules[0].conditions[1],{value:200,label:'Revenue ≥ USD 200m (invented threshold)'});
  return {entities,rules,applied,scenario,asOf,version:applied&&scenario==='regulation'?'illustrative-v2':'illustrative-v1'};
}
export function isMember(entity,entities,seen=new Set()) {
  if(!entity||!entity.member||seen.has(entity.id))return false;
  if(!entity.parent)return true;
  seen.add(entity.id);return isMember(entities.find(e=>e.id===entity.parent),entities,seen);
}
export function boundaryPosition(entity,entities,method) {
  if(!Object.hasOwn(BOUNDARIES,method))return 'Unknown boundary method';
  if(!isMember(entity,entities))return 'Outside group view';
  if(method==='equity_share')return entity.ownership==null?'Ownership unknown':`${entity.ownership}% illustrative allocation`;
  const control=entity[method];
  return control==null?'Control unknown':control?'Included (fictional control fact)':'Excluded by this boundary method';
}
function conditionResult(entity,c) {
  const value=entity[c.field];
  const pass=value==null?null:c.op==='eq'?value===c.value:c.op==='gte'&&typeof value==='number'?value>=c.value:null;
  return {...c,actual:value,pass};
}
export function assess(entity,rule,snap) {
  const trace=rule.conditions.map(c=>conditionResult(entity,c));
  const status=!isMember(entity,snap.entities)?'outside':trace.some(c=>c.pass===false)?'no_match':trace.some(c=>c.pass===null)?'unknown':'match';
  return {id:`${entity.id}:${rule.id}`,entityId:entity.id,entity:entity.name,jurisdiction:rule.jurisdiction,rule:rule.id,instrument:rule.title,standard:rule.standard,trigger:rule.trigger,period:snap.asOf.slice(0,4),status,trace,version:snap.version,
    note:status==='outside'?'Outside this group scenario only; local obligations are not assessed.':status==='unknown'?'Missing input prevents a demonstration conclusion.':'Evaluation of invented conditions only. No legal or client applicability conclusion.'};
}
export function assessmentRows(state) {
  if(state.profile==='public')return PUBLIC_ENTITIES.map(entity=>({id:entity.id,entityId:entity.id,entity:entity.name,jurisdiction:entity.jurisdiction,rule:'Not researched',instrument:'Local adoption instrument not assessed',standard:'IFRS / ISSB mapping not established',trigger:'Jurisdiction observed; listing, nexus, size and exemptions unknown',period:'Not assessed',status:'unknown',trace:[],version:'Public snapshot 2025-12-27',note:'A subsidiary listing alone cannot establish regulatory applicability.'}));
  const snap=snapshot(state);
  return snap.entities.filter(e=>e.type==='entity').flatMap(entity=>snap.rules.map(rule=>assess(entity,rule,snap)));
}
export function visibleRows(state) {
  return assessmentRows(state).filter(r=>(state.entity==='all'||state.entity===r.entityId)&&(state.jurisdiction==='all'||state.jurisdiction===r.jurisdiction));
}
export function scenarioDiff(state) {
  if(state.profile==='public')return [];
  const before=assessmentRows({...state,scenario:'baseline'});
  return assessmentRows(state).map(row=>({...row,before:before.find(b=>b.id===row.id).status})).filter(row=>row.status!==row.before);
}
export function demoSources(data) {
  const ifrs=data.records.find(r=>r.id==='ifrs-s2-ghg-amendments');
  return [
    {...PUBLIC_SOURCE,text:PUBLIC_SOURCE.note+' Selected rows and exhibit page references are shown in the public workspace.'},
    {id:'fictional-facts',title:'Atlas group facts · sample brief',kind:'Fictional source',url:null,text:'Atlas, its subsidiaries, financial inputs and control facts are invented. The acquisition stipulates 40% ownership with financial control and no operational control. Scenarios take effect on 1 January 2027. These are not facts about PepsiCo.'},
    {id:'demo-rules',title:'Illustrative policy pack · AU / SG / UK',kind:'Invented rules · NOT law',url:null,text:'DEMO-AU-01: Australian incorporation AND revenue ≥ USD 100m; the rule-change scenario increases the threshold to USD 200m. DEMO-SG-01: Singapore incorporation AND listed status. DEMO-UK-01: UK economic nexus AND revenue ≥ USD 100m, including entities incorporated elsewhere. All thresholds, mappings and instruments are invented; no exemptions are modelled.'},
    {id:'ifrs',title:'IFRS S2 amendment source note',kind:'Official source · bounded summary',url:ifrs?.sources[0]?.url||null,text:ifrs?`${ifrs.summary} ${ifrs.applicability}`:'The IFRS S2 source record is unavailable. No answer can be supported.',available:!!ifrs}
  ];
}
const normalise=value=>String(value).toLowerCase().replace(/[?.,!]/g,'').replace(/\s+/g,' ').trim();
export function answerQuestion(input,state,data) {
  const question=GUIDED_QUESTIONS.find(q=>[q.question,...q.aliases].some(label=>normalise(label)===normalise(input)));
  if(!question)return {supported:false,title:'Outside the guided demo',text:'No live AI model is connected. Choose one of the five example questions. This demo does not analyse arbitrary questions or uploaded files.',citations:[]};
  const citations=question.id==='ifrs'?['ifrs']:question.id==='boundary'||state.profile==='public'?['public-entities']:['fictional-facts','demo-rules'];
  const sources=demoSources(data);
  const missing=citations.filter(id=>!state.sources.includes(id)||sources.find(s=>s.id===id)?.available===false);
  if(missing.length)return {supported:false,title:'Required evidence is not selected',text:'Select the following source(s) before this guided answer can be shown: '+missing.map(id=>sources.find(s=>s.id===id)?.title||id).join('; ')+'. No answer has been inferred from excluded sources.',citations:[]};
  let text,rows=[];
  if(question.id==='ifrs')text=sources.find(s=>s.id==='ifrs').text;
  else if(question.id==='boundary')text='No. This selected public subsidiary list supports names and jurisdictions at 27 December 2025. Direct parents, ownership percentages, operational and financial control, and reporting boundaries require additional evidence. The public graph uses “listed subsidiary” links, not direct-ownership links.';
  else if(state.profile==='public'){
    text=question.id==='changes'?'Business scenarios are disabled for the real-company example. Switch to Atlas to simulate changes without inventing PepsiCo transactions.':question.id==='missing'?'Missing: direct parent and ownership evidence; control assessments; listing and economic-nexus facts; financial thresholds; reporting periods; applicable instruments and exemptions. No real-client conclusion is possible from this extract.':'Five entity/jurisdiction pairs are visible in the selected public extract. Local instruments and triggers have not been assessed; every row remains unresolved.';
    if(question.id==='matrix')rows=assessmentRows(state);
  } else if(question.id==='matrix'){
    rows=assessmentRows(state);
    const matches=rows.filter(r=>r.status==='match').length;
    text=`Across all fictional entities and the three invented rules, ${matches} entity/rule pairs match the demonstration conditions at ${state.asOf}. This ignores the workspace table filters. These are simulated results, not IFRS/ISSB legal applicability findings.`;
  } else if(question.id==='changes'){
    rows=scenarioDiff(state);
    text=`${rows.length} demonstration assessment rows differ from the baseline at ${state.asOf}. ${snapshot(state).applied?'The selected fictional event is effective in this scenario.':'No scenario event is effective at this date.'} Boundary changes and entity obligations must be assessed separately.`;
  } else {
    rows=assessmentRows(state).filter(r=>r.status==='unknown');
    text='Atlas UK Distribution has missing revenue and listing inputs. The invented nexus rule cannot resolve without revenue. In a real assessment, legal instruments, exemptions, control evidence, local adoption and period-specific thresholds would also need verification.';
  }
  return {supported:true,title:question.question,text,rows,citations,context:state.profile==='public'?'Public evidence snapshot · 27 Dec 2025':`Atlas · ${SCENARIOS[state.scenario].label} · ${state.asOf} · ${BOUNDARIES[state.boundary]}`,questionId:question.id};
}

export function validateDemo() {
  const errors=[];const ids=new Set(FICTIONAL_ENTITIES.map(e=>e.id));
  if(ids.size!==FICTIONAL_ENTITIES.length)errors.push('Duplicate fictional entity IDs');
  for(const entity of FICTIONAL_ENTITIES){
    if(entity.parent&&!ids.has(entity.parent))errors.push('Unknown parent: '+entity.id);
    if(entity.ownership!=null&&(entity.ownership<0||entity.ownership>100))errors.push('Invalid ownership: '+entity.id);
    if(entity.revenue_musd!=null&&(typeof entity.revenue_musd!=='number'||entity.revenue_musd<0))errors.push('Invalid revenue: '+entity.id);
  }
  for(const rule of DEMO_RULES)if(!rule.id.startsWith('DEMO-')||!rule.conditions.length)errors.push('Invalid illustrative rule');
  for(const entity of PUBLIC_ENTITIES)if(entity.parent||'ownership' in entity||'financial_control' in entity)errors.push('Unverified public control facts');
  return errors;
}

// A small reducer makes the in-memory walkthrough reproducible and testable.
export function updateDemo(state,action,value,data) {
  const next=structuredClone(state);
  if(action==='profile'&&['fictional','public'].includes(value))Object.assign(next,{profile:value,entity:'all',jurisdiction:'all',notice:''});
  if(action==='scenario'&&state.profile==='fictional'&&Object.hasOwn(SCENARIOS,value))next.scenario=value;
  if(action==='date'&&state.profile==='fictional'&&dateRange(value)&&value.length===10)next.asOf=value;
  if(action==='boundary'&&Object.hasOwn(BOUNDARIES,value))next.boundary=value;
  if(action==='tab'&&['graph','matrix','changes'].includes(value))next.tab=value;
  if(action==='entity'&&(value==='all'||(state.profile==='public'?PUBLIC_ENTITIES:snapshot(state).entities).some(x=>x.id===value)))next.entity=value;
  if(action==='jurisdiction'&&(value==='all'||assessmentRows(state).some(r=>r.jurisdiction===value)))next.jurisdiction=value;
  if(action==='clear-filters')Object.assign(next,{entity:'all',jurisdiction:'all'});
  if(action==='source-toggle'&&demoSources(data).some(s=>s.id===value))next.sources=next.sources.includes(value)?next.sources.filter(id=>id!==value):[...next.sources,value];
  if(action==='question'){
    const q=GUIDED_QUESTIONS.find(q=>q.id===value);
    if(q)Object.assign(next,{question:q.question,answer:q.question,notice:''});
  }
  if(action==='ask')Object.assign(next,{question:String(value).slice(0,500),answer:String(value).slice(0,500),notice:''});
  if(action==='save'){
    const answer=answerQuestion(state.answer||'',state,data);
    if(!answer.supported)next.notice='Only a supported response with selected evidence can be saved.';
    else if(next.saved.length>=5)next.notice='Five-note demo limit reached. Clear the session notes to start again.';
    else {next.saved.push(structuredClone(answer));next.notice='Response saved in this page session only.';}
  }
  if(action==='clear-notes')Object.assign(next,{saved:[],notice:'Session notes cleared.'});
  return next;
}
