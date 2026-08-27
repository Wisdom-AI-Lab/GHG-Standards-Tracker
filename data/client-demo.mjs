// Public facts and fictional scenario inputs are deliberately separate.
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

export const FICTIONAL_ENTITIES = [
  {id:'atlas', name:'Atlas Beverages Group', jurisdiction:'United Kingdom', type:'group', parent:null, member:true, ownership:100, financial_control:true, operational_control:true, revenue_musd:900, listed:true, uk_nexus:true},
  {id:'atlas-au', name:'Atlas Pacific Beverages', jurisdiction:'Australia', type:'entity', parent:'atlas', member:true, ownership:100, financial_control:true, operational_control:true, revenue_musd:180, listed:false, uk_nexus:false},
  {id:'atlas-sg', name:'Atlas Straits Trading', jurisdiction:'Singapore', type:'entity', parent:'atlas', member:true, ownership:60, financial_control:true, operational_control:false, revenue_musd:40, listed:true, uk_nexus:true},
  {id:'atlas-uk', name:'Atlas UK Distribution', jurisdiction:'United Kingdom', type:'entity', parent:'atlas', member:true, ownership:80, financial_control:true, operational_control:true, revenue_musd:null, listed:null, uk_nexus:true},
  {id:'atlas-site', name:'Pacific Bottling Facility', jurisdiction:'Australia', type:'facility', parent:'atlas-au', member:true, ownership:100, financial_control:true, operational_control:true, revenue_musd:null, listed:null, uk_nexus:false},
  {id:'orchid', name:'Orchid Beverage Co.', jurisdiction:'Singapore', type:'entity', parent:'atlas', member:false, ownership:0, financial_control:false, operational_control:false, revenue_musd:140, listed:false, uk_nexus:true}
];

export const SCENARIOS = {
  baseline: {label:'Baseline', effective_on:null, note:'Fictional baseline. No scenario overlay is applied.'},
  acquisition: {label:'Acquire Orchid', effective_on:'2027-01-01', note:'Fictional 40% investment with financial control stipulated separately; operational control remains false. This is not a real transaction.'},
  divestment: {label:'Divest Pacific', effective_on:'2027-01-01', note:'Fictional exit of Atlas Pacific and its facility from this group view. Removal from a group is not termination of the entity’s legal obligations.'},
  regulation: {label:'Change demo rule', effective_on:'2027-01-01', note:'Fictional AU-01 threshold rises from USD 100m to USD 200m. This is an invented rule change, not Australian law.'}
};

export const DEMO_RULES = [
  {id:'DEMO-AU-01', jurisdiction:'Australia', title:'Illustrative large-entity disclosure rule', trigger:'INCORPORATION + SIZE', standard:'IFRS S2 reference (illustrative)', conditions:[{field:'jurisdiction',op:'eq',value:'Australia',label:'Incorporated in Australia'},{field:'revenue_musd',op:'gte',value:100,label:'Revenue ≥ USD 100m (invented threshold)'}]},
  {id:'DEMO-SG-01', jurisdiction:'Singapore', title:'Illustrative listed-entity disclosure rule', trigger:'INCORPORATION + LISTING', standard:'IFRS S1 / S2 reference (illustrative)', conditions:[{field:'jurisdiction',op:'eq',value:'Singapore',label:'Incorporated in Singapore'},{field:'listed',op:'eq',value:true,label:'Listed status is true (fictional input)'}]},
  {id:'DEMO-UK-01', jurisdiction:'United Kingdom', title:'Illustrative economic-nexus disclosure rule', trigger:'ECONOMIC NEXUS + SIZE', standard:'IFRS S2 reference (illustrative)', conditions:[{field:'uk_nexus',op:'eq',value:true,label:'UK economic nexus (fictional input)'},{field:'revenue_musd',op:'gte',value:100,label:'Revenue ≥ USD 100m (invented threshold)'}]}
];

export const GUIDED_QUESTIONS = [
  {id:'matrix', question:'Which jurisdictions and triggers apply?', aliases:['Show the applicability matrix','What applies?']},
  {id:'changes', question:'What changes in this scenario?', aliases:['Show the scenario changes','What changes after the acquisition?']},
  {id:'missing', question:'What information is missing?', aliases:['Which facts are missing?']},
  {id:'boundary', question:'Can the public entity list establish the reporting boundary?', aliases:['Does the subsidiary list prove ownership or control?']},
  {id:'ifrs', question:'When do the IFRS S2 amendments take effect?', aliases:['What is the IFRS S2 amendment effective date?']}
];

function freeze(value) {
  Object.freeze(value);
  for (const child of Object.values(value)) if(child && typeof child==='object' && !Object.isFrozen(child)) freeze(child);
}
for(const value of [PUBLIC_SOURCE,PUBLIC_ENTITIES,FICTIONAL_ENTITIES,SCENARIOS,DEMO_RULES,GUIDED_QUESTIONS]) freeze(value);
