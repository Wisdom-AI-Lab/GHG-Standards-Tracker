export const STAGES = Object.freeze({development:'In development', published:'Published', effective:'Effective', proposal:'Proposal'});
export const REVIEW = Object.freeze({source_checked:'Source checked · review pending', human_reviewed:'Human reviewed', unverified:'Not verified'});
export const DATE_TYPES = Object.freeze({publication:'Publication', consultation:'Planned consultation', expected_publication:'Expected publication', standard_effective:'Standard effective date', regulatory_effective:'Regulatory effective date', programme_opening:'Programme opening', comment_deadline:'Comment deadline'});

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function dateRange(value) {
  if (typeof value !== 'string') return null;
  const q = /^(\d{4})-Q([1-4])$/.exec(value);
  if (q) {const y=+q[1], m=(+q[2]-1)*3; return [Date.UTC(y,m,1),Date.UTC(y,m+3,0,23,59,59,999)];}
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value);
  if (!m || +m[2]<1 || +m[2]>12 || (m[3] && (+m[3]<1 || +m[3]>31))) return null;
  const start=Date.UTC(+m[1],+m[2]-1,m[3]?+m[3]:1);
  if(new Date(start).getUTCMonth()!==+m[2]-1) return null;
  return [start,m[3]?start+86400000-1:Date.UTC(+m[1],+m[2],0,23,59,59,999)];
}
export function formatDate(value) {
  const range=dateRange(value); if(!range) return 'Not specified';
  if(value.includes('-Q')) return `${value.slice(5)} ${value.slice(0,4)}`;
  return new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',...(value.length===10?{day:'numeric'}:{}),month:'short',year:'numeric'}).format(range[0]);
}
export function isStale(record, today = new Date(), days = 30) {
  const range=dateRange(record.checked_on); return !range || today.getTime()-range[1]>days*86400000;
}
export function filterRecords(records,{query='',framework='all',stage='all',region='all'}={}) {
  const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return records.filter(r=> (framework==='all'||r.framework===framework) && (stage==='all'||r.stage===stage) && (region==='all'||r.region===region) && terms.every(t=>[r.title,r.framework,r.summary,r.action,r.region,...r.tags].join(' ').toLocaleLowerCase().includes(t)));
}
export function milestones(records,{upcomingOnly=false, today=new Date()}={}) {
  return records.flatMap(record=>record.milestones.map(m=>({...m,recordId:record.id,title:record.title,framework:record.framework}))).filter(m=>!upcomingOnly||dateRange(m.date)[1]>=today.getTime()).sort((a,b)=>dateRange(a.date)[0]-dateRange(b.date)[0]||a.title.localeCompare(b.title));
}
export function developments(records) {
  return records.flatMap(r=>r.developments.map(d=>({...d,recordId:r.id,title:r.title,framework:r.framework}))).sort((a,b)=>dateRange(b.date)[0]-dateRange(a.date)[0]||a.title.localeCompare(b.title));
}
export function summarise(records,today=new Date()) {
  return {records:records.length,frameworks:new Set(records.map(r=>r.framework)).size,pending:records.filter(r=>r.review!=='human_reviewed').length,stale:records.filter(r=>isStale(r,today)).length};
}
export function validateDataset(data) {
  const errors=[];const add=(ok,msg)=>{if(!ok)errors.push(msg);};
  if(!data||typeof data!=='object'||Array.isArray(data))return ['Dataset must be an object'];
  add(data.schema_version===1,'Unsupported schema_version');
  add(!!dateRange(data.prepared_on)&&data.prepared_on.length===10,'prepared_on must be an exact date');
  if(!Array.isArray(data.records))return [...errors,'records must be an array'];
  const ids=new Set();
  data.records.forEach((r,i)=>{
    const p=`records[${i}]`; if(!r||typeof r!=='object'){errors.push(`${p} must be an object`);return;}
    for(const key of ['id','title','framework','category','region','summary','action','applicability','change_note','check_note'])add(typeof r[key]==='string'&&r[key].trim().length>0,`${p}.${key} is required`);
    add(/^[a-z0-9-]+$/.test(r.id||'')&&!ids.has(r.id),`${p}.id must be unique and URL-safe`);ids.add(r.id);
    add(Object.hasOwn(STAGES,r.stage),`${p}.stage is invalid`);add(Object.hasOwn(REVIEW,r.review),`${p}.review is invalid`);
    const checked=dateRange(r.checked_on);add(!!checked&&r.checked_on.length===10,`${p}.checked_on requires an exact date`);
    if(checked&&dateRange(data.prepared_on))add(checked[0]<=dateRange(data.prepared_on)[1],`${p} checked after prepared_on`);
    if(r.review==='human_reviewed'){
      const reviewed=dateRange(r.reviewed_on);
      add(typeof r.reviewer==='string'&&r.reviewer.trim().length>0&&!!reviewed&&r.reviewed_on.length===10,`${p} human review needs reviewer and exact reviewed_on`);
      if(reviewed&&dateRange(data.prepared_on))add(reviewed[0]<=dateRange(data.prepared_on)[1],`${p} review cannot be after prepared_on`);
    }
    add(Array.isArray(r.tags)&&r.tags.every(t=>typeof t==='string'),`${p}.tags must be strings`);
    const sources=Array.isArray(r.sources)?r.sources:[];
    add(sources.length>0,`${p} requires primary sources`);
    sources.forEach((s,j)=>{add(!!s&&!!safeUrl(s.url)&&typeof s.title==='string'&&s.title.trim().length>0&&typeof s.publisher==='string'&&s.publisher.trim().length>0,`${p}.sources[${j}] needs a title, publisher and HTTPS URL`);});
    for(const key of ['milestones','developments']){
      add(Array.isArray(r[key]),`${p}.${key} must be an array`);
      (Array.isArray(r[key])?r[key]:[]).forEach((m,j)=>{
        if(!m||typeof m!=='object'){errors.push(`${p}.${key}[${j}] must be an object`);return;}
        add(!!dateRange(m.date),`${p}.${key}[${j}] invalid date`);
        add(Number.isInteger(m.source)&&m.source>=0&&m.source<sources.length,`${p}.${key}[${j}] needs valid source index`);
        add(typeof m.label==='string'&&m.label.trim().length>0,`${p}.${key}[${j}] needs label`);
        if(key==='milestones'){add(Object.hasOwn(DATE_TYPES,m.kind),`${p}.${key}[${j}] invalid kind`);add(typeof m.projected==='boolean',`${p}.${key}[${j}] projected must be boolean`);if(['consultation','expected_publication'].includes(m.kind))add(m.projected===true,`${p}.${key}[${j}] plan must be marked projected`);}
      });
    }
  });
  add(Array.isArray(data.comparisons),'comparisons must be an array');
  (Array.isArray(data.comparisons)?data.comparisons:[]).forEach((c,i)=>{
    if(!c||typeof c!=='object'){errors.push(`comparisons[${i}] must be an object`);return;}
    for(const key of ['topic','distinction','question'])add(typeof c[key]==='string'&&c[key].trim().length>0,`comparisons[${i}].${key} is required`);
    add(Array.isArray(c.records)&&c.records.length>=2&&c.records.every(id=>ids.has(id)),`comparisons[${i}] has invalid record links`);
  });
  return errors;
}
