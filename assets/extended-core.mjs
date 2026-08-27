import {MATERIALITY_CASES,SUPPLIER,EVIDENCE_MODES} from '../data/extended-requirements.mjs';

const fact=(label,actual,expected=true)=>({label,actual,pass:actual==null?null:actual===expected});
const over=(label,actual,limit)=>({label,actual,pass:typeof actual==='number'&&Number.isFinite(actual)&&actual>=0?actual>limit:null});
const scope=trace=>trace.some(t=>t.pass===false)?'no_match':trace.some(t=>t.pass===null)?'unknown':'match';
export function evaluateExtended(entity,rule,snap){
  let trace=[],status,scopeStatus,phase='',period=snap.reportingStart,missing=[],limits='',note='';
  if(['ca253','ca261'].includes(rule.kind)){
    const amount=rule.kind==='ca253'?1000:500;
    trace=[fact('Business formed under US law',entity.us_formed),fact('Doing business in California (explicit fictional nexus)',entity.ca_business),over(`FY 2025 total annual revenue > USD ${amount}m`,entity.ca_revenue_2025_musd,amount)];
    if(rule.kind==='ca261')trace.push(fact('Not an excluded insurance entity',entity.insurance,false));
    scopeStatus=scope(trace);status=scopeStatus;
    period='2026 initial cycle · FY 2025 revenue';
    phase=rule.kind==='ca253'?'Statutory Scope 1/2: 2026; Scope 3: 2027 onward':'Statutory biennial risk report · enforcement overlay';
    limits='Initial-cycle statutory scope only. The FY selector does not roll this California revenue fixture forward. Final definitions, filing arrangements, assurance and deadlines need review. Global-parent revenue and GHG boundary choices are not substituted for entity revenue.';
    if(scopeStatus==='match'){
      status=rule.kind==='ca253'?'implementation':'paused';
      missing.push(rule.kind==='ca253'?'Verify final CARB/OAL rule and operative first deadline':'Recheck injunction and enforcement status before any filing decision');
      if(entity.ca_parent_report_confirmed!==true)missing.push('Confirm whether a qualifying parent report actually covers this legal entity');
    }
    note=rule.kind==='ca253'?'A statutory scope match does not settle the current deadline. CARB proposed 10 November 2026 after withdrawing its initial submission; final approval was not established.':'A statutory scope match remains visible, but CARB currently describes reporting as voluntary while enforcement is enjoined. No overdue filing is asserted.';
  }else if(rule.kind==='mx'){
    trace=[fact('Domestic Mexican entity',entity.mx_domestic),fact('Covered CNBV securities issuer',entity.mx_issuer),fact('Nonfinancial issuer (not an excluded public entity)',entity.mx_nonfinancial)];
    scopeStatus=scope(trace);status=scopeStatus;
    if(entity.mx_domestic===true&&entity.mx_nonfinancial===false)status='not_covered';
    else if(scopeStatus==='match'&&snap.reportingStart<rule.start)status='not_due';
    phase='FY 2025 onward · first reports in 2026';
    if(status==='match'&&entity.mx_relief_election==null)missing.push('Confirm first-application relief elections, comparatives, Scope 3 timing and assurance for the selected year');
    limits='Domestic nonfinancial issuer route only. Financial institutions, public issuers, private-company NIS and foreign-issuer provisions require separate research. Relief affects disclosure content/timing, not this base issuer-scope screen.';
    note='Mexican incorporation alone does not trigger this route. A sale or a foreign parent’s ISSB report does not automatically remove the issuer’s own obligation.';
  }else if(rule.kind==='eu'){
    const gates=[fact('EU undertaking (fictional France entity)',entity.eu_undertaking),over('Average employees > 1,000 (fictional selected-year input)',entity.eu_employees,1000),over('Annual net turnover > EUR 450m (fictional selected-year input)',entity.eu_turnover_meur,450)];
    trace=[...gates];scopeStatus=scope(gates);status=scopeStatus;
    if(scopeStatus==='match'){
      trace.push(fact('National implementation and entity scope verified',entity.eu_national_scope_confirmed),fact('Reporting wave and financial year verified',entity.eu_wave_confirmed),fact('No applicable subsidiary exemption verified',entity.eu_no_exemption));
      // This bounded pack cannot issue a country-law conclusion even if a user supplies flags.
      status='unknown';missing.push('Reviewed national implementation, reporting wave and subsidiary-exemption analysis');
    }
    phase='Revised EU scope gate · not a French-law filing determination';
    limits='The EU-level threshold gate is not a complete applicability test. No country transposition or two-year qualification test is implemented. The non-EU parent route is separate and not assessed. Revised ESRS adoption and operative application are separate status checks.';
    note='Matching the revised EU thresholds does not establish a present subsidiary filing duty. Double materiality governs content after scope and applicable ESRS version are established.';
  }else throw new Error('Unsupported extended requirement');
  if(status!=='no_match')missing.push(...trace.filter(t=>t.pass===null).map(t=>t.label));
  return {trace,status,scopeStatus,phase,period,missing:[...new Set(missing)],limits,note};
}

