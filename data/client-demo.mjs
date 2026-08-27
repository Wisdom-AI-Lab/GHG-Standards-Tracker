import {REPORTING_PERIODS} from './requirements.mjs';
// Public facts and illustrative scenario inputs are deliberately separate.
// No client confidential information, ownership inference or live service is used.
export const PUBLIC_SOURCE = {
  id: 'public-entities',
  title: 'PepsiCo 2025 filing · Exhibit 21',
  kind: 'Public source · selected facts',
  as_of: '2025-12-27',
  checked_on: '2026-08-27',
  url: 'https://www.sec.gov/Archives/edgar/data/77476/000007747626000007/pepsico202510-kexhibit21.htm',
  note: 'The exhibit lists subsidiaries and jurisdictions at the stated date. This selected extract does not establish direct ownership, ownership percentages, reporting lines, GHG control, listing status, thresholds or current applicability.'
};

export const PUBLIC_ENTITIES = [
  {id:'public-au', name:'PepsiCo Beverages Australia Pty Ltd', jurisdiction:'Australia', locator:'Exhibit 21, page 7'},
  {id:'public-sg', name:'PepsiCo International Pte Ltd.', jurisdiction:'Singapore', locator:'Exhibit 21, page 9'},
  {id:'public-uk', name:'PepsiCo Holdings', jurisdiction:'United Kingdom', locator:'Exhibit 21, page 9'},
  {id:'public-hk', name:'Asia Bottlers Limited', jurisdiction:'Hong Kong', locator:'Exhibit 21, page 1'},
  {id:'public-ie', name:'Baltray Finance Unlimited Company', jurisdiction:'Ireland', locator:'Exhibit 21, page 1'}
].map(entity=>({...entity, type:'entity', source:'public-entities', observed_on:'2025-12-27'}));

export const ILLUSTRATIVE_ENTITIES = [
  {id:'atlas', name:'Atlas Beverages Group', jurisdiction:'United Kingdom', type:'group', parent:null, member:true, ownership:100, financial_control:true, operational_control:true},
  {id:'atlas-au', name:'Atlas Pacific Beverages', jurisdiction:'Australia', type:'entity', parent:'atlas', member:true, ownership:100, financial_control:true, operational_control:true},
  {id:'atlas-sg', name:'Atlas Straits Trading', jurisdiction:'Singapore', type:'entity', parent:'atlas', member:true, ownership:60, financial_control:true, operational_control:false},
  {id:'atlas-uk', name:'Atlas UK Distribution', jurisdiction:'United Kingdom', type:'entity', parent:'atlas', member:true, ownership:80, financial_control:true, operational_control:true},
  {id:'atlas-site', name:'Pacific Bottling Facility', jurisdiction:'Australia', type:'facility', parent:'atlas-au', member:true, ownership:100, financial_control:true, operational_control:true},
  {id:'orchid', name:'Orchid Beverage Co.', jurisdiction:'Singapore', type:'entity', parent:'atlas', member:false, ownership:0, financial_control:false, operational_control:false}
];

ILLUSTRATIVE_ENTITIES.push(
  {id:'atlas-us',name:'Atlas Americas Holdings',jurisdiction:'United States',type:'entity',parent:'atlas',member:true,ownership:100,financial_control:true,operational_control:true},
  {id:'atlas-us-ops',name:'Atlas California Division',jurisdiction:'United States',type:'entity',parent:'atlas-us',member:true,ownership:100,financial_control:true,operational_control:true},
  {id:'atlas-mx',name:'Atlas Mexico Beverages',jurisdiction:'Mexico',type:'entity',parent:'atlas-us-ops',member:true,ownership:100,financial_control:true,operational_control:true},
  {id:'atlas-eu',name:'Atlas France Beverages',jurisdiction:'France',type:'entity',parent:'atlas-uk',member:true,ownership:100,financial_control:true,operational_control:true}
);
// All regulatory facts below are authored scenario assumptions, not public data.
// Financial totals are supplied consolidated figures, not computed from GHG boundaries.
for(const entity of ILLUSTRATIVE_ENTITIES){
  Object.assign(entity,{au_ch2m:false,au_ordinary_company:true,au_no_relief:true,sgx_mainboard:false,sgx_no_waiver:true,sti_at_2025_06_30:false});
  if(entity.id==='atlas-au'){
    entity.au_ch2m=true;
    entity.financials=Object.fromEntries(REPORTING_PERIODS.map(start=>[start,{revenue_maud:240,assets_maud:600,employees:200}]));
  }
  if(entity.id==='atlas-sg')Object.assign(entity,{sgx_mainboard:true,sti_at_2025_06_30:true});
  if(entity.id==='atlas-uk')Object.assign(entity,{sgx_mainboard:true,sti_at_2025_06_30:null});
  if(entity.id==='orchid')Object.assign(entity,{sgx_mainboard:true,sti_at_2025_06_30:false});
  Object.assign(entity,{us_formed:entity.jurisdiction==='United States',ca_business:false,insurance:false,mx_domestic:entity.jurisdiction==='Mexico',mx_issuer:false,mx_nonfinancial:true,eu_undertaking:entity.jurisdiction==='France'});
  if(['atlas-us','atlas-us-ops'].includes(entity.id))Object.assign(entity,{ca_business:true,ca_revenue_2025_musd:entity.id==='atlas-us'?1500:750,ca_parent_report_confirmed:null});
  if(entity.id==='atlas-mx')Object.assign(entity,{mx_issuer:true,mx_first_issb_year:2025,mx_relief_election:null});
  if(entity.id==='atlas-eu')Object.assign(entity,{eu_employees:1200,eu_turnover_meur:600,eu_national_scope_confirmed:null,eu_wave_confirmed:null,eu_no_exemption:null});
}

