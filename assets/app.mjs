import {STAGES,REVIEW,DATE_TYPES,escapeHtml as e,safeUrl,formatDate,dateRange,isStale,filterRecords,milestones,developments,summarise,validateDataset} from './core.mjs';
import {createDemoState,updateDemo,validateDemo} from './demo-core.mjs';
import {renderWorkspace,renderNotebook,renderAssessment,renderDemoSource} from './demo-views.mjs';

const PAGES={overview:['Standards, in context.','A focused view of what is changing—and the evidence behind it.'],register:['The standards register','Search the research records. Open any record to inspect its source and limitations.'],updates:['The development log','Dated source events, not a claim that an automated scan has run.'],timeline:['Dates with their meaning intact','Effective dates, programme openings and projected milestones stay distinct.'],compare:['Different instruments. Different questions.','Editorial comparison prompts—not equivalence findings or compliance advice.'],method:['Evidence before conclusions','How this demo separates a source check, human review and entity applicability.']};
PAGES.workspace=['Client workspace','Atlas presentation demo: fictional company facts, source-backed requirements and explicit gaps.'];
PAGES.notebook=['Regulatory notebook','Selected sources, guided questions and session notes. No live AI or file analysis.'];
const badge=r=>`<span class="badge ${e(r.stage)}">${e(STAGES[r.stage])}</span>`;
const recordButton=(r,label=r.title)=>`<button type="button" class="text-button" data-record="${e(r.id)}">${e(label)}</button>`;
function sourceLink(s,label='Primary source ↗') {const url=safeUrl(s?.url);return url?`<a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(label)}</a>`:'<span>Source unavailable</span>';}
const noResults=()=>'<div class="empty"><h2>No matching records</h2><p>Try a broader search or reset your filters.</p><button type="button" class="button" data-reset>Reset filters</button></div>';
function card(r,today){return `<article class="record-card"><div class="card-top"><span class="framework">${e(r.framework)}</span>${badge(r)}</div><h3>${recordButton(r)}</h3><p>${e(r.summary)}</p><div class="card-action">${recordButton(r,'Inspect evidence ↗')}<small>${isStale(r,today)?'Source recheck due':r.review==='human_reviewed'?'Human reviewed':'Review pending'}</small></div></article>`;}
function milestoneItem(m,records){const r=records.find(r=>r.id===m.recordId);return `<div class="milestone"><time>${e(formatDate(m.date))}</time>${m.projected?' <span class="badge pending">Planned</span>':''}<p>${e(m.label)}</p>${recordButton(r)}<small>${e(DATE_TYPES[m.kind])}</small></div>`;}
function overview(records,today){
  const stats=summarise(records,today);const next=milestones(records,{upcomingOnly:true,today}).slice(0,4);
  return `<section class="metrics" aria-label="Filtered dataset counts"><div class="metric"><strong>${stats.records}</strong><span>Records in this view</span></div><div class="metric"><strong>${stats.frameworks}</strong><span>Framework groups</span></div><div class="metric warn"><strong>${stats.pending}</strong><span>Awaiting human review</span></div><div class="metric"><strong>${stats.stale}</strong><span>Source checks over 30 days old</span></div></section><div class="overview-grid"><section><div class="section-heading"><div><h2>The watch register</h2><p>Every record opens to its evidence.</p></div><a href="#register">View as table →</a></div><div class="record-grid">${records.map(r=>card(r,today)).join('')}</div></section><aside class="overview-aside"><section class="side-panel"><p class="eyebrow">LOOKING AHEAD</p><h2>Next dated milestones</h2>${next.length?next.map(m=>milestoneItem(m,records)).join(''):'<p>No upcoming dated milestones in this selection. That does not mean no obligations apply.</p>'}<p style="margin-top:18px"><a href="#timeline">Explore the timeline →</a></p></section><section class="side-panel dark"><p class="eyebrow">READ THE DISTINCTION</p><h2>Published is not the same as applicable.</h2><p>A source can confirm a standard or date without establishing what your organisation must do.</p><p>This starter dataset is awaiting human review. Atlas screens four selected real requirements against fictional company facts, with citations and human review pending.</p></section></aside></div>`;
}
function register(records,today){return `<div class="table-wrap"><table><caption class="sr-only">Filtered standards and development records</caption><thead><tr><th scope="col">Record</th><th scope="col">Framework / region</th><th scope="col">Stage</th><th scope="col">Evidence status</th><th scope="col">Source</th></tr></thead><tbody>${records.map(r=>`<tr><td>${recordButton(r)}<small>${e(r.category)}</small></td><td>${e(r.framework)}<small>${e(r.region)}</small></td><td>${badge(r)}</td><td>${e(REVIEW[r.review])}<small>Checked ${e(formatDate(r.checked_on))}${isStale(r,today)?' · recheck due':''}</small></td><td>${sourceLink(r.sources[0])}</td></tr>`).join('')}</tbody></table></div>`;}
function updates(records){const items=developments(records);return items.length?items.map(d=>{const r=records.find(r=>r.id===d.recordId);return `<article class="update"><time>${e(formatDate(d.date))}</time><div><p class="framework">${e(r.framework)}</p><h2>${e(d.label)}</h2><p style="margin-top:10px">${e(r.change_note)}</p><div class="update-foot">${recordButton(r,'Open record →')}${sourceLink(r.sources[d.source])}<span>Current record stage: ${e(STAGES[r.stage])}</span></div></div></article>`;}).join(''):'<div class="empty"><h2>No dated developments recorded</h2><p>Open the register for the available evidence.</p></div>';}
function timeline(records,today,upcoming){const items=milestones(records,{upcomingOnly:upcoming,today});return `<div class="timeline-tools"><p class="eyebrow">${items.length} MILESTONES · ${upcoming?'UPCOMING':'ALL RECORDED DATES'}</p><label><input type="checkbox" id="upcoming-only" ${upcoming?'checked':''}> Upcoming only</label></div><div class="timeline-list">${items.length?items.map(m=>{const r=records.find(r=>r.id===m.recordId);const past=dateRange(m.date)[1]<today.getTime();return `<article class="timeline-row ${m.projected?'projected':''}"><div><time>${e(formatDate(m.date))}</time><small>${m.projected?'Projected · may change':past?'Date elapsed · not a completion finding':'Source-stated date'}</small></div><div><span class="framework">${e(m.framework)}</span><h3 style="margin-top:7px">${e(m.label)}</h3><p>${e(DATE_TYPES[m.kind])}</p><div class="update-foot">${recordButton(r)}${sourceLink(r.sources[m.source])}</div></div></article>`;}).join(''):'<div class="empty"><h2>No upcoming dates in this selection</h2><p>Uncheck “Upcoming only” to see past recorded dates.</p></div>'}</div><p class="coverage-note">A quarter is displayed as a quarter—not an invented deadline. A passed date does not prove that an event occurred. Source-stated dates remain subject to later changes.</p>`;}
function compare(data){return `<p class="coverage-note">These are original editorial questions to guide further assessment. Follow the linked records for primary sources. No automatic equivalence or applicability determination is made.</p><div class="comparison-grid">${data.comparisons.map((c,i)=>`<article class="comparison-card"><p class="eyebrow">COMPARISON ${String(i+1).padStart(2,'0')}</p><h2>${e(c.topic)}</h2><p style="margin-top:14px">${e(c.distinction)}</p><p class="question">${e(c.question)}</p><div class="record-links">${c.records.map(id=>recordButton(data.records.find(r=>r.id===id))).join('')}</div></article>`).join('')}</div>`;}
function method(data,today){const stats=summarise(data.records,today);return `<div class="method-grid"><div><section class="method-section"><p class="eyebrow">RESEARCH STANDARD</p><h2>What each evidence label means</h2><p><strong>Source checked:</strong> an official source was read to support the bounded summary and dates. It is not a full standards audit or a human sign-off.</p><p><strong>Human reviewed:</strong> a named reviewer and review date are recorded. This still does not establish applicability to a particular entity.</p><p><strong>Not verified:</strong> supporting evidence is incomplete. Treat the record as a research lead.</p><p>Checks older than 30 days are flagged for rechecking. The clock does not automatically change the legal or technical status of a record.</p></section><section class="method-section"><p class="eyebrow">PROPOSED OPERATING MODEL</p><h2>Research → verify → approve</h2><ol><li>Research approved primary sources; save dated evidence and a proposed change.</li><li>Independently verify the claim, date type and source. Flag conflicting information.</li><li>Validate the dataset and submit a pull request with the evidence.</li><li>A human approves material changes before publication.</li><li>Periodically recheck existing records, not just new announcements.</li></ol><p><strong>Not running:</strong> no model provider, API credentials, search service or scheduled agent has been configured. The GitHub check validates files; it does not research regulations.</p></section></div><div><section class="method-section"><p class="eyebrow">CURRENT EDITION</p><h2>${e(data.edition||'Research starter')}</h2><div class="queue-row"><strong>Prepared</strong><span>${e(formatDate(data.prepared_on))}</span></div><div class="queue-row"><strong>Human review pending</strong><span>${stats.pending} records</span></div><div class="queue-row"><strong>Source rechecks due</strong><span>${stats.stale} records</span></div><p style="margin-top:15px">The initial summaries were written from official sources. They are a selected starting set, not comprehensive coverage of all GHG standards or legal developments.</p></section><section class="method-section"><p class="eyebrow">COVERAGE TO EXPAND</p><h2>Research backlog</h2><p>CSRD / ESRS revisions, California requirements, jurisdictional ISSB adoption and sector-specific target standards need separate research before records are added.</p><p>Absence from this tracker never means an obligation does not apply.</p></section><section class="method-section"><h2>Implementation provenance</h2><p>This working version uses new code, original styling and a new dataset. The earlier tracker was a functional reference only. No original author endpoint, images or compiled dataset is used by this version. The client workspace separately labels a small public PepsiCo subsidiary extract and fictional Atlas scenarios.</p><p>The GitHub repository remains a fork and retains its earlier history. This project does not claim ownership of that history or grant rights to third-party standards.</p></section></div></div>`;}
export function renderView({view='overview',data,records=data.records,today=new Date(),upcoming=true,demo=createDemoState()}){
  if(view==='workspace')return renderWorkspace(demo);
  if(view==='notebook')return renderNotebook(demo,data);
  if(view==='compare')return compare(data);if(view==='method')return method(data,today);if(!records.length)return noResults();
  return ({overview:()=>overview(records,today),register:()=>register(records,today),updates:()=>updates(records),timeline:()=>timeline(records,today,upcoming)})[view]?.()||overview(records,today);
}
export function renderDetail(r,today=new Date()) {return `<span class="framework">${e(r.framework)} · ${e(r.region)}</span><h2 id="dialog-title">${e(r.title)}</h2><div class="detail-meta">${badge(r)} · ${e(r.category)}</div><p>${e(r.summary)}</p><h3>What changed</h3><p>${e(r.change_note)}</p><h3>Suggested review action</h3><p>${e(r.action)}</p><h3>Applicability boundary</h3><p>${e(r.applicability)}</p><h3>Evidence and limitations</h3><div class="check-note"><strong>${e(REVIEW[r.review])}</strong><p style="margin:6px 0 0">${e(r.check_note)}</p><p style="margin:8px 0 0">Source checked ${e(formatDate(r.checked_on))}${isStale(r,today)?' · recheck due':''}${r.review==='human_reviewed'?` · Reviewed by ${e(r.reviewer)} on ${e(formatDate(r.reviewed_on))}`:''}</p></div>${r.sources.map(s=>`<div class="source">${sourceLink(s,s.title+' ↗')}<small>${e(s.publisher)}</small></div>`).join('')}<p class="provenance">Record: ${e(r.id)} · Summary and review actions are original editorial work. The linked publisher’s source is authoritative, subject to its scope and any subsequent changes.</p>`;}

