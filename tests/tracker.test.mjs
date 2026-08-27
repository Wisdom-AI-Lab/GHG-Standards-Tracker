import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {STAGES,escapeHtml,safeUrl,dateRange,formatDate,formatTimelineDate,datePrecision,isStale,filterRecords,milestones,developments,summarise,validateDataset} from '../assets/core.mjs';
import {priorityActions} from '../assets/priority-actions.mjs';
import {INTERACTIONS,PACKAGING_RECORD_IDS,validateInteractions} from '../data/interactions.mjs';
import {renderView,renderDetail,start} from '../assets/app.mjs';
import {createDemoState,updateDemo,validateDemo,PUBLIC_SOURCE,PUBLIC_ENTITIES,snapshot,isMember,boundaryPosition,assessmentRows,evaluateRequirement,atLeastTwo,visibleRows,scenarioDiff,answerQuestion,GUIDED_QUESTIONS,assessMateriality,valueChainRows} from '../assets/demo-core.mjs';
import {REAL_REQUIREMENTS,REGULATORY_SOURCES,RULESET_VERSION} from '../data/requirements.mjs';
import {renderWorkspace,renderNotebook,renderAssessment,renderDemoSource} from '../assets/demo-views.mjs';

const data=JSON.parse(await readFile(new URL('../data/records.json',import.meta.url),'utf8'));
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const today=new Date('2026-08-27T12:00:00Z');
const clone=()=>structuredClone(data);

test('independent dataset passes validation and has no invented human approvals',()=>{
  assert.deepEqual(validateDataset(data),[]);
  assert.equal(data.records.length,20);
  assert.ok(data.records.every(r=>r.review==='source_checked'));
  assert.ok(data.records.every(r=>r.sources.every(s=>safeUrl(s.url))));
});
test('dates preserve day, month and quarter precision in UTC',()=>{
  assert.equal(formatDate('2027-01-01'),'1 Jan 2027');
  assert.equal(formatDate('2025-12'),'Dec 2025');
  assert.equal(formatDate('2027-Q2'),'Q2 2027');
  assert.equal(new Date(dateRange('2027-Q2')[1]).toISOString(),'2027-06-30T23:59:59.999Z');
  for(const value of ['2026-02-29','2027-02-30','2026-13','2026-01-00','2027-Q5','bad',null])assert.equal(dateRange(value),null);
  assert.ok(dateRange('2028-02-29'));
});
test('filters combine search tokens, framework, stage and region',()=>{
  assert.equal(filterRecords(data.records,{query:'  IFRS   emissions ',framework:'ISSB / IFRS',stage:'published',region:'Global'})[0].id,'ifrs-s2-ghg-amendments');
  assert.equal(filterRecords(data.records,{query:'Scope 2',region:'United States'}).length,0);
  assert.equal(filterRecords(data.records,{query:'CBAM',region:'European Union'}).length,1);
  assert.equal(filterRecords(data.records).length,20);
});
test('filtered metrics and stale checks derive from records, not hardcoded counts',()=>{
  const stats=summarise(data.records,today);
  assert.deepEqual(stats,{records:20,frameworks:12,pending:20,stale:0});
  assert.equal(summarise(filterRecords(data.records,{region:'United States'}),today).records,1);
  assert.equal(isStale(data.records[0],new Date('2026-10-01')),true);
  assert.equal(isStale(data.records[0],new Date('2026-08-28')),false);
});
test('upcoming timeline excludes elapsed dates and keeps a quarter until its end',()=>{
  const all=milestones(data.records,{today});
  const upcoming=milestones(data.records,{upcomingOnly:true,today});
  assert.equal(all.length,39);assert.equal(upcoming.length,22);
  assert.ok(upcoming.every(m=>dateRange(m.date)[1]>=today.getTime()));
  const duringQuarter=milestones(data.records,{upcomingOnly:true,today:new Date('2027-05-15')});
  assert.ok(duringQuarter.some(m=>m.date==='2027-Q2'));
  assert.ok(all.every((m,i)=>i===0||dateRange(all[i-1].date)[0]<=dateRange(m.date)[0]));
});
test('development log is reverse chronological without mutating source data',()=>{
  const original=JSON.stringify(data.records);
  const list=developments(data.records);
  assert.equal(list[0].date,'2026-08-20');assert.equal(list.at(-1).date,'2023-09');
  assert.equal(JSON.stringify(data.records),original);
});
test('validator catches malformed structure, duplicate IDs, dates and evidence references',()=>{
  for(const mutate of [d=>d.records.push(d.records[0]),d=>d.records[0].stage='final-final',d=>d.records[0].checked_on='2026-02-30',d=>d.records[0].sources=[],d=>d.records[0].sources=[null],d=>d.records[0].milestones[0].source=10,d=>d.records[0].milestones[0].projected=false,d=>d.records[0].tags=null,d=>d.comparisons[0].records=['missing','other'],d=>d.records[0].milestones=[null]]){
    const broken=clone();mutate(broken);assert.ok(validateDataset(broken).length>0);
  }
  assert.ok(validateDataset(null).length>0);
});
test('human review labels require actual reviewer fields',()=>{
  const d=clone();d.records[0].review='human_reviewed';assert.ok(validateDataset(d).some(e=>e.includes('reviewer')));
  d.records[0].reviewer='Demo reviewer';d.records[0].reviewed_on='2026-08-27';assert.deepEqual(validateDataset(d),[]);
  assert.equal(summarise(d.records,today).pending,19);
  d.records[0].reviewed_on='2026-Q3';assert.ok(validateDataset(d).length>0);
  d.records[0].reviewed_on='2026-09-01';assert.ok(validateDataset(d).length>0);
});
test('text and links are escaped or restricted before HTML rendering',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('data:text/html,test'),null);assert.equal(safeUrl('https://user:password@example.org'),null);
  assert.equal(escapeHtml('<script>"&\''),'&lt;script&gt;&quot;&amp;&#39;');
  const d=clone();d.records[0].title='<img src=x onerror=alert(1)>';d.records[0].sources[0].url='javascript:alert(1)';
  const result=renderDetail(d.records[0],today);assert.doesNotMatch(result,/<img|href="javascript:/);assert.match(result,/&lt;img/);
  assert.ok(validateDataset(d).length>0);
});
test('all eight views render source-linked content without undefined fields',()=>{
  for(const view of ['overview','register','updates','timeline','compare','interoperability','method','workspace','notebook']){
    const result=renderView({view,data,today});assert.ok(result.length>250);assert.doesNotMatch(result,/undefined|NaN/);
    assert.match(result,/record|source|evidence/i);
  }
  assert.match(renderView({view:'timeline',data,today,upcoming:false}),/Date elapsed · not a completion finding/);
  assert.match(renderView({view:'method',data,today}),/no scheduled research or live AI is configured/);
});
test('empty results show recovery; comparison and method are explicitly unfiltered',()=>{
  assert.match(renderView({view:'register',data,records:[],today}),/No matching records/);
  assert.match(renderView({view:'compare',data,records:[],today}),/Accounting methods/);
  assert.match(renderView({view:'method',data,records:[],today}),/EVIDENCE LABELS/);
});
test('detail records include applicability, primary source and review boundaries',()=>{
  for(const r of data.records){const result=renderDetail(r,today);assert.match(result,/id="dialog-title"/);assert.match(result,/Applicability boundary/);assert.match(result,/Source checked/);assert.match(result,/noopener noreferrer/);}
});
test('HTML supplies semantic navigation, labelled controls and a native dialog',()=>{
  assert.match(html,/<html lang="en">/);assert.match(html,/<meta name="viewport"/);
  assert.match(html,/<nav aria-label="Main navigation">/);assert.equal([...html.matchAll(/<a href="#(?:overview|register|updates|timeline|compare|method|workspace|notebook)"/g)].length,7);
  assert.match(html,/<dialog[^>]*aria-labelledby="dialog-title"/);
  assert.match(html,/<script type="module" src="assets\/app.mjs">/);
  assert.doesNotMatch(html,/onclick=|supabase|justinzeh/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size);
});

