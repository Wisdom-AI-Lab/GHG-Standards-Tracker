import {STAGES,REVIEW,DATE_TYPES,escapeHtml as e,safeUrl,formatDate,formatTimelineDate,datePrecision,dateRange,isStale,filterRecords,milestones,developments,summarise,validateDataset} from './core.mjs';
import {createDemoState,updateDemo,validateDemo} from './demo-core.mjs';
import {renderWorkspace,renderNotebook,renderAssessment,renderDemoSource} from './demo-views.mjs';

import {renderInteractions} from './interaction-views.mjs';
import {validateInteractions} from '../data/interactions.mjs';
import {GLOSSARY} from '../data/glossary.mjs';

const PAGES={overview:['Regulatory Overview','Assessment of changes in sustainability frameworks'],register:['The standards register','Explore requirements, development stages and supporting sources.'],updates:['Amended Disclosure Requirements',''],timeline:['Regulatory timeline','Publication, reporting periods and proposed deadlines.'],compare:['Compare regulatory impacts',''],method:['Evidence',''],interoperability:['Regulatory interoperability','Shared evidence, reporting overlaps and separate compliance responsibilities.']};
PAGES.workspace=['Client workspace','Explore entity relationships, reporting boundaries and regulatory applicability.'];
PAGES.notebook=['Regulatory notebook','Selected sources, guided questions and session notes.'];
const developmentNav=active=>`<nav class="section-nav" aria-label="Regulatory change sections"><a href="#updates" ${active==='updates'?'aria-current="page"':''}>Amended Disclosure Requirements</a><a href="#compare" ${active==='compare'?'aria-current="page"':''}>Compare regulatory impacts</a><a href="#interoperability" ${active==='interoperability'?'aria-current="page"':''}>Interoperability map</a></nav>`;
const badge=r=>`<span class="badge ${e(r.stage)}">${e(STAGES[r.stage])}</span>`;
const recordButton=(r,label=r.title)=>`<button type="button" class="text-button" data-record="${e(r.id)}">${e(label)}</button>`;
function sourceLink(s,label='Primary source ↗') {const url=safeUrl(s?.url);return url?`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`:'<span>Source unavailable</span>';}
const noResults=()=>'<div class="empty"><h2>No matching records</h2><p>Try a broader search or reset your filters.</p><button type="button" class="button" data-reset>Reset filters</button></div>';
function card(r,today){return `<article class="record-card"><div class="card-top"><span class="framework">${e(r.framework)}</span>${badge(r)}</div><h3>${recordButton(r)}</h3><p>${e(r.summary)}</p><div class="card-action">${recordButton(r,'Inspect evidence ↗')}<small>${isStale(r,today)?'Source recheck due':r.review==='human_reviewed'?'Human reviewed':'Review pending'}</small></div></article>`;}
function milestoneItem(m,records){const r=records.find(r=>r.id===m.recordId);return `<div class="milestone"><time title="${e(datePrecision(m.date))}">${e(formatTimelineDate(m.date))}</time>${m.projected?' <span class="badge pending">Planned</span>':''}<p>${e(m.label)}</p>${recordButton(r)}<small>${e(DATE_TYPES[m.kind])}</small></div>`;}
function overview(records,today){
  const stats=summarise(records,today);const next=milestones(records,{upcomingOnly:true,today}).slice(0,4);
  return `<section class="metrics" aria-label="Filtered dataset counts"><div class="metric"><strong>${stats.records}</strong><span>Records in this view</span></div><div class="metric"><strong>${stats.frameworks}</strong><span>Framework groups</span></div><div class="metric warn"><strong>${stats.pending}</strong><span>Awaiting human review</span></div><div class="metric"><strong>${stats.stale}</strong><span>Source checks over 30 days old</span></div></section><div class="overview-grid"><section><div class="section-heading"><div><h2>The watch register</h2><p>Every record opens to its evidence.</p></div><a href="#register">View as table →</a></div><div class="record-grid">${records.map(r=>card(r,today)).join('')}</div></section><aside class="overview-aside"><section class="side-panel"><p class="eyebrow">LOOKING AHEAD</p><h2>Next dated milestones</h2>${next.length?next.map(m=>milestoneItem(m,records)).join(''):'<p>No upcoming dated milestones in this selection. That does not mean no obligations apply.</p>'}<p style="margin-top:18px"><a href="#timeline">Explore the timeline →</a></p></section><section class="side-panel dark"><p class="eyebrow">READ THE DISTINCTION</p><h2>Published is not the same as applicable.</h2><p>A source can confirm a standard or date without establishing what your organisation must do.</p><p>This starter dataset is awaiting human review. The client workspace applies selected reporting routes to an illustrative company dataset; conclusions retain their evidence and review limits.</p></section></aside></div>`;
}
function register(records,today){return `<div class="table-wrap"><table><caption class="sr-only">Filtered standards and development records</caption><thead><tr><th scope="col">Record</th><th scope="col">Framework / region</th><th scope="col">Stage</th><th scope="col">Evidence status</th><th scope="col">Source</th></tr></thead><tbody>${records.map(r=>`<tr><td>${recordButton(r)}<small>${e(r.category)}</small></td><td>${e(r.framework)}<small>${e(r.region)}</small></td><td>${badge(r)}</td><td>${e(REVIEW[r.review])}<small>Checked ${e(formatDate(r.checked_on))}${isStale(r,today)?' · recheck due':''}</small></td><td>${sourceLink(r.sources[0])}</td></tr>`).join('')}</tbody></table></div>`;}
function updates(records){const items=developments(records);return items.length?items.map(d=>{const r=records.find(r=>r.id===d.recordId);return `<article class="update"><time>${e(formatDate(d.date))}</time><div><p class="framework">${e(r.framework)}</p><h2>${e(d.label)}</h2><p style="margin-top:10px">${e(r.change_note)}</p><div class="update-foot">${recordButton(r,'Open record →')}${sourceLink(r.sources[d.source])}<span>Current record stage: ${e(STAGES[r.stage])}</span></div></div></article>`;}).join(''):'<div class="empty"><h2>No dated developments recorded</h2><p>Open the register for the available evidence.</p></div>';}
function timeline(records,today,upcoming){const items=milestones(records,{upcomingOnly:upcoming,today});return `<div class="timeline-tools"><p class="eyebrow">${items.length} MILESTONES · ${upcoming?'UPCOMING':'ALL RECORDED DATES'}</p><label><input type="checkbox" id="upcoming-only" ${upcoming?'checked':''}> Upcoming only</label></div><div class="timeline-list">${items.length?items.map(m=>{const r=records.find(r=>r.id===m.recordId);const past=dateRange(m.date)[1]<today.getTime();return `<article class="timeline-row ${m.projected?'projected':''}"><div><time title="${e(datePrecision(m.date))}">${e(formatTimelineDate(m.date))}</time><small class="date-precision">${e(datePrecision(m.date))}</small><small>${m.projected?'Projected · may change':past?'Date elapsed · not a completion finding':'Source-stated date'}</small></div><div><span class="framework">${e(m.framework)}</span><h3 style="margin-top:7px">${e(m.label)}</h3><p>${e(DATE_TYPES[m.kind])}</p><div class="update-foot">${recordButton(r)}${sourceLink(r.sources[m.source])}</div></div></article>`;}).join(''):'<div class="empty"><h2>No upcoming dates in this selection</h2><p>Uncheck “Upcoming only” to see past recorded dates.</p></div>'}</div><p class="coverage-note">Dates use a month/year scale. Quarter- and year-only sources appear as month ranges with their original precision identified; no exact month is invented. Exact days remain visible above and in record details. Conditional dates are planning anchors, and elapsed dates are not proof of completion.</p>`;}
function compare(data){return `<p class="coverage-note">These are original editorial questions to guide further assessment. Follow the linked records for primary sources. No automatic equivalence or applicability determination is made.</p><div class="comparison-grid">${data.comparisons.map((c,i)=>`<article class="comparison-card"><p class="eyebrow">COMPARISON ${String(i+1).padStart(2,'0')}</p><h2>${e(c.topic)}</h2><p style="margin-top:14px">${e(c.distinction)}</p><p class="question">${e(c.question)}</p><div class="record-links">${c.records.map(id=>recordButton(data.records.find(r=>r.id===id))).join('')}</div></article>`).join('')}</div>`;}
function method(data,today){const stats=summarise(data.records,today);return `<div class="method-grid"><section class="method-section"><p class="eyebrow">EVIDENCE LABELS</p><h2>What has been checked</h2><p><strong>Source checked:</strong> an official or identified primary source supports a bounded summary. This is not a full audit or human sign-off.</p><p><strong>Human reviewed:</strong> a named reviewer and date are recorded; entity applicability still needs assessment.</p><p><strong>Not verified:</strong> evidence is incomplete. Checks over 30 days old are flagged without changing a record’s legal status.</p></section><section class="method-section"><p class="eyebrow">REVIEW WORKFLOW</p><h2>Research → verify → approve</h2><p>Capture primary evidence, verify claims and date types independently, test the proposed changes, and obtain human approval before publication.</p><p><strong>Monitoring:</strong> no scheduled research or live AI is configured. Near real-time monitoring is a planned capability. GitHub checks validate files only.</p><p>Recheck existing records as well as new announcements. Retrieval failures must remain visible.</p></section><section class="method-section"><p class="eyebrow">CURRENT EDITION & COVERAGE</p><h2>${e(data.edition||'Research register')}</h2><div class="queue-row"><strong>Edition</strong><span>${e(formatDate(data.prepared_on))}</span></div><div class="queue-row"><strong>Review pending / recheck due</strong><span>${stats.pending} / ${stats.stale}</span></div><p style="margin-top:12px">CSRD, PPWR and seven US packaging EPR states are included. Detailed national implementation, exemptions, other product EPR regimes and unlisted jurisdictions remain coverage gaps.</p><p>State programme phases are not individual filing deadlines. Missing records never establish an exemption.</p></section><section class="method-section"><p class="eyebrow">DATA & PROVENANCE</p><h2>Know the evidence boundary</h2><p><strong>Illustrative company data:</strong> Atlas entities, financial inputs, materiality and transactions are sample scenarios, not verified client records. PepsiCo remains a separate limited public extract.</p><p>Priority actions and interoperability links are editorial decision support, not compliance determinations or proof of legal equivalence.</p><p>This version uses original summaries and implementation. Repository history and third-party standards retain their respective rights; linked sources remain authoritative.</p></section></div><section class="method-section glossary"><p class="eyebrow">REFERENCE</p><h2>Glossary</h2><div class="table-wrap"><table><caption class="sr-only">ESG reporting terms</caption><thead><tr><th scope="col">Term</th><th scope="col">Meaning</th></tr></thead><tbody>${GLOSSARY.map(item=>`<tr><th scope="row">${e(item.term)}</th><td>${e(item.definition)}</td></tr>`).join('')}</tbody></table></div></section>`;}
export function renderView({view='overview',data,records=data.records,today=new Date(),upcoming=true,demo=createDemoState(),interaction='esrs-issb'}){
  if(view==='workspace')return renderWorkspace(demo,data);
  if(view==='interoperability')return developmentNav('interoperability')+renderInteractions(data,interaction);
  if(view==='notebook')return renderNotebook(demo,data);
  if(view==='compare')return developmentNav('compare')+compare(data);if(view==='method')return method(data,today);if(view==='updates')return developmentNav('updates')+(records.length?updates(records):noResults());if(!records.length)return noResults();
  return ({overview:()=>overview(records,today),register:()=>register(records,today),updates:()=>updates(records),timeline:()=>timeline(records,today,upcoming)})[view]?.()||overview(records,today);
}
export function renderDetail(r,today=new Date()) {return `<span class="framework">${e(r.framework)} · ${e(r.region)}</span><h2 id="dialog-title">${e(r.title)}</h2><div class="detail-meta">${badge(r)} · ${e(r.category)}</div><p>${e(r.summary)}</p><h3>What changed</h3><p>${e(r.change_note)}</p><h3>Suggested review action</h3><p>${e(r.action)}</p><h3>Applicability boundary</h3><p>${e(r.applicability)}</p><h3>Timeline and exact date evidence</h3><ul class="detail-dates">${r.milestones.map(m=>`<li><strong>${e(formatDate(m.date))}</strong> · ${e(m.label)}<small>${e(DATE_TYPES[m.kind])}${m.projected?' · Conditional / planned':''}</small></li>`).join('')}</ul><h3>Evidence and limitations</h3><div class="check-note"><strong>${e(REVIEW[r.review])}</strong><p style="margin:6px 0 0">${e(r.check_note)}</p><p style="margin:8px 0 0">Source checked ${e(formatDate(r.checked_on))}${isStale(r,today)?' · recheck due':''}${r.review==='human_reviewed'?` · Reviewed by ${e(r.reviewer)} on ${e(formatDate(r.reviewed_on))}`:''}</p></div>${r.sources.map(s=>`<div class="source">${sourceLink(s,s.title+' ↗')}<small>${e(s.publisher)}${s.locator?' · '+e(s.locator):''}</small></div>`).join('')}<p class="provenance">Record: ${e(r.id)} · Summary and review actions are original editorial work. The linked publisher’s source is authoritative, subject to its scope and any subsequent changes.</p>`;}

