import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {validateDataset} from '../assets/core.mjs';
import {validateDemo} from '../assets/demo-core.mjs';

const root=new URL('../',import.meta.url);
const data=JSON.parse(await readFile(new URL('data/records.json',root),'utf8'));
const errors=[...validateDataset(data),...validateDemo()];
const html=await readFile(new URL('index.html',root),'utf8');
for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  const ref=match[1];if(/^(?:https?:|data:|#)/.test(ref))continue;
  try{await readFile(new URL(ref,root));}catch{errors.push(`Missing local asset: ${ref}`);}
}
for(const name of ['index.html','assets/app.mjs','assets/core.mjs','assets/styles.css','assets/demo.css','assets/demo-core.mjs','assets/demo-views.mjs','data/client-demo.mjs','data/requirements.mjs','data/records.json']){
  const source=await readFile(new URL(name,root),'utf8');
  if(/supabase\.co|ghg\.justinzeh\.com|data\/data\.json/.test(source))errors.push(`${name}: inherited runtime dependency`);
  if(name.endsWith('.mjs'))for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
    try{await readFile(new URL(match[1],new URL(name,root)));}catch{errors.push(`Missing module import in ${name}: ${match[1]}`);}
  }
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else console.log(`Validated ${data.records.length} records and local website assets in ${fileURLToPath(root)}`);
