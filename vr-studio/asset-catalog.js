// PixelForge v5.41: private, in-memory catalog reader for owned Unreal assets.
// No network, localStorage, DOM, filesystem authority or automatic rights approval.
export const CATALOG_LIMIT=1000;
export const CATALOG_BYTES=1048576;
const CATEGORY_PORTABLE=new Set([
  'Environment','Audio / Music','Character / NPC','Vehicle / Machinery',
  'Props / Furniture','Weapon Pack','Materials / Textures',
  'Creature / Animal','UI / Media','Animation','Bundle'
]);
const CATEGORY_BAKEABLE=new Set(['VFX']);
const CATEGORY_REIMPLEMENT=new Set([
  'Gameplay System / Plugin','Editor / Production Tool','Template / Sample','Tutorial / Training'
]);
const categories=new Set([...CATEGORY_PORTABLE,...CATEGORY_BAKEABLE,...CATEGORY_REIMPLEMENT]);
const text=(x,limit)=>typeof x==='string'?x.slice(0,limit).trim():'';
const maybeNumber=x=>Number.isSafeInteger(x)?x:null;
const tagList=x=>Array.isArray(x)?x.filter(v=>typeof v==='string').slice(0,20).map(v=>v.slice(0,75)):[];

export function laneFor(category) {
  if(CATEGORY_PORTABLE.has(category))return 'PORTABLE';
  if(CATEGORY_BAKEABLE.has(category))return 'BAKEABLE';
  return 'REIMPLEMENT';
}
export function canPlanGlb(asset) {
  if(!asset||asset.lane!=='PORTABLE')return false;
  return !['Audio / Music','UI / Media','Materials / Textures','Animation'].includes(asset.category);
}
export function parseAssetCatalog(raw) {
  if(typeof raw!=='string'||raw.length>CATALOG_BYTES)throw Error('Catalog exceeds 1 MB intake limit.');
  const value=JSON.parse(raw);
  const source=Array.isArray(value)?value:
    value?.schema==='pixelforge.external-asset-registry.v1'&&Array.isArray(value.passports)
      ? value.passports:null;
  if(!source||source.length<1||source.length>CATALOG_LIMIT)
    throw Error('Expected a governed records array or v5.28 registry (1-1000 assets).');
  const seen=new Set();
  const result=source.map(entry=>{
    if(!entry||typeof entry!=='object'||Array.isArray(entry))
      throw Error('Invalid catalog entry.');
    const id=entry.record_id;
    const name=text(entry.asset_name,140),category=text(entry.primary_category,85);
    if(typeof id!=='string'||!/^ASSET-[0-9]{6}$/.test(id)||
       !name||!category||!categories.has(category))
      throw Error('Invalid governed catalog ID, name, or category.');
    if(seen.has(id))throw Error('Duplicate governed catalog ID: '+id);
    seen.add(id);
    // Derive lane from category; never trust a user-provided "approved" boolean.
    const lane=laneFor(category);
    return Object.freeze({
      id,name,category,lane,
      publisher:text(entry.publisher,100)||'Unknown publisher',
      style:text(entry.style,100),
      tags:tagList(entry.tags),
      projectMatches:tagList(entry.project_matches),
      priority:maybeNumber(entry.suggested_priority),
      licenseStatus:text(entry.license_status,120)||'Unknown',
      installStatus:text(entry.install_status,120)||'Not audited',
      auditStatus:text(entry.audit_status,120)||'Not reviewed',
      compatibility:text(entry.compatibility_state,50)||'UNTESTED',
      verdict:text(entry.lane_verdict,50)||'UNDECIDED',
      // A boolean claimed by the incoming catalog does NOT authorize rendering
      // or any transfer. Actual local GLB files are still operator-selected.
      qualifiedForUse:false,
      hasWorldGlbCandidate:lane==='PORTABLE' &&
        !['Audio / Music','UI / Media','Materials / Textures','Animation'].includes(category)
    });
  });
  return Object.freeze(result.sort((a,b)=>a.id.localeCompare(b.id)));
}
export function searchCatalog(items,query='',category='all',lane='all') {
  const q=String(query).trim().toLowerCase().slice(0,160);
  if(!['all','PORTABLE','BAKEABLE','REIMPLEMENT'].includes(lane))
    throw Error('Invalid lane filter.');
  if(category!=='all'&&!categories.has(category))
    throw Error('Invalid category filter.');
  return items.filter(asset=>{
    if(lane!=='all'&&asset.lane!==lane)return false;
    if(category!=='all'&&asset.category!==category)return false;
    return !q||[asset.id,asset.name,asset.category,asset.publisher,asset.style,
      ...asset.tags,...asset.projectMatches].join(' ').toLowerCase().includes(q);
  });
}
export function catalogCounts(items) {
  return items.reduce((acc,asset)=>{acc[asset.lane]++;return acc;},
    {PORTABLE:0,BAKEABLE:0,REIMPLEMENT:0});
}
export function exportPlanningCommand(asset,sourceFile='local-assets/source/ue_asset_arsenal_263.records.json') {
  if(!canPlanGlb(asset))throw Error('This asset category has no direct NATIVE_3D export lane.');
  if(!/^ASSET-[0-9]{6}$/.test(asset.id))throw Error('Invalid asset identity.');
  if(sourceFile!=='local-assets/source/ue_asset_arsenal_263.records.json')
    throw Error('Source catalog path must be local-only.');
  return 'npm run asset:external -- '+sourceFile+' --record '+asset.id+' --mode NATIVE_3D --format GLB';
}