export async function start(){
  const $=id=>document.getElementById(id);
  let data=null, upcoming=true, loaded=false, demo=createDemoState(), interaction='esrs-issb';
  const state={query:'',framework:'all',stage:'all',region:'all'};
  const route=()=>Object.hasOwn(PAGES,location.hash.slice(1))?location.hash.slice(1):'workspace';
  const setOptions=(id,values,labels={})=>{
    for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=labels[value]||value;$(id).append(option);}
  };
  function render(){
    if(!data)return;
    const view=route(), filtered=filterRecords(data.records,state);
    const applicable=!['compare','interoperability','method','workspace','notebook'].includes(view);
    $('page-title').textContent=PAGES[view][0];$('page-intro').textContent=PAGES[view][1];
    $('filters').hidden=!applicable;
    $('result-count').hidden=!applicable;
    $('result-count').textContent=applicable?`${filtered.length} of ${data.records.length} records`:'';
    document.querySelectorAll('.navigation nav a').forEach(a=>{if(a.getAttribute('href')==='#'+(['compare','interoperability'].includes(view)?'updates':view))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('view').innerHTML=renderView({view,data,records:filtered,upcoming,demo,interaction});
    $('view').setAttribute('aria-busy','false');
    document.title=`${PAGES[view][0]} | ESG Regulatory Scanner`;
  }
  function reset(){Object.assign(state,{query:'',framework:'all',stage:'all',region:'all'});$('search').value='';for(const id of ['framework','stage','region'])$(id).value='all';render();}
  function showDialog(content){$('dialog-body').innerHTML=content;$('record-dialog').showModal();$('close-dialog').focus();}
  function showRecord(id){const r=data?.records.find(r=>r.id===id);if(r)showDialog(renderDetail(r));}
  function changeDemo(action,value){demo=updateDemo(demo,action,value,data);render();}
  for(const id of ['search','framework','stage','region'])$(id).addEventListener(id==='search'?'input':'change',()=>{state[id==='search'?'query':id]=$(id).value;render();});
  $('clear-filters').addEventListener('click',reset);
  $('close-dialog').addEventListener('click',()=>$('record-dialog').close());
  $('view').addEventListener('click',event=>{
    const target=event.target.closest('button');if(!target)return;
    if(target.hasAttribute('data-map-relation')){interaction=target.getAttribute('data-map-relation');render();}
    if(target.hasAttribute('data-record'))showRecord(target.getAttribute('data-record'));
    if(target.hasAttribute('data-reset'))reset();
    if(target.hasAttribute('data-retry'))void load();
    if(target.hasAttribute('data-demo-source'))showDialog(renderDemoSource(target.getAttribute('data-demo-source'),data));
    if(target.hasAttribute('data-demo-assessment'))showDialog(renderAssessment(target.getAttribute('data-demo-assessment'),demo));
    for(const action of ['profile','scenario','entity','tab','question','save','clear-notes','clear-filters','materiality-case','materiality-level','supplier-evidence']){
      if(target.hasAttribute('data-demo-'+action))changeDemo(action,target.getAttribute('data-demo-'+action));
    }
  });
  $('view').addEventListener('change',event=>{
    const target=event.target;
    if(target.id==='upcoming-only'){upcoming=target.checked;render();}
    const actions={'demo-date':'date','demo-period':'period','demo-boundary':'boundary','demo-entity':'entity','demo-jurisdiction':'jurisdiction'};
    if(actions[target.id])changeDemo(actions[target.id],target.value);
    const source=target.getAttribute?.('data-demo-source-toggle');
    if(source)changeDemo('source-toggle',source);
  });
  $('view').addEventListener('input',event=>{if(event.target.id==='demo-question')demo.question=event.target.value.slice(0,500);});
  $('view').addEventListener('submit',event=>{
    if(event.target.id==='demo-question-form'){event.preventDefault();changeDemo('ask',$('demo-question').value);}
  });
  window.addEventListener('hashchange',()=>{if($('record-dialog').open)$('record-dialog').close();render();});
  async function load(){
    $('view').setAttribute('aria-busy','true');$('view').innerHTML='<div class="empty"><h2>Loading the research records…</h2></div>';
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch('data/records.json',{cache:'no-cache',signal:controller.signal});
      if(!response.ok)throw new Error(`Dataset request failed (HTTP ${response.status}).`);
      let next;try{next=await response.json();}catch{throw new Error('The dataset is not valid JSON.');}
      const errors=[...validateDataset(next),...validateDemo(),...validateInteractions(next)];
      if(errors.length)throw new Error(`Dataset validation failed: ${errors[0]}`);
      data=next;
      if(!loaded){setOptions('framework',[...new Set(data.records.map(r=>r.framework))].sort());setOptions('stage',Object.keys(STAGES),STAGES);setOptions('region',[...new Set(data.records.map(r=>r.region))].sort());loaded=true;}
      $('dataset-status').hidden=true;
      $('dataset-status').textContent='';
      $('last-update').textContent='Last update: '+new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(dateRange(data.prepared_on)[0]);
      render();
    }catch(error){
      data=null;$('filters').hidden=true;$('dataset-status').hidden=false;$('dataset-status').textContent='Dataset unavailable';$('last-update').textContent='Update status unavailable';$('result-count').textContent='';
      $('view').innerHTML=`<div class="empty error" role="alert"><h2>We could not open the register</h2><p>${e(error.name==='AbortError'?'The dataset request timed out.':error.message)}</p><p>Serve this folder over HTTP or HTTPS with data/records.json beside the website assets.</p><button class="button" type="button" data-retry>Try again</button></div>`;
      $('view').setAttribute('aria-busy','false');
    }finally{clearTimeout(timer);}
  }
  await load();
}
if(typeof document!=='undefined')void start();
