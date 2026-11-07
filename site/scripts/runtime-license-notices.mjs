import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {RUNTIME_PACKAGES,NOTICES_FORMAT,validateBundledNotices} from '../src/license-notices.js';

const site=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repository=path.resolve(site,'..');
function packagePath(name){
  return path.join(site,'node_modules',...name.split('/'));
}
async function licenseFrom(folder){
  const names=await readdir(folder);
  const file=names.find(f=>/^LICEN[CS]E(?:\.(?:md|txt))?$/i.test(f));
  if(!file)throw Error('License text missing from: '+folder);
  const license=await readFile(path.join(folder,file),'utf8');
  if(license.trim().length<300)throw Error('Incomplete license text in: '+folder);
  return license;
}
export async function collectRuntimeNotices(){
  const packages=[];
  for(const spec of RUNTIME_PACKAGES){
    const folder=spec.name==='PixelForge'?repository:packagePath(spec.name);
    if(spec.name!=='PixelForge'){
      const pkg=JSON.parse(await readFile(path.join(folder,'package.json'),'utf8'));
      if(pkg.name!==spec.name||pkg.version!==spec.version||pkg.license!==spec.license)
        throw Error('Unexpected runtime dependency metadata: '+spec.name);
    }
    const text=await licenseFrom(folder);
    packages.push({...spec,text});
  }
  return validateBundledNotices({format:NOTICES_FORMAT,packages});
}
