import {PUBLIC_SOURCE,PUBLIC_ENTITIES,FICTIONAL_ENTITIES,SCENARIOS,GUIDED_QUESTIONS} from '../data/client-demo.mjs';
import {REAL_REQUIREMENTS,REGULATORY_SOURCES,RULESET_VERSION,REPORTING_PERIODS} from '../data/requirements.mjs';
import {dateRange,safeUrl} from './core.mjs';

export {PUBLIC_SOURCE,PUBLIC_ENTITIES,SCENARIOS,GUIDED_QUESTIONS,REPORTING_PERIODS};
export const RESULTS={match:'Screen matched · fictional facts',no_match:'Selected route not matched',unknown:'Requires more facts',not_due:'Before selected route starts',not_covered:'Coverage not researched',outside:'Outside scenario group'};
export const BOUNDARIES={financial_control:'Financial control',operational_control:'Operational control',equity_share:'Equity share'};
export function createDemoState(){
  return {profile:'fictional',scenario:'baseline',asOf:'2027-02-01',reportingStart:'2026-07-01',boundary:'financial_control',entity:'all',jurisdiction:'all',tab:'graph',sources:['public-entities','fictional-facts',...REGULATORY_SOURCES.map(s=>s.id),'ifrs'],question:'',answer:null,saved:[],notice:''};
}
const fullDate=value=>typeof value==='string'&&value.length===10&&!!dateRange(value);
export function snapshot({scenario='baseline',asOf='2027-02-01',reportingStart='2026-07-01'}={}){
  if(!Object.hasOwn(SCENARIOS,scenario)||!fullDate(asOf)||!fullDate(reportingStart))throw new Error('Invalid demo scenario or date');
  const entities=structuredClone(FICTIONAL_ENTITIES),rules=structuredClone(REAL_REQUIREMENTS),event=SCENARIOS[scenario];
  const applied=scenario==='regulation'||!!event.effective_on&&asOf>=event.effective_on;
  if(applied&&scenario==='acquisition')Object.assign(entities.find(e=>e.id==='orchid'),{member:true,ownership:40,financial_control:true,operational_control:false});
  if(applied&&scenario==='divestment')Object.assign(entities.find(e=>e.id==='atlas-au'),{member:false,ownership:0,financial_control:false,operational_control:false});
  return {entities,rules,applied,scenario,asOf,reportingStart:scenario==='regulation'?'2028-01-01':reportingStart,version:RULESET_VERSION};
}
export function isMember(entity,entities,seen=new Set()){
  if(!entity||!entity.member||seen.has(entity.id))return false;
  if(!entity.parent)return true;
  seen.add(entity.id);return isMember(entities.find(e=>e.id===entity.parent),entities,seen);
}
export function boundaryPosition(entity,entities,method){
  if(!Object.hasOwn(BOUNDARIES,method))return 'Unknown boundary method';
  if(!isMember(entity,entities))return 'Outside group view';
  if(method==='equity_share')return entity.ownership==null?'Ownership unknown':`${entity.ownership}% illustrative allocation`;
  const control=entity[method];
  return control==null?'Control unknown':control?'Included (fictional control fact)':'Excluded by this boundary method';
}
const fact=(label,actual,expected=true)=>({label,actual,pass:actual==null?null:actual===expected});
const threshold=(label,actual,min)=>({label,actual,pass:typeof actual==='number'&&Number.isFinite(actual)&&actual>=0?actual>=min:null,group:'size'});
export function atLeastTwo(trace){
  const passed=trace.filter(t=>t.pass===true).length,unknown=trace.filter(t=>t.pass===null).length;
  return passed>=2?true:passed+unknown<2?false:null;
}
// Local screening is independent of group membership and GHG boundary selection.
export function evaluateRequirement(entity,rule,snap){
  let trace=[],status,phase='',missing=[],limits;
  if(rule.kind==='au_size'){
    const active=[...rule.phases].reverse().find(p=>snap.reportingStart>=p.start);
    trace=[fact('Australian incorporation',entity.jurisdiction,'Australia'),fact('Chapter 2M annual financial report required',entity.au_ch2m)];
    limits='Corporate-size route only. NGER, asset-owner routes, relief and group reporting choices need separate review. Year-end facts determine the actual obligation.';
    if(trace.some(t=>t.pass===false))status='no_match';
    else if(!active)status='not_due';
    else{
      phase=active.label;
      const amounts=entity.financials?.[snap.reportingStart];
      const sizes=[threshold(`Consolidated revenue ≥ AUD ${active.revenue}m`,amounts?.revenue_maud,active.revenue),threshold(`Year-end consolidated gross assets ≥ AUD ${active.assets}m`,amounts?.assets_maud,active.assets),threshold(`Year-end employees ≥ ${active.employees}`,amounts?.employees,active.employees)];
      const sizeResult=atLeastTwo(sizes);
      trace.push(...sizes,{label:'At least two of the three size criteria',actual:sizes.filter(t=>t.pass===true).length+' confirmed matches',pass:sizeResult});
      if(entity.au_ordinary_company!==true){status='not_covered';missing.push('Confirm supported ordinary-company route; special entity types require separate assessment');}
      else if(sizeResult===false)status='no_match';
      else{
        trace.push(fact('No relevant relief or consolidated-report substitution (scenario assumption)',entity.au_no_relief));
        status=trace.some(t=>t.pass===null)||entity.au_no_relief!==true?'unknown':'match';
        // Two known passes suffice even if the third size input is unavailable.
        if(sizeResult===true&&trace.filter(t=>t.group!=='size').every(t=>t.pass===true))status='match';
        if(entity.au_no_relief===false)missing.push('Assess the specific relief or group reporting arrangement');
      }
    }
  }else{
    trace=[fact('Subject to SGX Mainboard climate-reporting requirements',entity.sgx_mainboard)];
    if(rule.sti)trace.push(fact('STI constituent on 30 June 2025 (historical anchor)',entity.sti_at_2025_06_30));
    limits=rule.sti?'Only the historical STI route is screened. Non-STI phased routes and other listing regimes are not assessed. A non-match is not an exemption.':'Mainboard route only; other listing regimes, individual waivers and filing/assurance requirements are not assessed.';
    if(trace.some(t=>t.pass===false))status='no_match';
    else if(snap.reportingStart<rule.start)status='not_due';
    else{
      trace.push(fact('No applicable individual waiver (scenario assumption)',entity.sgx_no_waiver));
      status=trace.every(t=>t.pass===true)?'match':'unknown';
      if(entity.sgx_no_waiver===false)missing.push('Assess the specific SGX waiver');
    }
    phase='Financial years starting on/after '+rule.start;
  }
  missing.push(...trace.filter(t=>t.pass===null).map(t=>t.label));
  const inGroup=isMember(entity,snap.entities);
  return {id:`${entity.id}:${rule.id}`,entityId:entity.id,entity:entity.name,jurisdiction:rule.jurisdiction,rule:rule.id,instrument:rule.title,standard:rule.standard,trigger:rule.trigger,period:snap.reportingStart,status,trace,missing:[...new Set(missing)],inGroup,phase,version:snap.version,citations:['fictional-facts',...rule.sources],locator:rule.locator,limits,
    note:(inGroup?'':'Outside this group view; the local screen is retained. ')+(status==='match'?'The selected source-backed conditions match the fictional inputs. Human review is still required.':status==='unknown'?'Missing or unresolved evidence prevents a screening conclusion.':'This result concerns this selected route only, not all legal obligations.')};
}
export function assessmentRows(state){
  if(state.profile==='public')return PUBLIC_ENTITIES.map(entity=>({id:entity.id,entityId:entity.id,entity:entity.name,jurisdiction:entity.jurisdiction,rule:'Not researched',instrument:'Local adoption instrument not assessed',standard:'IFRS / ISSB mapping not established',trigger:'Entity facts and applicable route not established',period:'Not assessed',status:'unknown',trace:[],missing:['Reporting period','Listing and control evidence','Financial facts','Applicable instruments and relief'],inGroup:true,version:'Public snapshot 2025-12-27',citations:['public-entities'],note:'A subsidiary listing alone cannot establish regulatory applicability.'}));
  const snap=snapshot(state);
  const rows=snap.entities.filter(e=>e.type==='entity').flatMap(entity=>snap.rules.map(rule=>evaluateRequirement(entity,rule,snap)));
  const uk=snap.entities.find(e=>e.id==='atlas-uk');
  rows.push({id:'atlas-uk:UK-COVERAGE',entityId:uk.id,entity:uk.name,jurisdiction:'United Kingdom',rule:'UK-COVERAGE',instrument:'UK domestic coverage not implemented',standard:'No UK adoption mapping established',trigger:'Jurisdiction coverage gap',period:snap.reportingStart,status:'not_covered',trace:[],missing:['Reviewed UK instrument and entity-scope assessment'],inGroup:true,version:RULESET_VERSION,citations:['fictional-facts'],note:'SGX listing-based checks do not assess this entity’s UK obligations.'});
  return rows;
}
export function visibleRows(state){return assessmentRows(state).filter(r=>(state.entity==='all'||state.entity===r.entityId)&&(state.jurisdiction==='all'||state.jurisdiction===r.jurisdiction));}
export function scenarioDiff(state){
  if(state.profile==='public')return [];
  const before=assessmentRows({...state,scenario:'baseline'});
  return assessmentRows(state).map(row=>{const old=before.find(b=>b.id===row.id);return {...row,before:old.status,beforeInGroup:old.inGroup,beforePeriod:old.period};}).filter(row=>row.status!==row.before||row.inGroup!==row.beforeInGroup);
}
export function demoSources(data){
  const ifrs=data.records.find(r=>r.id==='ifrs-s2-ghg-amendments');
  return [
    {...PUBLIC_SOURCE,text:PUBLIC_SOURCE.note+' Selected rows and exhibit page references are shown in the optional public workspace.'},
    {id:'fictional-facts',title:'Atlas · fictional entity evidence',kind:'Fictional company facts',url:null,text:'All Atlas company facts are authored assumptions, including Mainboard coverage, historical STI membership, control and absence of relief. Pacific has separate illustrative consolidated figures for each selectable financial year: AUD 240m revenue, AUD 600m assets and 200 employees. Straits is assumed in the historical STI cohort. UK Distribution is assumed subject to SGX Mainboard rules, but its historical STI membership is unknown. Orchid is Mainboard-listed and outside the historical STI cohort. Acquisition adds it to the group without creating its local obligations. Group root and facility are not separately screened. These are not PepsiCo facts or actual client records.'},
    ...REGULATORY_SOURCES,
    {id:'ifrs',title:'IFRS S2 amendment source note',kind:'Official source · bounded summary',url:ifrs?.sources[0]?.url||null,text:ifrs?`${ifrs.summary} ${ifrs.applicability}`:'The IFRS S2 source record is unavailable. No answer can be supported.',available:!!ifrs}
  ];
}
const normalise=value=>String(value).toLowerCase().replace(/[?.,!]/g,'').replace(/\s+/g,' ').trim();
export function answerQuestion(input,state,data){
  const question=GUIDED_QUESTIONS.find(q=>[q.question,...q.aliases].some(label=>normalise(label)===normalise(input)));
  if(!question)return {supported:false,title:'Outside the guided demo',text:'No live AI model is connected. Choose one of the five example questions. This demo does not analyse arbitrary questions or uploaded files.',citations:[]};
  const citations=question.id==='ifrs'?['ifrs']:state.profile==='public'?['public-entities']:['fictional-facts',...REGULATORY_SOURCES.map(s=>s.id)];
  const sources=demoSources(data),missing=citations.filter(id=>!state.sources.includes(id)||sources.find(s=>s.id===id)?.available===false);
  if(missing.length)return {supported:false,title:'Required evidence is not selected',text:'Select the following source(s) before this guided answer can be shown: '+missing.map(id=>sources.find(s=>s.id===id)?.title||id).join('; ')+'. No answer has been inferred from excluded sources.',citations:[]};
  let text,rows=[];
  const allRows=assessmentRows(state),snap=state.profile==='fictional'?snapshot(state):null;
  if(question.id==='ifrs')text=sources.find(s=>s.id==='ifrs').text;
  else if(state.profile==='public'){
    text=question.id==='changes'?'Business scenarios are disabled for the optional public example. Use Atlas for the presentation.':question.id==='boundary'?'The subsidiary list supports selected names and jurisdictions at its stated date, not direct ownership, control or legal applicability.':question.id==='missing'?'Missing: verified reporting periods, direct ownership/control, listing, financial facts, applicable instruments and relief. The real-rule pack has not been applied to these public records.':'Five entity/jurisdiction pairs are visible in the optional public extract; every row remains unresolved.';
    if(question.id==='matrix'||question.id==='missing')rows=allRows;
  }else if(question.id==='matrix'){
    rows=allRows;
    text=`${rows.filter(r=>r.inGroup&&r.status==='match').length} in-group entity/requirement pairs pass the selected screens for financial years starting ${snap.reportingStart}. Company facts are fictional; requirements are source-checked, with human review pending. The full matrix ignores table filters. Non-matches do not exclude other routes, and the UK coverage gap remains explicit.`;
  }else if(question.id==='changes'){
    rows=scenarioDiff(state);
    text=`${rows.length} rows change screening status or group membership against the baseline. ${state.scenario==='regulation'?`Reporting periods compared: ${state.reportingStart} → ${snap.reportingStart}; the source-backed rules are unchanged.`:'Acquisition and divestment change the group view, not the existence of an entity’s local legal obligations.'} Organisation snapshot: ${state.asOf}.`;
  }else if(question.id==='missing'){
    rows=allRows.filter(r=>r.inGroup&&['unknown','not_covered'].includes(r.status));
    text='The rows below name unresolved inputs or unresearched coverage. UK Distribution’s historical STI membership is unknown; its SGX listing alone cannot resolve the STI-specific routes. UK domestic requirements still need research. All fictional assumptions, relief positions and year-end financial facts require verification before client use.';
  }else text='A match means only that fictional facts satisfy a selected, source-backed screening route. Read each row’s condition trace, source locator, reporting-period start, missing inputs and scope limits. Local adoption is separate from a standard’s effective date. GHG boundary choices do not switch legal obligations on or off. This is not a legal opinion, full compliance assessment or human approval.';
  return {supported:true,title:question.question,text,rows,citations,context:state.profile==='public'?'Optional public evidence · 27 Dec 2025':`Atlas · ${SCENARIOS[state.scenario].label} · organisation ${state.asOf} · FY start ${snap.reportingStart} · ${BOUNDARIES[state.boundary]} · sources checked 27 Aug 2026`,questionId:question.id};
}
export function validateDemo(){
  const errors=[],ids=new Set(FICTIONAL_ENTITIES.map(e=>e.id));
  if(ids.size!==FICTIONAL_ENTITIES.length)errors.push('Duplicate fictional entity IDs');
  for(const entity of FICTIONAL_ENTITIES){
    if(entity.parent&&!ids.has(entity.parent))errors.push('Unknown parent: '+entity.id);
    if(entity.ownership!=null&&(entity.ownership<0||entity.ownership>100))errors.push('Invalid ownership: '+entity.id);
    for(const [period,amounts] of Object.entries(entity.financials||{})){
      if(!fullDate(period))errors.push('Invalid financial period');
      for(const value of Object.values(amounts))if(value!=null&&(!Number.isFinite(value)||value<0))errors.push('Invalid financial input');
    }
  }
  for(const rule of REAL_REQUIREMENTS){
    if(!rule.sources.length||rule.sources.some(id=>!REGULATORY_SOURCES.some(s=>s.id===id&&safeUrl(s.url)&&s.review==='source_checked')))errors.push('Missing regulatory source: '+rule.id);
    if(rule.kind==='au_size'&&rule.phases.some(p=>!fullDate(p.start)))errors.push('Invalid phase date');
  }
  for(const entity of PUBLIC_ENTITIES)if(entity.parent||'ownership' in entity||'financial_control' in entity||'sgx_mainboard' in entity)errors.push('Unverified public facts');
  return errors;
}
export function updateDemo(state,action,value,data){
  const next=structuredClone(state);
  if(action==='profile'&&['fictional','public'].includes(value))Object.assign(next,{profile:value,entity:'all',jurisdiction:'all',notice:''});
  if(action==='scenario'&&state.profile==='fictional'&&Object.hasOwn(SCENARIOS,value))next.scenario=value;
  if(action==='date'&&state.profile==='fictional'&&fullDate(value))next.asOf=value;
  if(action==='period'&&state.profile==='fictional'&&REPORTING_PERIODS.includes(value))next.reportingStart=value;
  if(action==='boundary'&&Object.hasOwn(BOUNDARIES,value))next.boundary=value;
  if(action==='tab'&&['graph','matrix','changes'].includes(value))next.tab=value;
  if(action==='entity'&&(value==='all'||(state.profile==='public'?PUBLIC_ENTITIES:snapshot(state).entities).some(x=>x.id===value)))next.entity=value;
  if(action==='jurisdiction'&&(value==='all'||assessmentRows(state).some(r=>r.jurisdiction===value)))next.jurisdiction=value;
  if(action==='clear-filters')Object.assign(next,{entity:'all',jurisdiction:'all'});
  if(action==='source-toggle'&&demoSources(data).some(s=>s.id===value))next.sources=next.sources.includes(value)?next.sources.filter(id=>id!==value):[...next.sources,value];
  if(action==='question'){const q=GUIDED_QUESTIONS.find(q=>q.id===value);if(q)Object.assign(next,{question:q.question,answer:q.question,notice:''});}
  if(action==='ask')Object.assign(next,{question:String(value).slice(0,500),answer:String(value).slice(0,500),notice:''});
  if(action==='save'){
    const answer=answerQuestion(state.answer||'',state,data);
    if(!answer.supported)next.notice='Only a supported response with selected evidence can be saved.';
    else if(next.saved.length>=5)next.notice='Five-note demo limit reached. Clear the session notes to start again.';
    else{next.saved.push(structuredClone(answer));next.notice='Response saved in this page session only.';}
  }
  if(action==='clear-notes')Object.assign(next,{saved:[],notice:'Session notes cleared.'});
  return next;
}