// Minimal DOM adapter exercises wiring and failure recovery; not browser layout QA.
function harness(fetcher){
  class Element{
    constructor(id=''){this.id=id;this.value=id==='search'?'':'all';this.attributes={};this.handlers={};this.children=[];this.innerHTML='';this.textContent='';this.hidden=false;this.open=false;}
    addEventListener(name,fn){this.handlers[name]=fn;}append(child){this.children.push(child);}setAttribute(k,v){this.attributes[k]=v;}removeAttribute(k){delete this.attributes[k];}getAttribute(k){return this.attributes[k];}hasAttribute(k){return Object.hasOwn(this.attributes,k);}showModal(){this.open=true;}close(){this.open=false;}focus(){this.focused=true;}closest(){return this;}
  }
  const nodes=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Element(m[1])]));
  const nav=['overview','register','updates','timeline','method','workspace','notebook'].map(v=>{const el=new Element();el.setAttribute('href','#'+v);return el;});
  nodes['demo-question']=new Element('demo-question');
  const original={};for(const key of ['document','window','location','fetch'])original[key]=Object.getOwnPropertyDescriptor(globalThis,key);
  const window={handlers:{},addEventListener(k,v){this.handlers[k]=v;}};
  Object.assign(globalThis,{document:{getElementById:id=>nodes[id],createElement:()=>new Element(),querySelectorAll:()=>nav},window,location:{hash:'#overview'},fetch:fetcher});
  return {nodes,nav,window,button:(attribute,value='')=>{const el=new Element();el.setAttribute(attribute,value);return el;},restore:()=>{for(const key of Object.keys(original)){if(original[key])Object.defineProperty(globalThis,key,original[key]);else delete globalThis[key];}}};
}
test('application loads, filters, changes routes and opens/closes evidence details',async()=>{
  const env=harness(async url=>{assert.equal(url,'data/records.json');return {ok:true,json:async()=>clone()};});
  try{
    await start();assert.match(env.nodes.view.innerHTML,/The watch register/);
    env.nodes.search.value='CBAM';env.nodes.search.handlers.input();assert.match(env.nodes['result-count'].textContent,/1 of 20/);
    location.hash='#register';env.window.handlers.hashchange();assert.match(env.nodes.view.innerHTML,/<table>/);
    const b=env.button('data-record','eu-cbam-definitive');env.nodes.view.handlers.click({target:b});assert.equal(env.nodes['record-dialog'].open,true);assert.match(env.nodes['dialog-body'].innerHTML,/CBAM definitive/);
    env.nodes['close-dialog'].handlers.click();assert.equal(env.nodes['record-dialog'].open,false);
    env.nodes['clear-filters'].handlers.click();assert.match(env.nodes['result-count'].textContent,/20 of 20/);
    location.hash='#timeline';env.window.handlers.hashchange();env.nodes.view.handlers.change({target:{id:'upcoming-only',checked:false}});assert.match(env.nodes.view.innerHTML,/Date elapsed/);
    location.hash='#method';env.window.handlers.hashchange();assert.equal(env.nodes.filters.hidden,true);
    assert.equal(env.nav.find(a=>a.getAttribute('href')==='#method').getAttribute('aria-current'),'page');
  }finally{env.restore();}
});
for(const [name,fetcher,pattern] of [
  ['HTTP error',async()=>({ok:false,status:404}),/HTTP 404/],
  ['bad JSON',async()=>({ok:true,json:async()=>{throw new Error('bad');}}),/not valid JSON/],
  ['invalid schema',async()=>({ok:true,json:async()=>({})}),/validation failed/],
  ['network error',async()=>{throw new Error('network unavailable');},/network unavailable/],
  ['timeout',async()=>{const e=new Error();e.name='AbortError';throw e;},/timed out/]
])test(`application displays and recovers from ${name}`,async()=>{
  let failing=true;const env=harness((...args)=>failing?fetcher(...args):Promise.resolve({ok:true,json:async()=>clone()}));
  try{await start();assert.match(env.nodes.view.innerHTML,pattern);assert.equal(env.nodes.filters.hidden,true);failing=false;env.nodes.view.handlers.click({target:env.button('data-retry')});await new Promise(resolve=>setImmediate(resolve));assert.match(env.nodes.view.innerHTML,/The watch register/);assert.equal(env.nodes.filters.hidden,false);}finally{env.restore();}
});
test('static assets and dataset are served from repository-relative paths over HTTP',async()=>{
  const root=new URL('../',import.meta.url);
  const server=createServer(async(req,res)=>{try{const target=req.url==='/'?'index.html':req.url.slice(1);const body=await readFile(new URL(target,root));res.setHeader('Content-Type',target.endsWith('.mjs')?'text/javascript':target.endsWith('.json')?'application/json':target.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const base=`http://127.0.0.1:${server.address().port}`;for(const target of ['/','/assets/app.mjs','/assets/core.mjs','/assets/styles.css','/assets/demo.css','/assets/demo-core.mjs','/assets/demo-views.mjs','/data/client-demo.mjs','/data/requirements.mjs','/data/extended-requirements.mjs','/assets/extended-core.mjs','/assets/extended-views.mjs','/data/glossary.mjs','/data/interactions.mjs','/assets/interaction-views.mjs','/assets/priority-actions.mjs','/assets/logo.svg','/data/records.json']){const response=await fetch(base+target);assert.equal(response.status,200);if(target.endsWith('.json'))assert.deepEqual(validateDataset(await response.json()),[]);}}
  finally{await new Promise(resolve=>server.close(resolve));}
});

test('public evidence is dated and does not contain invented ownership or control facts',()=>{
  assert.deepEqual(validateDemo(),[]);
  assert.equal(PUBLIC_SOURCE.as_of,'2025-12-27');
  assert.equal(PUBLIC_ENTITIES.length,5);
  assert.ok(PUBLIC_ENTITIES.every(x=>!('ownership' in x)&&!('financial_control' in x)&&!('parent' in x)));
  const state={...createDemoState(),profile:'public',scenario:'acquisition'};
  const rows=assessmentRows(state);
  assert.equal(rows.length,5);assert.ok(rows.every(r=>r.status==='unknown'&&r.rule==='Not researched'));
  assert.deepEqual(scenarioDiff(state),[]);
  assert.match(renderWorkspace(state),/not direct ownership/);
  assert.doesNotMatch(renderWorkspace(state),/DEMO-AU-01/);
});
test('scenario snapshots are immutable and change only on/after their effective date',()=>{
  const baseline=snapshot();
  assert.equal(snapshot({scenario:'acquisition',asOf:'2026-12-31'}).entities.find(x=>x.id==='orchid').member,false);
  assert.equal(snapshot({scenario:'acquisition',asOf:'2027-01-01'}).entities.find(x=>x.id==='orchid').member,true);
  assert.equal(snapshot({scenario:'acquisition',asOf:'2027-02-01'}).entities.find(x=>x.id==='orchid').ownership,40);
  assert.equal(baseline.entities.find(x=>x.id==='orchid').member,false);
  const changed=snapshot();changed.entities[0].name='edited';assert.notEqual(snapshot().entities[0].name,'edited');
  assert.throws(()=>snapshot({scenario:'invalid'}));assert.throws(()=>snapshot({asOf:'2026-02-30'}));
});
test('boundary methods use explicit control facts, not majority ownership',()=>{
  const snap=snapshot({scenario:'acquisition'}), orchid=snap.entities.find(x=>x.id==='orchid');
  assert.equal(boundaryPosition(orchid,snap.entities,'financial_control'),'Included by control assessment');
  assert.equal(boundaryPosition(orchid,snap.entities,'operational_control'),'Excluded by this boundary method');
  assert.equal(boundaryPosition(orchid,snap.entities,'equity_share'),'40% illustrative allocation');
  const state={...createDemoState(),scenario:'acquisition'};
  assert.deepEqual(assessmentRows(state),assessmentRows({...state,boundary:'operational_control'}));
});
test('divestment removes subsidiary and facility from group view without erasing source facts',()=>{
  const snap=snapshot({scenario:'divestment'});
  assert.equal(isMember(snap.entities.find(x=>x.id==='atlas-au'),snap.entities),false);
  assert.equal(isMember(snap.entities.find(x=>x.id==='atlas-site'),snap.entities),false);
  assert.equal(snapshot().entities.find(x=>x.id==='atlas-au').member,true);
  const rows=assessmentRows({...createDemoState(),scenario:'divestment'}).filter(r=>r.entityId==='atlas-au');
  assert.ok(rows.every(r=>!r.inGroup&&r.note.includes('local screen is retained')));
  assert.equal(rows.find(r=>r.rule==='AU-SIZE').status,'match');
});
test('real requirements expose sources, cross-border listing and unresolved inputs',()=>{
  const state=createDemoState(),rows=assessmentRows(state);
  assert.equal(rows.length,65);
  assert.equal(rows.find(r=>r.id==='atlas-au:AU-SIZE').status,'match');
  assert.equal(rows.find(r=>r.id==='atlas-uk:SGX-S12').status,'match');
  const missing=rows.find(r=>r.id==='atlas-uk:SGX-STI-CLIMATE');
  assert.equal(missing.status,'unknown');assert.match(missing.missing.join(' '),/30 June 2025/);
  assert.ok(missing.citations.includes('sgx-pn76'));
  assert.equal(rows.find(r=>r.rule==='UK-COVERAGE').status,'not_covered');
  assert.match(renderAssessment(missing.id,state),/UNKNOWN/);
  assert.match(renderAssessment('missing',state),/Assessment unavailable/);
});
test('phase comparison uses actual reporting dates without mutating the checked rules',()=>{
  const state={...createDemoState(),scenario:'regulation',reportingStart:'2025-01-01'};
  const snap=snapshot(state);assert.equal(snap.version,RULESET_VERSION);assert.equal(snap.reportingStart,'2028-01-01');
  assert.deepEqual(snap.rules,snapshot({...state,scenario:'baseline'}).rules);
  const diff=scenarioDiff(state);assert.equal(diff.length,3);
  assert.equal(diff.find(r=>r.id==='atlas-au:AU-SIZE').before,'no_match');
  assert.equal(diff.find(r=>r.id==='atlas-au:AU-SIZE').status,'match');
  assert.equal(diff.find(r=>r.id==='atlas-sg:SGX-STI-S3').before,'not_due');
  assert.equal(diff.find(r=>r.id==='atlas-sg:SGX-STI-S3').status,'match');
  assert.deepEqual(scenarioDiff({...state,reportingStart:'2028-01-01'}),[]);
});
test('Australian size thresholds include equality, require two criteria and preserve unknowns',()=>{
  const snap=snapshot(),rule=REAL_REQUIREMENTS.find(r=>r.id==='AU-SIZE');
  const entity=snap.entities.find(e=>e.id==='atlas-au');
  const amounts=entity.financials[snap.reportingStart];
  Object.assign(amounts,{revenue_maud:200,assets_maud:500,employees:null});
  assert.equal(evaluateRequirement(entity,rule,snap).status,'match');
  amounts.assets_maud=499.99;
  assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  amounts.employees=249;
  assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
  amounts.employees=250;
  assert.equal(evaluateRequirement(entity,rule,snap).status,'match');
  entity.au_ch2m=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.au_ch2m=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
  assert.equal(atLeastTwo([{pass:true},{pass:false},{pass:null}]),null);
});
test('AU phase boundaries use FY start, not organisation snapshot date or reused financial amounts',()=>{
  const state=createDemoState();
  const row=start=>assessmentRows({...state,reportingStart:start}).find(r=>r.rule==='AU-SIZE'&&r.entityId==='atlas-au');
  assert.equal(row('2026-01-01').status,'no_match');assert.equal(row('2026-07-01').status,'match');
  assert.match(row('2027-07-01').phase,/Group 3/);
  assert.equal(row('2027-01-01').status,'unknown'); // No fixture for this financial year.
  const a=assessmentRows({...state,asOf:'2026-08-27'}),b=assessmentRows({...state,asOf:'2027-02-01'});
  assert.deepEqual(a,b);
  for(const [start,group] of [['2026-06-30','Group 1'],['2026-07-01','Group 2'],['2027-06-30','Group 2'],['2027-07-01','Group 3']])assert.match(row(start).phase,new RegExp(group));
});
test('relief, unsupported entity types and missing period facts cannot silently pass AU screening',()=>{
  const snap=snapshot(),rule=REAL_REQUIREMENTS[0],entity=snap.entities.find(e=>e.id==='atlas-au');
  entity.au_no_relief=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.au_no_relief=false;assert.match(evaluateRequirement(entity,rule,snap).missing.join(' '),/relief/);
  entity.au_no_relief=true;entity.au_ordinary_company=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'not_covered');
  entity.au_ordinary_company=true;delete entity.financials[snap.reportingStart];
  assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
});
test('SGX historical STI membership and source-specific commencement are not generic listing',()=>{
  const snap=snapshot(),entity=snap.entities.find(e=>e.id==='atlas-sg'),rule=REAL_REQUIREMENTS.find(r=>r.id==='SGX-STI-S3');
  assert.equal(evaluateRequirement(entity,rule,{...snap,reportingStart:'2025-01-01'}).status,'not_due');
  assert.equal(evaluateRequirement(entity,rule,{...snap,reportingStart:'2026-01-01'}).status,'match');
  entity.current_sti=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'match');
  entity.sti_at_2025_06_30=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.sti_at_2025_06_30=false;const result=evaluateRequirement(entity,rule,snap);
  assert.equal(result.status,'no_match');assert.match(result.limits,/not an exemption/);
  entity.sti_at_2025_06_30=true;entity.sgx_no_waiver=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.sgx_no_waiver=true;entity.sgx_mainboard=null;entity.listed=true;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
});
test('acquisition changes group inclusion without inventing new local reporting duties',()=>{
  const state=createDemoState(),before=assessmentRows(state).find(r=>r.id==='orchid:SGX-S12');
  const after=assessmentRows({...state,scenario:'acquisition'}).find(r=>r.id===before.id);
  assert.equal(before.inGroup,false);assert.equal(after.inGroup,true);assert.equal(after.status,before.status);
  assert.equal(before.status,'match');assert.deepEqual(before.trace,after.trace);
  assert.equal(scenarioDiff({...state,scenario:'acquisition'}).length,8);
});
test('Atlas is the default route and public evidence is an optional, isolated presentation path',async()=>{
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  try{location.hash='';await start();assert.match(env.nodes.view.innerHTML,/Atlas Beverages/);assert.match(env.nodes.view.innerHTML,/<details class="optional-example" >/);
    assert.equal(env.nav.find(a=>a.getAttribute('href')==='#workspace').getAttribute('aria-current'),'page');
    env.nodes.view.handlers.change({target:{id:'demo-period',value:'2025-01-01'}});
    assert.match(env.nodes.view.innerHTML,/Screened FY start: 1 Jan 2025/);
  }finally{env.restore();}
  assert.doesNotMatch(renderNotebook(createDemoState(),data),/data-demo-source-toggle="public-entities"/);
  assert.match(renderNotebook({...createDemoState(),profile:'public'},data),/data-demo-source-toggle="public-entities"/);
});
test('source-backed assessments expose citations, locators, pending review and missing evidence',()=>{
  for(const source of REGULATORY_SOURCES){assert.ok(safeUrl(source.url));assert.equal(source.review,'source_checked');assert.ok(source.locator);}
  const detail=renderAssessment('atlas-uk:SGX-STI-CLIMATE',createDemoState());
  assert.match(detail,/30 June 2025/);assert.match(detail,/Missing \/ unresolved/);assert.match(detail,/sgx-pn76/);assert.match(detail,/4.12/);
  const question=answerQuestion('What information is missing?',createDemoState(),data);
  assert.ok(question.rows.some(r=>r.rule==='UK-COVERAGE'));
  for(const source of REGULATORY_SOURCES){const state=createDemoState();state.sources=state.sources.filter(id=>id!==source.id);assert.equal(answerQuestion('What applies?',state,data).supported,false);}
});
test('workspace filters are independent and support the full jurisdiction/entity matrix',()=>{
  const state={...createDemoState(),entity:'atlas-sg',jurisdiction:'Australia'};
  assert.equal(visibleRows(state).length,1);
  assert.equal(visibleRows({...state,entity:'all'}).length,8);
  assert.equal(visibleRows({...state,entity:'atlas-site'}).length,0);
  for(const profile of ['public','illustrative'])for(const tab of ['graph','matrix','changes','adoption','materiality','valuechain']){
    const output=renderWorkspace({...state,entity:'all',profile,tab});assert.doesNotMatch(output,/undefined|NaN/);
  }
});
test('notebook supports only guided questions and requires selected evidence',()=>{
  const state=createDemoState();
  for(const q of GUIDED_QUESTIONS)assert.equal(answerQuestion(q.question,state,data).supported,true);
  assert.equal(answerQuestion('  Which jurisdictions and triggers apply? ',state,data).supported,true);
  assert.equal(answerQuestion('Does Chevron owe a filing tomorrow?',state,data).supported,false);
  assert.equal(answerQuestion('What applies?',{...state,sources:['illustrative-facts']},data).supported,false);
  const publicAnswer=answerQuestion('What applies?',{...state,profile:'public'},data);
  assert.ok(publicAnswer.rows.every(r=>r.status==='unknown'));
  assert.deepEqual(publicAnswer.citations,['public-entities']);
  const noIfRS=clone();noIfRS.records=noIfRS.records.filter(r=>r.id!=='ifrs-s2-ghg-amendments');
  assert.equal(answerQuestion(GUIDED_QUESTIONS.find(q=>q.id==='ifrs').question,state,noIfRS).supported,false);
});
test('notebook answers reflect the active scenario, not workspace table filters',()=>{
  const state={...createDemoState(),scenario:'acquisition',entity:'atlas-au',jurisdiction:'Australia'};
  const answer=answerQuestion('What applies?',state,data);
  assert.equal(answer.rows.length,65);assert.match(answer.context,/Acquire Orchid/);
  assert.ok(answer.rows.some(r=>r.id==='orchid:SGX-S12'&&r.status==='match'));
  assert.equal(answerQuestion('What changes in this scenario?',state,data).rows.length,8);
});
test('saved responses are bounded session snapshots and never invent review approval',()=>{
  let state=updateDemo(createDemoState(),'question','matrix',data);
  state=updateDemo(state,'save','',data);
  assert.equal(state.saved.length,1);const saved=JSON.stringify(state.saved[0]);
  state=updateDemo(state,'scenario','acquisition',data);
  assert.equal(JSON.stringify(state.saved[0]),saved);
  for(let i=0;i<7;i++)state=updateDemo(state,'save','',data);
  assert.equal(state.saved.length,5);assert.match(state.notice,/limit/);
  state=updateDemo(state,'clear-notes','',data);assert.equal(state.saved.length,0);
  const unsupported=updateDemo(createDemoState(),'ask','arbitrary question',data);
  assert.equal(updateDemo(unsupported,'save','',data).saved.length,0);
  assert.equal(createDemoState().saved.length,0);
});
test('changing profiles prevents applying illustrative scenarios to real entities',()=>{
  const state=updateDemo({...createDemoState(),entity:'atlas-au',jurisdiction:'Australia'},'profile','public',data);
  assert.equal(state.entity,'all');assert.equal(state.jurisdiction,'all');
  assert.equal(updateDemo(state,'scenario','acquisition',data).scenario,'baseline');
  assert.equal(updateDemo(state,'entity','atlas-au',data).entity,'all');
  assert.equal(updateDemo(state,'profile','unexpected',data).profile,'public');
});
test('source detail and notebook escape user text and do not expose upload or model connections',()=>{
  const state={...createDemoState(),question:'"><img src=x onerror=alert(1)>',answer:'<script>alert(1)</script>'};
  const output=renderNotebook(state,data);
  assert.doesNotMatch(output,/<img|<script|type="file"/);assert.match(output,/&lt;img/);
  assert.match(output,/GUIDED NOTEBOOK — NO LIVE AI/);assert.match(output,/disabled>Add a client file/);
  assert.match(renderDemoSource('public-entities',data),/Exhibit 21, page 7/);
  assert.match(renderDemoSource('asic-rg280',data),/Table 2/);
});
test('browser event wiring connects the workspace, guided questions, source selection and session saves',async()=>{
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  const click=(key,value='')=>env.nodes.view.handlers.click({target:env.button('data-demo-'+key,value)});
  try{
    await start();location.hash='#workspace';env.window.handlers.hashchange();
    assert.equal(env.nodes.filters.hidden,true);assert.match(env.nodes.view.innerHTML,/Atlas Beverages Group/);
    click('scenario','acquisition');click('entity','orchid');assert.match(env.nodes.view.innerHTML,/40%/);
    env.nodes.view.handlers.change({target:{id:'demo-boundary',value:'operational_control'}});assert.match(env.nodes.view.innerHTML,/Excluded by this boundary method/);
    click('tab','matrix');assert.match(env.nodes.view.innerHTML,/SGX-S12/);
    click('assessment','orchid:SGX-S12');assert.equal(env.nodes['record-dialog'].open,true);
    location.hash='#notebook';env.window.handlers.hashchange();assert.equal(env.nodes['record-dialog'].open,false);
    click('question','matrix');assert.match(env.nodes.view.innerHTML,/GUIDED RESPONSE/);click('save');assert.match(env.nodes.view.innerHTML,/NOTE 1/);
    env.nodes.view.handlers.change({target:env.button('data-demo-source-toggle','asic-rg280')});assert.match(env.nodes.view.innerHTML,/Required evidence is not selected/);
    env.nodes['demo-question'].value='Unsupported arbitrary question';let prevented=false;
    env.nodes.view.handlers.submit({target:{id:'demo-question-form'},preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.match(env.nodes.view.innerHTML,/Outside supported questions/);
    click('profile','public');click('question','matrix');assert.match(env.nodes.view.innerHTML,/PepsiCo Beverages Australia/);assert.match(env.nodes.view.innerHTML,/every row remains unresolved/);
    click('source','public-entities');assert.match(env.nodes['dialog-body'].innerHTML,/27 Dec 2025/);
  }finally{env.restore();}
});
test('California uses strict revenue thresholds, explicit US formation and separate enforcement status',()=>{
  const snap=snapshot(),entity=structuredClone(snap.entities.find(x=>x.id==='atlas-us'));
  const r253=snap.rules.find(r=>r.id==='CA-SB253'),r261=snap.rules.find(r=>r.id==='CA-SB261');
  assert.equal(evaluateRequirement(entity,r253,snap).status,'implementation');
  assert.equal(evaluateRequirement(entity,r261,snap).status,'paused');
  for(const [rule,boundary] of [[r253,1000],[r261,500]]){
    entity.ca_revenue_2025_musd=boundary;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
    entity.ca_revenue_2025_musd=boundary+0.01;assert.equal(evaluateRequirement(entity,rule,snap).scopeStatus,'match');
    for(const value of [null,undefined,'1500',NaN,-1]){entity.ca_revenue_2025_musd=value;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');}
  }
  entity.ca_revenue_2025_musd=1500;entity.us_formed=false;assert.equal(evaluateRequirement(entity,r253,snap).status,'no_match');
  entity.us_formed=true;entity.ca_business=null;assert.equal(evaluateRequirement(entity,r253,snap).status,'unknown');
  entity.ca_business=true;entity.insurance=true;assert.equal(evaluateRequirement(entity,r261,snap).status,'no_match');
  assert.equal(evaluateRequirement(entity,r253,snap).scopeStatus,'match');
});
test('California revenue cycle and legal status do not silently follow future FY or organisation dates',()=>{
  const base=assessmentRows(createDemoState()).filter(r=>r.rule.startsWith('CA-'));
  const future=assessmentRows({...createDemoState(),reportingStart:'2028-01-01',asOf:'2030-01-01'}).filter(r=>r.rule.startsWith('CA-'));
  assert.deepEqual(future,base);
  const parent=base.find(r=>r.id==='atlas-us:CA-SB253'),child=base.find(r=>r.id==='atlas-us-ops:CA-SB253');
  assert.equal(child.status,'no_match');assert.equal(parent.scopeStatus,'match');
  assert.match(parent.period,/FY 2025/);assert.match(parent.missing.join(' '),/parent report/);
  assert.match(parent.note,/proposed/);assert.match(renderAssessment('atlas-us:CA-SB261',createDemoState()),/voluntary/);
});
test('Mexico issuer scope is not inferred from country and preserves relief uncertainty',()=>{
  const snap=snapshot(),entity=structuredClone(snap.entities.find(e=>e.id==='atlas-mx')),rule=snap.rules.find(r=>r.id==='MX-ISSB');
  assert.equal(evaluateRequirement(entity,rule,snap).status,'match');
  assert.match(evaluateRequirement(entity,rule,snap).missing.join(' '),/relief/);
  assert.equal(evaluateRequirement(entity,rule,{...snap,reportingStart:'2024-12-31'}).status,'not_due');
  entity.mx_issuer=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
  entity.mx_issuer=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.mx_issuer=true;entity.mx_nonfinancial=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'not_covered');
  entity.mx_nonfinancial=true;entity.mx_domestic=false;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
});
test('EU threshold matches cannot become country-law conclusions or erase missing exemptions',()=>{
  const snap=snapshot(),entity=structuredClone(snap.entities.find(e=>e.id==='atlas-eu')),rule=snap.rules.find(r=>r.id==='EU-CSRD');
  let row=evaluateRequirement(entity,rule,snap);assert.equal(row.scopeStatus,'match');assert.equal(row.status,'unknown');assert.match(row.missing.join(' '),/exemption/);
  entity.eu_employees=1000;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
  entity.eu_employees=1001;entity.eu_turnover_meur=450;assert.equal(evaluateRequirement(entity,rule,snap).status,'no_match');
  entity.eu_turnover_meur=451;entity.eu_national_scope_confirmed=true;entity.eu_wave_confirmed=true;entity.eu_no_exemption=true;
  assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
  entity.eu_employees=null;assert.equal(evaluateRequirement(entity,rule,snap).status,'unknown');
});
test('materiality uses impact OR financial, preserves unknowns and separates group assessment',()=>{
  const state=createDemoState();let m=assessMateriality(state);
  assert.equal(m.financial,false);assert.equal(m.impact,true);assert.equal(m.combined,true);
  m=assessMateriality({...state,materialityLevel:'group'});assert.equal(m.financial,null);assert.equal(m.combined,true);assert.ok(m.missing.length);
  m=assessMateriality({...state,materialityCase:'transition'});assert.equal(m.financial,true);assert.equal(m.impact,false);assert.equal(m.combined,true);
  m=assessMateriality({...state,materialityCase:'unknown'});assert.equal(m.combined,null);assert.equal(m.ifrs,'Assessment missing');
  assert.deepEqual(assessmentRows(state),assessmentRows({...state,materialityCase:'both',materialityLevel:'group'}));
});
test('Mexico divestment changes the buyer data role but retains independent issuer scope',()=>{
  const state=createDemoState(),before=valueChainRows(state).find(r=>r.id==='atlas-mx');
  const afterState={...state,scenario:'divest_mexico'},after=valueChainRows(afterState).find(r=>r.id==='atlas-mx');
  assert.match(before.role,/Group operations/);assert.match(after.role,/after sale/);
  assert.deepEqual(valueChainRows({...afterState,asOf:'2026-12-31'}),valueChainRows(state));
  const pre=assessmentRows(state).find(r=>r.id==='atlas-mx:MX-ISSB'),post=assessmentRows(afterState).find(r=>r.id===pre.id);
  assert.equal(pre.inGroup,true);assert.equal(post.inGroup,false);assert.equal(pre.status,post.status);assert.deepEqual(pre.trace,post.trace);
  assert.ok(scenarioDiff(afterState).every(r=>r.entityId==='atlas-mx'&&r.before===r.status));
  assert.equal(snapshot().entities.find(e=>e.id==='atlas-mx').ownership,100);
});
test('supplier evidence is independent of ownership and does not create supplier filing conclusions',()=>{
  const state=createDemoState(),rows=valueChainRows(state);
  assert.ok(!snapshot().entities.some(e=>e.id==='lumen'));assert.match(rows[0].direct,/No supplier filing duty inferred/);
  assert.match(rows[0].evidence,/No activity/);assert.ok(rows[0].missing.length);
  const secondary=valueChainRows({...state,supplierEvidence:'secondary'});assert.match(secondary[0].evidence,/no emissions number/);
  const primary=valueChainRows({...state,supplierEvidence:'primary'});assert.match(primary[0].evidence,/unverified/);assert.ok(primary[0].missing.length);
  assert.deepEqual(assessmentRows(state),assessmentRows({...state,supplierEvidence:'primary'}));
  assert.deepEqual(valueChainRows({...state,profile:'public'}),[]);
});
test('new guided answers require their own sources and do not apply illustrative facts to public entities',()=>{
  const state=createDemoState();
  for(const id of ['adoption','california','mexico','materiality','subentities','suppliers']){
    const q=GUIDED_QUESTIONS.find(q=>q.id===id),answer=answerQuestion(q.question,state,data);
    assert.equal(answer.supported,true);
    for(const source of answer.citations)assert.equal(answerQuestion(q.question,{...state,sources:state.sources.filter(s=>s!==source)},data).supported,false);
    const publicAnswer=answerQuestion(q.question,{...state,profile:'public'},data);
    assert.deepEqual(publicAnswer.citations,['public-entities']);assert.equal(publicAnswer.materiality,null);assert.deepEqual(publicAnswer.suppliers,[]);
  }
  const mexico=GUIDED_QUESTIONS.find(q=>q.id==='mexico');assert.equal(answerQuestion(mexico.question,{...state,sources:['illustrative-facts','mx-issb']},data).supported,true);
});
test('new workspace controls reach materiality and supplier answers through application events',async()=>{
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  const click=(key,value='')=>env.nodes.view.handlers.click({target:env.button('data-demo-'+key,value)});
  try{
    location.hash='#workspace';await start();click('tab','adoption');assert.match(env.nodes.view.innerHTML,/CA-SB253/);
    click('tab','materiality');click('materiality-level','group');assert.match(env.nodes.view.innerHTML,/GROUP PERSPECTIVE/);assert.match(env.nodes.view.innerHTML,/Assessment missing/);
    click('materiality-case','both');assert.doesNotMatch(env.nodes.view.innerHTML,/Assessment missing/);
    click('tab','valuechain');click('scenario','divest_mexico');click('supplier-evidence','secondary');assert.match(env.nodes.view.innerHTML,/Divested entity/);assert.match(env.nodes.view.innerHTML,/secondary-data method/);
    location.hash='#notebook';env.window.handlers.hashchange();click('question','subentities');assert.match(env.nodes.view.innerHTML,/continuing independent supply contract/);click('save');assert.match(env.nodes.view.innerHTML,/supplier evidence secondary/);
    click('profile','public');location.hash='#workspace';env.window.handlers.hashchange();assert.match(env.nodes.view.innerHTML,/Use Atlas/);
  }finally{env.restore();}
});
test('TNFD and California records appear in the register with distinct stages and cited timelines',()=>{
  const ids=['tnfd-recommendations','tnfd-issb-nature','ca-sb253','ca-sb261'];
  for(const id of ids){
    const record=data.records.find(r=>r.id===id);assert.ok(record.sources.length);assert.ok(record.milestones.length);
    assert.match(renderView({view:'overview',data,today}),new RegExp(id));
    assert.match(renderView({view:'register',data,today}),new RegExp(id));
  }
  assert.match(data.records.find(r=>r.id==='tnfd-recommendations').applicability,/voluntary/i);
  const nature=data.records.find(r=>r.id==='tnfd-issb-nature');assert.equal(nature.milestones[0].date,'2026-10');assert.equal(nature.milestones[0].projected,true);
  const ca=data.records.find(r=>r.id==='ca-sb253');assert.equal(ca.stage,'implementation_pending');assert.equal(ca.milestones.find(m=>m.date==='2026-11-10').projected,true);
  const paused=data.records.find(r=>r.id==='ca-sb261');assert.equal(paused.stage,'enforcement_paused');assert.ok(paused.milestones.every(m=>m.kind!=='regulatory_effective'));
  const invalid=clone();invalid.records.find(r=>r.id==='ca-sb253').milestones.find(m=>m.kind==='proposed_deadline').projected=false;
  assert.ok(validateDataset(invalid).some(e=>e.includes('projected')));
});
test('year-only regulatory milestones retain their precision through the whole reporting year',()=>{
  assert.equal(formatDate('2027'),'2027');assert.equal(new Date(dateRange('2027')[0]).toISOString(),'2027-01-01T00:00:00.000Z');
  assert.equal(new Date(dateRange('2027')[1]).toISOString(),'2027-12-31T23:59:59.999Z');
  assert.ok(milestones(data.records,{upcomingOnly:true,today:new Date('2027-08-01')}).some(m=>m.recordId==='ca-sb253'&&m.date==='2027'));
  assert.ok(!milestones(data.records,{upcomingOnly:true,today:new Date('2028-01-01')}).some(m=>m.recordId==='ca-sb253'&&m.date==='2027'));
});
test('presentation branding removes the old heading and labels while keeping update provenance',async()=>{
  assert.match(html,/<title>ESG Regulatory Scanner<\/title>/);assert.match(html,/assets\/logo.svg/);
  assert.doesNotMatch(html,/WISDOM AI LAB|INDEPENDENT DEMO|Evidence &amp; method|Evidence & method|>Demo<|href="#compare"/);
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  try{await start();assert.equal(env.nodes['last-update'].textContent,'Last update: Aug 27, 2026');assert.equal(env.nodes['dataset-status'].hidden,true);assert.equal(env.nodes['page-title'].textContent,'Regulatory Overview');assert.doesNotMatch(env.nodes['page-intro'].textContent,/real.time/i);
    location.hash='#method';env.window.handlers.hashchange();assert.equal(env.nodes['page-intro'].textContent,'');assert.equal(env.nodes['result-count'].hidden,true);
  }finally{env.restore();}
});
test('Compare is a Developments subsection and Evidence includes the glossary and monitoring limits',async()=>{
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  try{await start();location.hash='#updates';env.window.handlers.hashchange();assert.match(env.nodes.view.innerHTML,/href="#compare"/);
    location.hash='#compare';env.window.handlers.hashchange();assert.equal(env.nodes['page-title'].textContent,'Compare regulatory impacts');assert.equal(env.nav.find(a=>a.getAttribute('href')==='#updates').getAttribute('aria-current'),'page');assert.match(env.nodes.view.innerHTML,/aria-label="Regulatory change sections"/);
    location.hash='#method';env.window.handlers.hashchange();assert.match(env.nodes.view.innerHTML,/Glossary/);assert.match(env.nodes.view.innerHTML,/Double materiality/);assert.match(env.nodes.view.innerHTML,/LEAP/);assert.match(env.nodes.view.innerHTML,/Near real-time monitoring is a planned capability/);assert.doesNotMatch(env.nodes.view.innerHTML,/How this demo separates/);
  }finally{env.restore();}
});
test('requested graph hierarchy is preserved at every depth and retains local screening outcomes',()=>{
  const snap=snapshot(),state=createDemoState();
  assert.equal(snap.entities.find(e=>e.id==='atlas-eu').parent,'atlas-uk');assert.equal(snap.entities.find(e=>e.id==='atlas-mx').parent,'atlas-us-ops');
  assert.equal(snap.entities.find(e=>e.id==='atlas-us-ops').name,'Atlas California Division');
  const markup=renderWorkspace(state);assert.match(markup,/data-entity-node="atlas-eu" data-parent-node="atlas-uk"/);assert.match(markup,/data-entity-node="atlas-mx" data-parent-node="atlas-us-ops"/);
  assert.match(markup,/Illustrative company data/);assert.doesNotMatch(markup,/fictional|INTERACTIVE CONCEPT DEMO|MAIN PRESENTATION/i);
  assert.match(renderWorkspace({...state,entity:'atlas-mx'}),/Atlas California Division/);
  assert.equal(assessmentRows(state).find(r=>r.id==='atlas-mx:MX-ISSB').status,'match');
});
test('published framework and glossary names preserve SBTi spelling',()=>{
  assert.equal(data.records.find(r=>r.id==='sbti-net-zero-v2').framework,'SBTi');
  const register=renderView({view:'register',data,today}),evidence=renderView({view:'method',data,today});
  assert.match(register,/>SBTi</);assert.match(evidence,/>SBTi</);assert.doesNotMatch(register+evidence,/>SBTI</);
});

test('timeline month/year presentation retains exact days and imprecise source ranges',()=>{
 assert.equal(formatTimelineDate('2026-10-19'),'Oct 2026');
 assert.equal(formatTimelineDate('2026-10'),'Oct 2026');
 assert.equal(formatTimelineDate('2027-Q2'),'Apr 2027 – Jun 2027');
 assert.equal(formatTimelineDate('2027'),'Jan 2027 – Dec 2027');
 assert.equal(formatTimelineDate('bad'),'Not specified');
 assert.equal(datePrecision('2026-08-12'),'Exact date: 12 Aug 2026');
 const markup=renderView({view:'timeline',data,today,upcoming:false});
 assert.match(markup,/Exact date: 12 Aug 2026/);assert.match(markup,/Year only · exact month not specified/);
 assert.match(renderDetail(data.records.find(r=>r.id==='eu-ppwr')),/12 Aug 2028/);
 assert.equal(milestones(data.records,{upcomingOnly:true,today:new Date('2026-08-13')}).some(m=>m.recordId==='eu-ppwr'&&m.date==='2026-08-12'),false);
});
test('new EU and seven state packaging records are visible across shared regulatory views',()=>{
 for(const id of ['eu-csrd',...PACKAGING_RECORD_IDS]){
  const r=data.records.find(r=>r.id===id);assert.ok(r.sources.length);assert.ok(r.milestones.length);
  for(const view of ['overview','register','updates','timeline'])assert.ok(renderView({view,data,today,upcoming:false}).includes(`data-record="${id}"`),`${view}: ${id}`);
  assert.ok(renderView({view:'workspace',data,today}).includes(`data-record="${id}"`));
  assert.ok(renderNotebook(createDemoState(),data).includes(`record:${id}`));
 }
 assert.equal(data.records.filter(r=>r.framework==='US packaging EPR').length,7);
 assert.equal(data.records.find(r=>r.id==='us-epr-me').stage,'implementation_pending');
 assert.match(data.records.find(r=>r.id==='us-epr-co').check_note,/access errors/);
});
test('conditional PPWR anchors and public authority deadlines are not universal client filing dates',()=>{
 const ppwr=data.records.find(r=>r.id==='eu-ppwr');
 assert.equal(ppwr.milestones.filter(m=>m.kind==='conditional_application').length,2);
 assert.ok(ppwr.milestones.filter(m=>m.kind==='conditional_application').every(m=>m.projected));
 const invalid=clone();invalid.records.find(r=>r.id==='eu-ppwr').milestones.find(m=>m.kind==='conditional_application').projected=false;
 assert.ok(validateDataset(invalid).some(x=>x.includes('projected')));
 assert.ok(data.records.find(r=>r.id==='eu-csrd').milestones.some(m=>m.date==='2027-03-19'&&m.kind==='transposition_deadline'));
 assert.ok(data.records.find(r=>r.id==='us-epr-me').milestones.every(m=>!['registration_deadline','reporting_year'].includes(m.kind)));
});
test('interoperability graph validates record references and separates alignment from equivalence',()=>{
 assert.deepEqual(validateInteractions(data),[]);
 assert.ok(validateInteractions({...data,records:data.records.filter(r=>r.id!=='eu-ppwr')}).length);
 assert.ok(validateInteractions({}).length);
 for(const edge of INTERACTIONS){
  const output=renderView({view:'interoperability',data,today,interaction:edge.id});
  assert.match(output,/What can be reused/);assert.match(output,/What remains separate/);assert.match(output,/not automatic compliance equivalence/);
  assert.ok(output.includes(edge.label));assert.doesNotMatch(output,/undefined|NaN/);
 }
 const invalid=renderView({view:'interoperability',data,today,interaction:'<script>'});assert.doesNotMatch(invalid,/<script>/);
});
test('interoperability selection, navigation highlighting and record dialogs work through application events',async()=>{
 const env=harness(async()=>({ok:true,json:async()=>clone()}));
 try{
  await start();location.hash='#interoperability';env.window.handlers.hashchange();
  assert.equal(env.nodes.filters.hidden,true);assert.equal(env.nav.find(a=>a.getAttribute('href')==='#updates').getAttribute('aria-current'),'page');
  env.nodes.view.handlers.click({target:env.button('data-map-relation','packaging-markets')});
  assert.match(env.nodes.view.innerHTML,/data-map-relation="packaging-markets" aria-pressed="true"/);
  env.nodes.view.handlers.click({target:env.button('data-record','eu-ppwr')});assert.match(env.nodes['dialog-body'].innerHTML,/Timeline and exact date evidence/);
  location.hash='#updates';env.window.handlers.hashchange();assert.equal(env.nodes['page-title'].textContent,'Amended Disclosure Requirements');
 }finally{env.restore();}
});
test('priority actions follow entities and dated transactions without inferring packaging duties',()=>{
 const state=createDemoState();const get=s=>priorityActions(s,data,snapshot(s).entities,assessmentRows(s),valueChainRows(s));
 const before=JSON.stringify(state);const all=get(state);assert.equal(JSON.stringify(state),before);
 assert.ok(all.some(t=>t.id==='packaging-scope'&&t.missing.some(m=>m.includes('Destination'))));
 assert.match(get({...state,entity:'atlas-eu'}).find(t=>t.id==='resolve-screens').missing.join(' '),/national implementation/);
 assert.ok(get({...state,entity:'atlas-au'}).every(t=>!t.records.includes('ca-sb253')));
 assert.equal(get({...state,entity:'atlas-site'})[0].id,'entity-selection');
 const beforeSale=get({...state,scenario:'divest_mexico',asOf:'2026-12-31'}).find(t=>t.id==='supplier-data');
 const afterSale=get({...state,scenario:'divest_mexico',asOf:'2027-01-01'}).find(t=>t.id==='supplier-data');
 assert.notEqual(beforeSale.title,afterSale.title);
 const divested=get({...state,scenario:'divest_mexico',entity:'atlas-mx'});assert.ok(divested.some(t=>t.id==='reporting-plan'));
 const publicTasks=priorityActions({...state,profile:'public'},data,PUBLIC_ENTITIES,assessmentRows({...state,profile:'public'}));
 assert.deepEqual(publicTasks.map(t=>t.id),['public-facts']);assert.deepEqual(publicTasks[0].records,[]);
});
test('packaging and overlap notebook answers require their actual selected records and isolate public facts',()=>{
 const state=createDemoState();
 for(const id of ['packaging','overlaps']){
  const q=GUIDED_QUESTIONS.find(q=>q.id===id);const answer=answerQuestion(q.question,state,data);assert.equal(answer.supported,true);
  assert.equal(answerQuestion(q.question,{...state,sources:state.sources.filter(s=>s!=='record:eu-ppwr')},data).supported,false);
  assert.equal(answerQuestion(q.question,state,{...data,records:data.records.filter(r=>r.id!=='eu-ppwr')}).supported,false);
  const publicAnswer=answerQuestion(q.question,{...state,profile:'public'},data);assert.deepEqual(publicAnswer.citations,['public-entities']);assert.doesNotMatch(publicAnswer.text,/Atlas|must register/);
 }
 assert.match(answerQuestion('Explain packaging requirements',state,data).text,/No packaging applicability conclusion/);
 assert.match(renderDemoSource('record:eu-ppwr',data),/eur-lex.europa.eu/);
});
test('Evidence has balanced sibling sections and new glossary definitions',()=>{
 const output=renderView({view:'method',data,today});
 const beforeGlossary=output.split('<section class="method-section glossary">')[0];
 assert.equal((beforeGlossary.match(/<section class="method-section">/g)||[]).length,4);
 assert.doesNotMatch(beforeGlossary,/<div class="method-grid"><div>/);
 for(const term of ['PPWR','EPR','PRO / SO','Interoperability','Conditional date'])assert.ok(output.includes(term));
 assert.match(html,/MANDATORY DISCLOSURES · TARGET TIMELINES · ACCOUNTING UPDATES/);
});
