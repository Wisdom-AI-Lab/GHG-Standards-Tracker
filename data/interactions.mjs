// Editorial relationship map. Alignment and shared data never imply legal equivalence.
export const PACKAGING_RECORD_IDS=Object.freeze(['eu-ppwr','us-epr-ca','us-epr-or','us-epr-co','us-epr-me','us-epr-mn','us-epr-md','us-epr-wa']);
export const MAP_SOURCE_IDS=Object.freeze(['eu-csrd',...PACKAGING_RECORD_IDS].map(id=>'record:'+id));
export const MAP_NODES=Object.freeze([
 {id:'accounting',label:'GHG accounting',record:'joint-corporate-standard',x:420,y:40},
 {id:'issb',label:'IFRS / ISSB',record:'ifrs-s2-ghg-amendments',x:140,y:200},
 {id:'csrd',label:'CSRD / ESRS',record:'eu-csrd',x:420,y:200},
 {id:'nature',label:'TNFD',record:'tnfd-recommendations',x:700,y:200},
 {id:'ca253',label:'California SB 253',record:'ca-sb253',x:140,y:360},
 {id:'ppwr',label:'EU PPWR',record:'eu-ppwr',x:420,y:360},
 {id:'epr',label:'US state packaging EPR',record:null,x:700,y:360},
 {id:'ca261',label:'California SB 261',record:'ca-sb261',x:140,y:520},
 {id:'targets',label:'SBTi targets',record:'sbti-net-zero-v2',x:420,y:520},
 {id:'cbam',label:'EU CBAM',record:'eu-cbam-definitive',x:700,y:520}
]);
const guidance={title:'ESRS–ISSB interoperability guidance (May 2024)',publisher:'IFRS Foundation / European Commission / EFRAG',url:'https://www.ifrs.org/content/dam/ifrs/supporting-implementation/issb-standards/esrs-issb-standards-interoperability-guidance.pdf',locator:'Introduction and sections 1–4; predates later amendments'};
export const INTERACTIONS=Object.freeze([
 {id:'esrs-issb',from:'issb',to:'csrd',type:'guidance',label:'Climate disclosure alignment',records:['ifrs-s2-ghg-amendments','eu-csrd'],shared:'Climate governance, risks, strategy, metrics and financial-materiality evidence can be mapped between reporting frameworks.',separate:'ESRS adds impact materiality. Check both versions, additional disclosures, boundaries, periods and assurance; the 2024 guidance is not a blanket equivalence decision.',action:'Build a disclosure crosswalk with one evidence ID for each reused fact and a separate completion check for each reporting basis.',sources:[guidance]},
 {id:'inventory-disclosure',from:'accounting',to:'issb',type:'method',label:'Inventory methods → disclosures',records:['joint-corporate-standard','scope-2-revision','ifrs-s2-ghg-amendments'],shared:'Inventory activity data, emissions factors and calculation evidence may support climate disclosures.',separate:'The proposed joint standard is not already the required method. Apply the measurement basis referenced by the operative disclosure standard.',action:'Version accounting policies separately from disclosure requirements; assess changes before replacing an approved method.'},
 {id:'ca-emissions',from:'accounting',to:'ca253',type:'method',label:'GHG methods and SB 253',records:['joint-corporate-standard','ca-sb253'],shared:'Corporate GHG information can support the California emissions workflow after boundary and methodology reconciliation.',separate:'A future GHG/ISO revision does not automatically amend SB 253. Statutory thresholds, assurance and operative CARB deadlines remain separate.',action:'Reconcile entity scope and reporting period, then verify the current CARB rule and required inventory method.'},
 {id:'ca-risk',from:'issb',to:'ca261',type:'conditional',label:'Conditional equivalent-report route',records:['ifrs-s2-ghg-amendments','ca-sb261'],shared:'A qualifying equivalent climate-risk report may be relevant to the statutory route in HSC 38533(b)(3).',separate:'An ISSB label alone does not satisfy every condition. The recorded SB 261 injunction is a separate enforcement issue.',action:'Have the reviewer check the precise equivalent-report conditions and current enforcement status before relying on an existing report.'},
 {id:'packaging-disclosure',from:'csrd',to:'ppwr',type:'data',label:'Resource-use and packaging evidence',records:['eu-csrd','eu-ppwr'],shared:'Packaging composition, recycled content, waste and reuse records can inform a material resource-use disclosure.',separate:'Corporate disclosures do not replace product conformity, labelling or national producer registration. Being outside CSRD does not exempt a business from PPWR.',action:'Keep a product compliance file alongside the corporate reporting crosswalk; confirm materiality and operative ESRS version.'},
 {id:'packaging-markets',from:'ppwr',to:'epr',type:'data',label:'Packaging data across markets',records:PACKAGING_RECORD_IDS,shared:'A packaging bill of materials and destination ledger can support EU and US state workflows.',separate:'Producer hierarchy, covered materials, exclusions, reporting categories, fee schedules and dates differ by market. No mutual recognition is established.',action:'Allocate material weights to each destination and responsible producer; check all seven state records individually.'},
 {id:'nature-materiality',from:'nature',to:'csrd',type:'data',label:'Nature assessment inputs',records:['tnfd-recommendations','eu-csrd'],shared:'Location-specific dependency, impact and risk assessments may support material nature disclosures.',separate:'TNFD is not a universal mandate or proof of ESRS compliance. Apply the required materiality process and reporting standard.',action:'Reuse supported location evidence, then document which required disclosures and materiality tests it addresses.'},
 {id:'target-accounting',from:'accounting',to:'targets',type:'data',label:'Inventory and target baselines',records:['scope-2-revision','sbti-net-zero-v2'],shared:'Inventory boundaries, base-year data and reductions inform target preparation and tracking.',separate:'Inventory conformity is not target validation. Proposed accounting or target rules must not be treated as final programme requirements.',action:'Check base-year recalculation and programme recognition before changing target progress calculations.'},
 {id:'goods-emissions',from:'accounting',to:'cbam',type:'data',label:'Corporate and goods-level data',records:['joint-corporate-standard','eu-cbam-definitive'],shared:'Process and energy data may be useful inputs for both corporate inventories and embedded-emissions calculations.',separate:'Corporate totals do not replace goods-specific methods, import records or CBAM scope tests.',action:'Maintain goods, process and import identifiers with a separately validated embedded-emissions calculation.'}
]);
export const RELATION_TYPES=Object.freeze({guidance:'Published alignment guidance',method:'Measurement relationship',conditional:'Conditional statutory route',data:'Editorial data-reuse mapping'});
export function validateInteractions(data){
 if(!Array.isArray(data?.records))return ['Interaction records unavailable'];
 const errors=[],nodes=new Set(MAP_NODES.map(n=>n.id)),records=new Set(data.records.map(r=>r.id)),ids=new Set();
 for(const n of MAP_NODES)if(n.record&&!records.has(n.record))errors.push('Unknown map record: '+n.record);
 for(const edge of INTERACTIONS){
  if(ids.has(edge.id)||!nodes.has(edge.from)||!nodes.has(edge.to)||!RELATION_TYPES[edge.type])errors.push('Invalid interaction: '+edge.id);ids.add(edge.id);
  if(!edge.records.length||edge.records.some(id=>!records.has(id)))errors.push('Missing interaction evidence: '+edge.id);
 }
 return errors;
}