export async function start(){
  const $=id=>document.getElementById(id);
  let data=null, upcoming=true, loaded=false, demo=createDemoState();
  const state={query:'',framework:'all',stage:'all',region:'all'};
  const route=()=>Object.hasOwn(PAGES,location.hash.slice(1))?location.hash.slice(1):'workspace';
  const setOptions=(id,values,labels={})=>{
    for(const value of values){const option=document.createElement('option');option.value=value;option.textContent=labels[value]||value;$(id).append(option);}
  };
  function render(){
    if(!data)return;
    const view=route(), filtered=filterRecords(data.records,state);
    const applicable=!['compare','method','workspace','notebook'].includes(view);
    $('page-title').textContent=PAGES[view][0];$('page-intro').textContent=PAGES[view][1];
    $('filters').hidden=!applicable;
    $('result-count').textContent=applicable?`${filtered.length} of ${data.records.length} records · Selected research coverage · Source dates are not scan dates`:['workspace','notebook'].includes(view)?'Demonstration workspace · Independent from standards-register filters · Changes stay in this session':'All records · Filters do not apply to this view';
    document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')==='#'+view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    $('view').innerHTML=renderView({view,data,records:filtered,upcoming,demo});
    $('view').setAttribute('aria-busy','false');
    document.title=`${view==='overview'?'GHG Standards Watch':PAGES[view][0]} | Wisdom AI Lab`;
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
    if(target.hasAttribute('data-record'))showRecord(target.getAttribute('data-record'));
    if(target.hasAttribute('data-reset'))reset();
    if(target.hasAttribute('data-retry'))void load();
    if(target.hasAttribute('data-demo-source'))showDialog(renderDemoSource(target.getAttribute('data-demo-source'),data));
    if(target.hasAttribute('data-demo-assessment'))showDialog(renderAssessment(target.getAttribute('data-demo-assessment'),demo));
    for(const action of ['profile','scenario','entity','tab','question','save','clear-notes','clear-filters']){
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
      const errors=[...validateDataset(next),...validateDemo()];
      if(errors.length)throw new Error(`Dataset validation failed: ${errors[0]}`);
      data=next;
      if(!loaded){setOptions('framework',[...new Set(data.records.map(r=>r.framework))].sort());setOptions('stage',Object.keys(STAGES),STAGES);setOptions('region',[...new Set(data.records.map(r=>r.region))].sort());loaded=true;}
      const pending=summarise(data.records).pending;
      $('dataset-status').innerHTML=`<strong>Prepared ${e(formatDate(data.prepared_on))}</strong>${pending?`${pending} records await human review`:'All records carry a human review'} · manual edition`;
      render();
    }catch(error){
      data=null;$('filters').hidden=true;$('dataset-status').textContent='Dataset unavailable';$('result-count').textContent='';
      $('view').innerHTML=`<div class="empty error" role="alert"><h2>We could not open the register</h2><p>${e(error.name==='AbortError'?'The dataset request timed out.':error.message)}</p><p>Serve this folder over HTTP or HTTPS with data/records.json beside the website assets.</p><button class="button" type="button" data-retry>Try again</button></div>`;
      $('view').setAttribute('aria-busy','false');
    }finally{clearTimeout(timer);}
  }
  await load();
}
if(typeof document!=='undefined')void start();
