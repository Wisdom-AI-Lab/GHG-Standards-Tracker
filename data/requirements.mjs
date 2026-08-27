// Bounded checks of official sources on 27 August 2026; human legal review pending.
// These are selected reporting routes, not a comprehensive jurisdiction ruleset.
import {EXTENDED_SOURCES,EXTENDED_REQUIREMENTS} from './extended-requirements.mjs';
export const RULESET_VERSION = 'source-check-2026-08-27-expanded';
export const REPORTING_PERIODS = ['2025-01-01','2026-01-01','2026-07-01','2027-07-01','2028-01-01'];
export const REGULATORY_SOURCES = [
  {id:'asic-scope',title:'ASIC · reporting scope',kind:'Official regulator · source checked',checked_on:'2026-08-27',review:'source_checked',url:'https://www.asic.gov.au/regulatory-resources/sustainability-reporting/for-preparers-of-sustainability-reports/who-must-prepare-a-sustainability-report',locator:'Who must prepare a sustainability report?',text:'Chapter 2M annual financial-report obligations are a prerequisite. Corporate size, NGER and specified asset-value routes are distinct. This demo screens the corporate-size route only; failure of that route does not exclude another reporting obligation.'},
  {id:'asic-rg280',title:'ASIC RG 280 · size and commencement',kind:'Official regulator · source checked',checked_on:'2026-08-27',review:'source_checked',url:'https://download.asic.gov.au/media/j4rhwyiz/rg280-published-31-march-2025.pdf',locator:'Table 2, page 13; RG 280.34, page 14; RG 280.5, page 5',text:'The corporate-size route tests at least two of revenue, consolidated gross assets and employees. Phase thresholds use AUD and the financial-year commencement date. Reporting status crystallises at year end. AASB S2 draws on IFRS S2 and climate-relevant IFRS S1 provisions. The fixture supplies illustrative consolidated amounts; it does not calculate statutory consolidation or apply relief.'},
  {id:'sgx-711b',title:'SGX Mainboard · Rule 711B',kind:'Exchange rule · source checked',checked_on:'2026-08-27',review:'source_checked',url:'https://rulebook.sgx.com/rulebook/711b',locator:'Rule 711B(1)(aa) and (4)',text:'The climate-disclosure component must follow Practice Note 7.6. The demo assumes Mainboard rule coverage explicitly; it does not infer this from a generic listed flag or incorporation in Singapore.'},
  {id:'sgx-pn76',title:'SGX Mainboard · climate reporting phases',kind:'Exchange requirements · source checked',checked_on:'2026-08-27',review:'source_checked',url:'https://rulebook.sgx.com/rulebook/practice-note-76-sustainability-reporting-guide',locator:'Paragraphs 4.12(a), 4.12(b)(i), 4.12(c), 4.13–4.14; version from 1 January 2026',text:'Scope 1/2 disclosures start with financial years commencing in 2025. The STI-at-30-June-2025 route adds IFRS S2 climate disclosures excluding Scope 3 from FYC 2025, then Scope 3 from FYC 2026; later index exit does not remove that historical trigger. Climate-relevant IFRS S1 provisions also apply. Non-STI routes, new listings, Catalist, waivers and assurance are outside these selected checks. These local requirements are not a statement of full IFRS S1/S2 compliance.'}
];
export const REAL_REQUIREMENTS = [
  {id:'AU-SIZE',jurisdiction:'Australia',title:'Corporations Act · corporate-size reporting route',standard:'AASB S2 · based on IFRS S2',trigger:'Ch 2M + 2 of 3 size criteria',sources:['asic-scope','asic-rg280'],locator:'Corporations Act ss292A, 1707B; RG 280 Table 2',kind:'au_size',phases:[
    {start:'2025-01-01',label:'Group 1 phase',revenue:500,assets:1000,employees:500},
    {start:'2026-07-01',label:'Group 2 phase',revenue:200,assets:500,employees:250},
    {start:'2027-07-01',label:'Group 3 phase',revenue:50,assets:25,employees:100}
  ]},
  {id:'SGX-S12',jurisdiction:'Singapore',title:'Mainboard · Scope 1 and 2 disclosure',standard:'IFRS S2 29(a) through SGX requirements',trigger:'Mainboard rule coverage + FYC 2025',sources:['sgx-711b','sgx-pn76'],locator:'PN 7.6 4.12(a)',kind:'sgx',start:'2025-01-01',sti:false},
  {id:'SGX-STI-CLIMATE',jurisdiction:'Singapore',title:'Mainboard · STI climate-disclosure route',standard:'IFRS S2 excluding Scope 3; climate-relevant S1',trigger:'Mainboard + STI on 30 Jun 2025 + FYC 2025',sources:['sgx-711b','sgx-pn76'],locator:'PN 7.6 4.12(b)(i), 4.13',kind:'sgx',start:'2025-01-01',sti:true},
  {id:'SGX-STI-S3',jurisdiction:'Singapore',title:'Mainboard · STI Scope 3 route',standard:'IFRS S2 Scope 3 through SGX requirements',trigger:'Mainboard + STI on 30 Jun 2025 + FYC 2026',sources:['sgx-711b','sgx-pn76'],locator:'PN 7.6 4.12(c)',kind:'sgx',start:'2026-01-01',sti:true}
];
REGULATORY_SOURCES.push(...EXTENDED_SOURCES);
REAL_REQUIREMENTS.push(...EXTENDED_REQUIREMENTS);
function freeze(value){Object.freeze(value);for(const v of Object.values(value))if(v&&typeof v==='object'&&!Object.isFrozen(v))freeze(v);}
for(const value of [REPORTING_PERIODS,REGULATORY_SOURCES,REAL_REQUIREMENTS])freeze(value);
