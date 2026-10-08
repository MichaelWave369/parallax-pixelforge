// Human-directed UI for a private, in-memory Unreal asset shelf.
// Does not fetch, upload, persist, approve or execute anything from the catalog.
import {CATALOG_BYTES,parseAssetCatalog,searchCatalog,catalogCounts,
  canPlanGlb,exportPlanningCommand} from './asset-catalog.js';

export function mountPrivateAssetLibrary({onChooseGlb,onStatus}) {
  const $=id=>document.getElementById(id);
  let catalog=[],selected=null;
  const status=message=>onStatus?.(message);
  function reset() {
    selected=null;
    $('catalogWorkspace').hidden=true;
    $('catalogResults').replaceChildren();
    $('catalogDetail').hidden=true;
  }
  function renderDetail() {
    const card=$('catalogDetail');
    card.hidden=!selected;
    if(!selected)return;
    $('catalogSelectedName').textContent=selected.id+' · '+selected.name;
    $('catalogSelectedFacts').textContent=[
      selected.category,selected.publisher,selected.style,
      'Route: '+selected.lane,'License: '+selected.licenseStatus,
      'Install: '+selected.installStatus,'Audit: '+selected.auditStatus,
      'Compatibility: '+selected.compatibility,
      'Lane verdict: '+selected.verdict
    ].filter(Boolean).join(' | ');
    const canGlb=canPlanGlb(selected);
    $('catalogUse').disabled=!canGlb;
    $('catalogPlan').disabled=!canGlb;
    $('catalogStatus').textContent=canGlb
      ? 'Candidate for local GLB export. Not yet verified or approved. Choose a real GLB exported from this specific catalog item.'
      : 'Reference/bake route: this category has no direct NATIVE_3D GLB binding in PixelForge.';
  }
  function renderResults() {
    if(!catalog.length)return;
    const list=$('catalogResults');list.replaceChildren();
    const filtered=searchCatalog(catalog,$('catalogSearch').value,
      $('catalogCategory').value,$('catalogLane').value);
    $('catalogMatches').textContent=filtered.length+' matched; showing first '+Math.min(filtered.length,80)+'.';
    for(const asset of filtered.slice(0,80)) {
      const button=document.createElement('button');
      button.type='button';
      button.className='catalogRow'+(selected?.id===asset.id?' selected':'');
      button.setAttribute('role','listitem');
      const name=document.createElement('strong');
      name.textContent=asset.name;
      const details=document.createElement('span');
      details.textContent=asset.id+' · '+asset.category+' · '+asset.lane;
      button.append(name,details);
      button.addEventListener('click',()=>{
        selected=asset;
        $('assetId').value=asset.id;
        renderResults();
        renderDetail();
        status('Selected '+asset.id+' from private catalog. Local GLB binding required.');
      });
      list.append(button);
    }
  }
  function install(records) {
    const counts=catalogCounts(records);
    catalog=records;
    $('catalogWorkspace').hidden=false;
    $('catalogCount').textContent=records.length+' private assets';
    $('catalogLanes').textContent='PORTABLE '+counts.PORTABLE+' · BAKEABLE '+counts.BAKEABLE+
      ' · REIMPLEMENT '+counts.REIMPLEMENT;
    $('catalogSearch').value='';
    $('catalogLane').value='all';
    const category=$('catalogCategory');category.replaceChildren();
    const option=(name,label)=>{
      const el=document.createElement('option');
      el.value=name;el.textContent=label;category.append(el);
    };
    option('all','All categories');
    for(const name of [...new Set(records.map(a=>a.category))].sort())option(name,name);
    selected=null;renderResults();renderDetail();
  }
  $('catalogFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    try{
      if(file.size>CATALOG_BYTES||file.size<10)throw Error('Catalog JSON must be 10 bytes to 1 MB.');
      const records=parseAssetCatalog(await file.text());
      install(records);
      status('Loaded '+records.length+' governed catalog entries in this browser tab only. Files and rights remain local.');
    }catch(error){reset();status('CATALOG REJECTED: '+error.message);}
  });
  for(const id of ['catalogSearch','catalogCategory','catalogLane']){
    $(id).addEventListener(id==='catalogSearch'?'input':'change',renderResults);
  }
  $('catalogUse').addEventListener('click',()=>{
    if(!canPlanGlb(selected))return;
    $('assetId').value=selected.id;
    status('Asset '+selected.id+' chosen. Select the exact local GLB exported from this asset.');
    onChooseGlb();
  });
  $('catalogPlan').addEventListener('click',async()=>{
    if(!canPlanGlb(selected))return;
    const command=exportPlanningCommand(selected);
    try{
      if(!navigator.clipboard?.writeText)throw Error('Browser clipboard unavailable.');
      await navigator.clipboard.writeText(command);
      status('Copied local PixelForge export plan command for '+selected.id+'. This does NOT execute Unreal.');
    }catch{
      // Never claim clipboard success; show a selectable string on failure.
      status('COPY UNAVAILABLE. Run locally: '+command);
    }
  });
  reset();
}