export const SCENARIOS = {
  baseline: {label:'Baseline', effective_on:null, note:'Illustrative baseline. No scenario overlay is applied.'},
  acquisition: {label:'Acquire Orchid', effective_on:'2027-01-01', note:'Illustrative 40% investment with financial control stipulated separately; operational control remains false. This is not a real transaction.'},
  divestment: {label:'Divest Pacific', effective_on:'2027-01-01', note:'Illustrative exit of Atlas Pacific and its facility from this group view. Removal from a group is not termination of the entity’s legal obligations.'},
  divest_mexico: {label:'Sell Mexico · retain supplier',effective_on:'2027-01-01',note:'Illustrative sale of Atlas Mexico with a continuing supply contract to Atlas Americas. Its own issuer status is unchanged; group inclusion becomes an external value-chain relationship. No accounting or emissions totals are calculated.'},
  regulation: {label:'Compare reporting phases', effective_on:null, note:'Compare the selected financial-year start with 1 January 2028 using the same source-checked requirements and illustrative facts. No legal threshold is invented or changed.'}
};

export const GUIDED_QUESTIONS = [
  {id:'packaging',question:'What PPWR and US packaging EPR checks are needed?',aliases:['Explain packaging requirements']},
  {id:'overlaps',question:'Where do CSRD, IFRS and packaging reporting overlap?',aliases:['Explain regulatory interoperability']},
  {id:'matrix', question:'Which jurisdictions and triggers apply?', aliases:['Show the applicability matrix','What applies?']},
  {id:'changes', question:'What changes in this scenario?', aliases:['Show the scenario changes','What changes after the acquisition?']},
  {id:'missing', question:'What information is missing?', aliases:['Which facts are missing?']},
  {id:'boundary', question:'What does a screening result mean?', aliases:['Can I rely on this as a compliance determination?']},
  {id:'ifrs', question:'When do the IFRS S2 amendments take effect?', aliases:['What is the IFRS S2 amendment effective date?']},
  {id:'adoption',question:'Does ISSB adoption apply to every subsidiary?',aliases:['Explain ISSB adoption']},
  {id:'california',question:'How do SB 253 and SB 261 affect Atlas?',aliases:['Explain California requirements']},
  {id:'mexico',question:'What does Mexico ISSB adoption mean for Atlas Mexico?',aliases:['Explain Mexico adoption']},
  {id:'materiality',question:'How does CSRD double materiality differ from IFRS?',aliases:['Compare materiality']},
  {id:'subentities',question:'What changes when Atlas Mexico becomes a supplier?',aliases:['Explain subsidiary and supplier roles']},
  {id:'suppliers',question:'What Scope 3 data should Atlas request from suppliers?',aliases:['Explain supplier data']}
];

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if(child && typeof child==='object' && !Object.isFrozen(child)) freeze(child);
}
for(const value of [PUBLIC_SOURCE,PUBLIC_ENTITIES,ILLUSTRATIVE_ENTITIES,SCENARIOS,GUIDED_QUESTIONS]) freeze(value);
