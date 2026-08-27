import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {STAGES,escapeHtml,safeUrl,dateRange,formatDate,isStale,filterRecords,milestones,developments,summarise,validateDataset} from '../assets/core.mjs';
import {renderView,renderDetail,start} from '../assets/app.mjs';
import {createDemoState,updateDemo,validateDemo,PUBLIC_SOURCE,PUBLIC_ENTITIES,snapshot,isMember,boundaryPosition,assessmentRows,visibleRows,scenarioDiff,answerQuestion,GUIDED_QUESTIONS} from '../assets/demo-core.mjs';
import {renderWorkspace,renderNotebook,renderAssessment,renderDemoSource} from '../assets/demo-views.mjs';

const data=JSON.parse(await readFile(new URL('../data/records.json',import.meta.url),'utf8'));
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const today=new Date('2026-08-27T12:00:00Z');
const clone=()=>structuredClone(data);

test('independent dataset passes validation and has no invented human approvals',()=>{
  assert.deepEqual(validateDataset(data),[]);
  assert.equal(data.records.length,7);
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
  assert.equal(filterRecords(data.records).length,7);
});
test('filtered metrics and stale checks derive from records, not hardcoded counts',()=>{
  const stats=summarise(data.records,today);
  assert.deepEqual(stats,{records:7,frameworks:6,pending:7,stale:0});
  assert.equal(summarise(filterRecords(data.records,{region:'United States'}),today).records,1);
  assert.equal(isStale(data.records[0],new Date('2026-10-01')),true);
  assert.equal(isStale(data.records[0],new Date('2026-08-28')),false);
});
test('upcoming timeline excludes elapsed dates and keeps a quarter until its end',()=>{
  const all=milestones(data.records,{today});
  const upcoming=milestones(data.records,{upcomingOnly:true,today});
  assert.equal(all.length,7);assert.equal(upcoming.length,5);
  assert.ok(upcoming.every(m=>dateRange(m.date)[1]>=today.getTime()));
  const duringQuarter=milestones(data.records,{upcomingOnly:true,today:new Date('2027-05-15')});
  assert.ok(duringQuarter.some(m=>m.date==='2027-Q2'));
  assert.ok(all.every((m,i)=>i===0||dateRange(all[i-1].date)[0]<=dateRange(m.date)[0]));
});
test('development log is reverse chronological without mutating source data',()=>{
  const original=JSON.stringify(data.records);
  const list=developments(data.records);
  assert.equal(list[0].date,'2026-07-29');assert.equal(list.at(-1).date,'2025-12');
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
  assert.equal(summarise(d.records,today).pending,6);
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
  for(const view of ['overview','register','updates','timeline','compare','method','workspace','notebook']){
    const result=renderView({view,data,today});assert.ok(result.length>250);assert.doesNotMatch(result,/undefined|NaN/);
    assert.match(result,/record|source|evidence/i);
  }
  assert.match(renderView({view:'timeline',data,today,upcoming:false}),/Date elapsed · not a completion finding/);
  assert.match(renderView({view:'method',data,today}),/no model provider, API credentials/);
});
test('empty results show recovery; comparison and method are explicitly unfiltered',()=>{
  assert.match(renderView({view:'register',data,records:[],today}),/No matching records/);
  assert.match(renderView({view:'compare',data,records:[],today}),/Accounting methods/);
  assert.match(renderView({view:'method',data,records:[],today}),/RESEARCH STANDARD/);
});
test('detail records include applicability, primary source and review boundaries',()=>{
  for(const r of data.records){const result=renderDetail(r,today);assert.match(result,/id="dialog-title"/);assert.match(result,/Applicability boundary/);assert.match(result,/Source checked/);assert.match(result,/noopener noreferrer/);}
});
test('HTML supplies semantic navigation, labelled controls and a native dialog',()=>{
  assert.match(html,/<html lang="en">/);assert.match(html,/<meta name="viewport"/);
  assert.match(html,/<nav aria-label="Main navigation">/);assert.equal([...html.matchAll(/<a href="#(?:overview|register|updates|timeline|compare|method|workspace|notebook)"/g)].length,8);
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
  const nav=['overview','register','updates','timeline','compare','method','workspace','notebook'].map(v=>{const el=new Element();el.setAttribute('href','#'+v);return el;});
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
    env.nodes.search.value='CBAM';env.nodes.search.handlers.input();assert.match(env.nodes['result-count'].textContent,/1 of 7/);
    location.hash='#register';env.window.handlers.hashchange();assert.match(env.nodes.view.innerHTML,/<table>/);
    const b=env.button('data-record','eu-cbam-definitive');env.nodes.view.handlers.click({target:b});assert.equal(env.nodes['record-dialog'].open,true);assert.match(env.nodes['dialog-body'].innerHTML,/CBAM definitive/);
    env.nodes['close-dialog'].handlers.click();assert.equal(env.nodes['record-dialog'].open,false);
    env.nodes['clear-filters'].handlers.click();assert.match(env.nodes['result-count'].textContent,/7 of 7/);
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
  try{const base=`http://127.0.0.1:${server.address().port}`;for(const target of ['/','/assets/app.mjs','/assets/core.mjs','/assets/styles.css','/assets/demo.css','/assets/demo-core.mjs','/assets/demo-views.mjs','/data/client-demo.mjs','/data/records.json']){const response=await fetch(base+target);assert.equal(response.status,200);if(target.endsWith('.json'))assert.deepEqual(validateDataset(await response.json()),[]);}}
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
  assert.equal(boundaryPosition(orchid,snap.entities,'financial_control'),'Included (fictional control fact)');
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
  assert.ok(rows.every(r=>r.status==='outside'&&r.note.includes('local obligations are not assessed')));
});
test('invented rules show traces, cross-border nexus and unresolved input',()=>{
  const state=createDemoState(), rows=assessmentRows(state);
  assert.equal(rows.length,12);
  assert.equal(rows.find(r=>r.id==='atlas-au:DEMO-AU-01').status,'match');
  assert.equal(rows.find(r=>r.id==='atlas-uk:DEMO-UK-01').status,'unknown');
  const acquired=assessmentRows({...state,scenario:'acquisition'}).find(r=>r.id==='orchid:DEMO-UK-01');
  assert.equal(acquired.status,'match');assert.equal(acquired.jurisdiction,'United Kingdom');
  assert.ok(acquired.trace.every(t=>t.pass));
  assert.match(renderAssessment('atlas-uk:DEMO-UK-01',state),/UNKNOWN/);
  assert.match(renderAssessment('missing',state),/Assessment unavailable/);
});
test('rule change preserves historical v1 and compares before/after statuses',()=>{
  const state={...createDemoState(),scenario:'regulation'};
  assert.equal(snapshot({...state,asOf:'2026-08-27'}).version,'illustrative-v1');
  assert.equal(snapshot(state).version,'illustrative-v2');
  const diff=scenarioDiff(state);assert.equal(diff.length,1);
  assert.equal(diff[0].id,'atlas-au:DEMO-AU-01');assert.equal(diff[0].before,'match');assert.equal(diff[0].status,'no_match');
  assert.deepEqual(scenarioDiff({...state,asOf:'2026-08-27'}),[]);
  assert.equal(assessmentRows({...state,scenario:'baseline'}).find(r=>r.id===diff[0].id).status,'match');
});
test('workspace filters are independent and support the full jurisdiction/entity matrix',()=>{
  const state={...createDemoState(),entity:'atlas-sg',jurisdiction:'United Kingdom'};
  assert.equal(visibleRows(state).length,1);
  assert.equal(visibleRows({...state,entity:'all'}).length,4);
  assert.equal(visibleRows({...state,entity:'atlas-site'}).length,0);
  for(const profile of ['public','fictional'])for(const tab of ['graph','matrix','changes']){
    const output=renderWorkspace({...state,entity:'all',profile,tab});assert.doesNotMatch(output,/undefined|NaN/);
  }
});
test('notebook supports only guided questions and requires selected evidence',()=>{
  const state=createDemoState();
  for(const q of GUIDED_QUESTIONS)assert.equal(answerQuestion(q.question,state,data).supported,true);
  assert.equal(answerQuestion('  Which jurisdictions and triggers apply? ',state,data).supported,true);
  assert.equal(answerQuestion('Does Chevron owe a filing tomorrow?',state,data).supported,false);
  assert.equal(answerQuestion('What applies?',{...state,sources:['fictional-facts']},data).supported,false);
  const publicAnswer=answerQuestion('What applies?',{...state,profile:'public'},data);
  assert.ok(publicAnswer.rows.every(r=>r.status==='unknown'));
  assert.deepEqual(publicAnswer.citations,['public-entities']);
  const noIfRS=clone();noIfRS.records=noIfRS.records.filter(r=>r.id!=='ifrs-s2-ghg-amendments');
  assert.equal(answerQuestion(GUIDED_QUESTIONS[4].question,state,noIfRS).supported,false);
});
test('notebook answers reflect the active scenario, not workspace table filters',()=>{
  const state={...createDemoState(),scenario:'acquisition',entity:'atlas-au',jurisdiction:'Australia'};
  const answer=answerQuestion('What applies?',state,data);
  assert.equal(answer.rows.length,12);assert.match(answer.context,/Acquire Orchid/);
  assert.ok(answer.rows.some(r=>r.id==='orchid:DEMO-UK-01'&&r.status==='match'));
  assert.equal(answerQuestion('What changes in this scenario?',state,data).rows.length,3);
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
test('changing profiles prevents applying fictional scenarios to real entities',()=>{
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
  assert.match(output,/GUIDED DEMO — NO LIVE AI/);assert.match(output,/disabled>Add a client file/);
  assert.match(renderDemoSource('public-entities',data),/Exhibit 21, page 7/);
  assert.match(renderDemoSource('demo-rules',data),/invented/);
});
test('browser event wiring connects the workspace, guided questions, source selection and session saves',async()=>{
  const env=harness(async()=>({ok:true,json:async()=>clone()}));
  const click=(key,value='')=>env.nodes.view.handlers.click({target:env.button('data-demo-'+key,value)});
  try{
    await start();location.hash='#workspace';env.window.handlers.hashchange();
    assert.equal(env.nodes.filters.hidden,true);assert.match(env.nodes.view.innerHTML,/Atlas Beverages Group/);
    click('scenario','acquisition');click('entity','orchid');assert.match(env.nodes.view.innerHTML,/40%/);
    env.nodes.view.handlers.change({target:{id:'demo-boundary',value:'operational_control'}});assert.match(env.nodes.view.innerHTML,/Excluded by this boundary method/);
    click('tab','matrix');assert.match(env.nodes.view.innerHTML,/DEMO-UK-01/);
    click('assessment','orchid:DEMO-UK-01');assert.equal(env.nodes['record-dialog'].open,true);
    location.hash='#notebook';env.window.handlers.hashchange();assert.equal(env.nodes['record-dialog'].open,false);
    click('question','matrix');assert.match(env.nodes.view.innerHTML,/GUIDED RESPONSE/);click('save');assert.match(env.nodes.view.innerHTML,/NOTE 1/);
    env.nodes.view.handlers.change({target:env.button('data-demo-source-toggle','demo-rules')});assert.match(env.nodes.view.innerHTML,/Required evidence is not selected/);
    env.nodes['demo-question'].value='Unsupported arbitrary question';let prevented=false;
    env.nodes.view.handlers.submit({target:{id:'demo-question-form'},preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.match(env.nodes.view.innerHTML,/Outside the guided demo/);
    click('profile','public');click('question','matrix');assert.match(env.nodes.view.innerHTML,/PepsiCo Beverages Australia/);assert.match(env.nodes.view.innerHTML,/every row remains unresolved/);
    click('source','public-entities');assert.match(env.nodes['dialog-body'].innerHTML,/27 Dec 2025/);
  }finally{env.restore();}
});
