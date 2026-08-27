import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {STAGES,escapeHtml,safeUrl,dateRange,formatDate,isStale,filterRecords,milestones,developments,summarise,validateDataset} from '../assets/core.mjs';
import {renderView,renderDetail,start} from '../assets/app.mjs';

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
test('all six views render source-linked content without undefined fields',()=>{
  for(const view of ['overview','register','updates','timeline','compare','method']){
    const result=renderView({view,data,today});assert.ok(result.length>250);assert.doesNotMatch(result,/undefined|NaN/);
    assert.match(result,/record|Record|Source|source/);
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
  assert.match(html,/<nav aria-label="Main navigation">/);assert.equal([...html.matchAll(/<a href="#(?:overview|register|updates|timeline|compare|method)"/g)].length,6);
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
  const nav=['overview','register','updates','timeline','compare','method'].map(v=>{const el=new Element();el.setAttribute('href','#'+v);return el;});
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
  try{const base=`http://127.0.0.1:${server.address().port}`;for(const target of ['/','/assets/app.mjs','/assets/core.mjs','/assets/styles.css','/data/records.json']){const response=await fetch(base+target);assert.equal(response.status,200);if(target.endsWith('.json'))assert.deepEqual(validateDataset(await response.json()),[]);}}
  finally{await new Promise(resolve=>server.close(resolve));}
});
