// Human-directed, tab-memory-only visual Unreal shelf and draft export queue.
// Never fetches, uploads, approves rights, or executes local Unreal commands.
import {CATALOG_BYTES,parseAssetCatalog,searchCatalog,catalogCounts,
  canPlanGlb,exportPlanningCommand} from './asset-catalog.js';
import {EXPORT_QUEUE_MAX,createExportQueue} from './export-queue.js';
import {loadPrivateThumbnailUrls,revokeThumbnailUrls} from './private-thumbnails.js';

export function mountPrivateAssetLibrary({onChooseGlb,onStatus}) {
  const $=id=>document.getElementById(id);
  let catalog=[],selected=null,thumbnails=new Map();
  const queue=new Set();
  const status=message=>onStatus?.(message);

  function updateThumbCount() {
    $('catalogThumbCount').textContent=thumbnails.size+' private thumbnails in this tab';
  }
  function reset() {
    selected=null;catalog=[];
    queue.clear();revokeThumbnailUrls(thumbnails);thumbnails=new Map();
    $('catalogWorkspace').hidden=true;
    $('catalogResults').replaceChildren();
    $('catalogDetail').hidden=true;
    $('queueReviewed').checked=false;
    $('queueDownload').disabled=true;
    updateThumbCount();
  }
  function renderQueue() {
    const list=$('queueList');list.replaceChildren();
    $('queueCount').textContent=queue.size+' / '+EXPORT_QUEUE_MAX;
    $('queueDownload').disabled=!queue.size||!$('queueReviewed').checked;
    if(!queue.size){
      const empty=document.createElement('p');
      empty.className='hint';empty.textContent='No queued assets yet.';
      list.append(empty);return;
    }
    const byId=new Map(catalog.map(x=>[x.id,x]));
    for(const id of queue) {
      const row=document.createElement('div');row.className='queueRow';
      const item=document.createElement('span');
      item.textContent=id+' · '+(byId.get(id)?.name||'Unknown');
      const remove=document.createElement('button');
      remove.type='button';remove.textContent='Remove';
      remove.setAttribute('aria-label','Remove '+id+' from export queue');
      remove.addEventListener('click',()=>{
        queue.delete(id);$('queueReviewed').checked=false;
        renderQueue();renderDetail();status(id+' removed. Re-review remaining queue.');
      });
      row.append(item,remove);list.append(row);
    }
  }
  function renderDetail() {
    $('catalogDetail').hidden=!selected;
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
    $('catalogQueueAdd').disabled=!canGlb||(!queue.has(selected.id)&&queue.size>=EXPORT_QUEUE_MAX);
    $('catalogQueueAdd').textContent=queue.has(selected.id)
      ? '− Remove from export planning queue'
      : '+ Add to export planning queue';
    $('catalogStatus').textContent=canGlb
      ? 'Potential local GLB export. Still untested, not licensed/qualified by PixelForge. Operator must bind the real source.'
      : 'Reference or alternative format: this category has no NATIVE_3D GLB export lane.';
  }
  function renderResults() {
    if(!catalog.length)return;
    const view=$('catalogView').value,grid=view==='gallery';
    const list=$('catalogResults');list.replaceChildren();
    list.className='catalogResults'+(grid?' assetGallery':'');
    const matches=searchCatalog(catalog,$('catalogSearch').value,
      $('catalogCategory').value,$('catalogLane').value);
    $('catalogMatches').textContent=matches.length+
      ' matched; showing first '+Math.min(matches.length,80)+'.';
    for(const asset of matches.slice(0,80)) {
      const button=document.createElement('button');
      button.type='button';
      button.className='catalogRow'+(selected?.id===asset.id?' selected':'');
      button.setAttribute('role','listitem');
      if(grid) {
        const preview=document.createElement('div');
        preview.className='assetPreview';
        if(thumbnails.has(asset.id)) {
          const image=document.createElement('img');
          image.src=thumbnails.get(asset.id);
          image.alt='Private thumbnail for '+asset.id;
          image.loading='lazy';
          preview.append(image);
        } else {
          const missing=document.createElement('span');
          missing.textContent=asset.category.slice(0,22);
          missing.className='assetNoPreview';preview.append(missing);
        }
        button.append(preview);
      }
      const name=document.createElement('strong');name.textContent=asset.name;
      const details=document.createElement('span');
      details.textContent=asset.id+' · '+asset.category+' · '+asset.lane+
        (queue.has(asset.id)?' · QUEUED':'');
      button.append(name,details);
      button.addEventListener('click',()=>{
        selected=asset;$('assetId').value=asset.id;
        renderResults();renderDetail();
        status('Selected '+asset.id+' from private catalog. GLB evidence and source rights remain separate.');
      });
      list.append(button);
    }
  }
  function install(records) {
    revokeThumbnailUrls(thumbnails);thumbnails=new Map();
    catalog=records;queue.clear();
    const counts=catalogCounts(records);
    $('catalogWorkspace').hidden=false;
    $('catalogCount').textContent=records.length+' private assets';
    $('catalogLanes').textContent='PORTABLE '+counts.PORTABLE+
      ' · BAKEABLE '+counts.BAKEABLE+' · REIMPLEMENT '+counts.REIMPLEMENT;
    $('catalogSearch').value='';$('catalogLane').value='all';
    $('catalogView').value='gallery';
    const category=$('catalogCategory');category.replaceChildren();
    const option=(name,label)=>{
      const el=document.createElement('option');el.value=name;el.textContent=label;category.append(el);
    };
    option('all','All categories');
    for(const name of [...new Set(records.map(a=>a.category))].sort())option(name,name);
    selected=null;$('queueReviewed').checked=false;
    updateThumbCount();renderQueue();renderResults();renderDetail();
  }
  $('catalogFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];e.target.value='';
    if(!file)return;
    try{
      if(file.size>CATALOG_BYTES||file.size<10)throw Error('Catalog JSON must be 10 bytes to 1 MB.');
      install(parseAssetCatalog(await file.text()));
      status('Loaded '+catalog.length+' private records in browser tab memory only.');
    }catch(error){reset();status('CATALOG REJECTED: '+error.message);}
  });
  $('catalogThumbFiles').addEventListener('change',async e=>{
    const files=Array.from(e.target.files||[]);e.target.value='';
    if(!files.length)return;
    try{
      if(!catalog.length)throw Error('Load a private catalog before thumbnails.');
      const next=await loadPrivateThumbnailUrls(files,new Set(catalog.map(a=>a.id)));
      revokeThumbnailUrls(thumbnails);thumbnails=next;
      updateThumbCount();renderResults();
      status('Loaded '+thumbnails.size+' local thumbnail previews. Images remain browser-only.');
    }catch(error){status('THUMBNAILS REJECTED: '+error.message);}
  });
  $('catalogClearThumbs').addEventListener('click',()=>{
    revokeThumbnailUrls(thumbnails);thumbnails=new Map();
    updateThumbCount();renderResults();
    status('Private thumbnail previews cleared from this tab.');
  });
  for(const id of ['catalogSearch','catalogCategory','catalogLane','catalogView']){
    $(id).addEventListener(id==='catalogSearch'?'input':'change',renderResults);
  }
  $('catalogUse').addEventListener('click',()=>{
    if(!canPlanGlb(selected))return;
    $('assetId').value=selected.id;
    status('Selected '+selected.id+'. Choose the exact local GLB (and handoff if available).');
    onChooseGlb();
  });
  $('catalogPlan').addEventListener('click',async()=>{
    if(!canPlanGlb(selected))return;
    const command=exportPlanningCommand(selected);
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable.');
      await navigator.clipboard.writeText(command);
      status('Copied local export plan for '+selected.id+'. Unreal was NOT executed.');
    }catch{
      status('COPY UNAVAILABLE. Run locally: '+command);
    }
  });
  $('catalogQueueAdd').addEventListener('click',()=>{
    if(!canPlanGlb(selected))return;
    const id=selected.id;
    if(queue.has(id))queue.delete(id);
    else if(queue.size<EXPORT_QUEUE_MAX)queue.add(id);
    else{status('Export queue capped at '+EXPORT_QUEUE_MAX+'.');return;}
    $('queueReviewed').checked=false;
    renderQueue();renderDetail();renderResults();
    status(id+' queue updated. Review the complete queue before downloading.');
  });
  $('queueReviewed').addEventListener('change',renderQueue);
  $('queueDownload').addEventListener('click',()=>{
    if(!$('queueReviewed').checked){status('Operator must review the draft queue first.');return;}
    try {
      const draft=createExportQueue([...queue],catalog);
      const blob=new Blob([JSON.stringify(draft,null,2)+'\n'],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;
      a.download='pixelforge-unreal-export-queue.v1.json';
      document.body.append(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),3000);
      status('Downloaded REVIEWED DRAFT: '+queue.size+
        ' IDs. No Unreal jobs ran; local CLI requires independent operator confirmation.');
    }catch(error){status('QUEUE REJECTED: '+error.message);}
  });
  window.addEventListener('pagehide',()=>revokeThumbnailUrls(thumbnails),{once:true});
  reset();
}