export function assessMateriality(state){
  const item=MATERIALITY_CASES[state.materialityCase]||MATERIALITY_CASES.water;
  const level=state.materialityLevel==='group'?'group':'entity',facts=item[level];
  const combined=facts.financial===true||facts.impact===true?true:facts.financial===null||facts.impact===null?null:false;
  const describe=value=>value===true?'Material in the stipulated assessment':value===false?'No material signal stipulated · reassessment may be needed':'Assessment missing';
  return {topic:item.topic,level,financial:facts.financial,impact:facts.impact,ifrs:describe(facts.financial),esrs:describe(combined),combined,missing:[...item.missing],note:'These are fictional human-assessment inputs, not automatic materiality judgements. A local impact is not erased by a small share of group revenue. Reassess the reporting entity, evidence and time horizons; IFRS can capture impacts that create financial risks.',citations:['fictional-facts','issb-principles','interoperability','eu-esrs-status']};
}
export function supplierRows(state,snap,isMember){
  const mx=snap.entities.find(e=>e.id==='atlas-mx'),inside=isMember(mx,snap.entities);
  const mode=Object.hasOwn(EVIDENCE_MODES,state.supplierEvidence)?state.supplierEvidence:'missing';
  const evidence=mode==='primary'?'Fictional supplier sample available; allocation, boundary and assurance unverified':mode==='secondary'?'Fictional secondary-data method proposed; no emissions number calculated':'No activity or emissions data provided';
  const missing=mode==='primary'?['Validate reporting period and allocation to Atlas','Confirm method, completeness and assurance status']:mode==='secondary'?['Select documented factor, geography and vintage','Obtain activity data and disclose uncertainty']:['Activity quantity and units','Reporting period and emission-factor provenance','Organisational boundary, allocation and data quality'];
  return [
    {id:'lumen',name:SUPPLIER.name,buyer:'Atlas Americas Holdings',relationship:'Independent supplier · outside ownership graph',role:'Potential purchased-goods Scope 3 input',request:SUPPLIER.product,direct:'No supplier filing duty inferred. Its own regulatory status is not researched.',evidence,missing:[...missing],cap:'180 employees is a fictional fact, not proof of a legal protection. Check operative EU value-chain cap, protected status and permitted request content.',citations:['fictional-facts','ca-253','interoperability','eu-esrs-status']},
    {id:'atlas-mx',name:mx.name,buyer:'Atlas Americas Holdings',relationship:inside?'Controlled subsidiary · inside reporting group':'Divested entity · continuing independent supply contract',role:inside?'Group operations data; do not automatically count intra-group purchases again as Scope 3':'Potential purchased-goods Scope 3 input after sale; assess contract, boundary and transaction period',request:inside?'Operational emissions and material risk/impact information':'Purchased beverages · candidate Scope 3 category 1',direct:'CNBV issuer scope remains independently screened before and after sale.',evidence,missing:[...missing,'Confirm transaction-date allocation and reporting perimeter'],cap:'Do not infer supplier protections or disclosure exemptions from divestment alone.',citations:['fictional-facts','mx-issb','ca-253','interoperability']}
  ];
}
export const TOPIC_SOURCES={adoption:['issb-principles','mx-issb','asic-rg280','sgx-pn76','eu-scope'],california:['ca-253','ca-rulemaking','ca-261','ca-261-status'],mexico:['mx-issb'],materiality:['issb-principles','interoperability','eu-esrs-status'],subentities:['mx-issb','ca-253','interoperability','eu-esrs-status'],suppliers:['ca-253','mx-issb','interoperability','eu-esrs-status']};
export const TOPIC_TEXT={
  adoption:'A standard is not a jurisdictional mandate. Test the local instrument, entity type, listing, size, financial year and relief separately. Australia and SGX use selected local routes; Mexico’s issuer route is different. A parent may need subsidiary information even where the subsidiary has no separate local filing duty. Local filing, group inclusion and supplier requests are three distinct decisions.',
  california:'Atlas Americas has fictional FY 2025 revenue of USD 1,500m and California business activity; California Distribution has USD 750m. Their statutory screens therefore differ. The results below separate scope from SB 253 implementation uncertainty and the SB 261 injunction. A qualifying parent report may cover a subsidiary, but inclusion and equivalence must be demonstrated. This is the fixed 2026 initial cycle, not a rolling deadline calendar.',
  mexico:'Atlas Mexico is explicitly assumed to be a domestic nonfinancial CNBV securities issuer. The selected IFRS S1/S2 route starts in FY 2025; first-application relief elections and assurance need review. A private Mexican supplier is not made a covered issuer merely by its country or customer. Selling Atlas Mexico changes its group relationship, not its stipulated issuer status.',
  materiality:'The same fictional issue is assessed through two lenses below. IFRS uses financial materiality; ESRS uses impact OR financial materiality. These are assessment inputs, not a legal decision or an instruction to omit disclosure. Scope, reporting perimeter and operative standards must be resolved first.',
  subentities:'Use “Sell Mexico · retain supplier” and compare dates before and after 1 January 2027. Atlas Mexico leaves the ownership group but retains its issuer scope; the continuing supply contract creates a potential value-chain data relationship. Its own emissions do not become its own Scope 3 merely because Atlas sold it. Only the buyer’s classification may change.',
  suppliers:'A reporting company’s Scope 3 duty can create a data request to a supplier without making that supplier a statutory filer. Request relevant activity, period, method, boundary and allocation evidence. Missing primary data may require a supported estimate and uncertainty disclosure; it is not zero emissions. Scope 3 timing, transition relief and EU request limits need review. No request is sent by this demo.'
};
