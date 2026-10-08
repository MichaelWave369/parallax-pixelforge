import {newWorld,parseWorld,validateWorld,addObject,editObject,removeObject,renameWorld,editWorldLighting,replaceWorldLighting,MAX_OBJECTS} from './world.js';
import {DEFAULT_LIGHTING,resolvedLighting,lightingPreset,matchingLightingPreset} from './world-lighting.js';
import {createRenderer} from './renderer.js';
import {decodeGlbMesh} from './glb-mesh.js';
import {gizmoHandles,findGizmoHandle,pickWorldObject,draggedAxisPosition,AXES} from './viewport-tools.js';
import {rotationRing,findRotationRing,draggedYaw,scaleHandles,findScaleHandle,draggedScale,steppedScale} from './transform-tools.js';

const $ = id => document.getElementById(id);
const STORAGE = 'pixelforge.vr-world.v1.local';
let world = newWorld();
let selected = 'obj-2';
const undo = [];
let renderer = null;
const status = msg => { $('status').textContent = msg; };

try {
  const raw=localStorage.getItem(STORAGE);
  if(raw) world=parseWorld(raw);
} catch(error) {
  status('Saved scene unavailable: '+error.message);
}
if(!world.objects.some(o=>o.id===selected))selected=world.objects[0]?.id||null;

function change(next, message) {
  validateWorld(next);
  undo.push(JSON.stringify(world));
  if(undo.length>30)undo.shift();
  world=next;
  if(!world.objects.some(o=>o.id===selected))selected=world.objects.at(-1)?.id||null;
  redraw();
  status(message);
}
function current(){return world.objects.find(o=>o.id===selected)||null;}
// All lighting display values are read from validated world state, including legacy scenes.
function updateLightingControls(){
  const light=resolvedLighting(world);
  $('lightingPreset').value=matchingLightingPreset(light);
  for(const input of document.querySelectorAll('[data-lighting]')){
    const key=input.dataset.lighting;
    input.value=light[key];
  }
  for(const output of document.querySelectorAll('[data-lighting-output]')){
    const key=output.dataset.lightingOutput;
    const value=light[key];
    output.textContent=key==='fogDensity'?value.toFixed(3)
      : key==='sunAzimuth'||key==='sunElevation'?value+'°':value.toFixed(2);
  }
}
function redraw() {
  $('worldTitle').value=world.title;
  $('count').textContent=world.objects.length+' / '+MAX_OBJECTS;
  updateLightingControls();
  const list=$('objects');list.replaceChildren();
  for(const o of world.objects) {
    const button=document.createElement('button');
    button.type='button';button.className=o.id===selected?'selected':'';
    const name=document.createElement('strong');name.textContent=o.name;
    const kind=document.createElement('span');
    kind.textContent=o.kind==='asset-proxy'
      ? (renderer?.hasMesh(o.asset.sha256)?'GLB GEOMETRY':'GLB SOURCE NEEDED')
      : o.kind.toUpperCase();
    button.append(name,kind);
    button.addEventListener('click',()=>{selected=o.id;redraw();});
    list.append(button);
  }
  const o=current();
  $('nothing').hidden=!!o;$('fields').hidden=!o;
  if(!o){drawGizmo();return;}
  $('selectedId').textContent=o.id;
  $('assetBadge').textContent=o.kind==='asset-proxy'
    ? (renderer?.hasMesh(o.asset.sha256)?'STATIC MESH PREVIEW':'GLB SOURCE MISSING')
    : o.kind.toUpperCase();
  $('rebindHolder').hidden=o.kind!=='asset-proxy';
  $('name').value=o.name;$('color').value=o.color;$('yaw').value=o.yaw;
  document.querySelectorAll('[data-vector]').forEach(input=>{
    input.value=o[input.dataset.vector][Number(input.dataset.axis)];
  });
  const facts=$('assetFacts');
  facts.hidden=!o.asset;
  facts.textContent=o.asset?o.asset.asset_id+' | '+o.asset.source_name+' | SHA-256 '+o.asset.sha256+
    ' | '+o.asset.byte_length+' bytes | '+(renderer?.hasMesh(o.asset.sha256)
      ? 'Static GLB geometry shown; basic embedded texture preview where supported. PBR/physics/rights qualification pending.'
      : 'Rebind the identical local GLB to display its mesh.'):'';
  drawGizmo();
}
function safe(action) {
  try{action();}catch(error){status('REJECTED: '+error.message);}
}
$('add').addEventListener('click',()=>safe(()=>{
  const next=addObject(world,$('shape').value);
  selected=next.objects.at(-1).id;change(next,'Shape added to world.');
}));
$('remove').addEventListener('click',()=>safe(()=>{
  if(!selected)return;
  change(removeObject(world,selected),'Object removed.');
}));
$('name').addEventListener('change',event=>safe(()=>{
  if(current())change(editObject(world,selected,{name:event.target.value}),'Object name updated.');
}));
$('color').addEventListener('change',event=>safe(()=>{
  if(current())change(editObject(world,selected,{color:event.target.value}),'Object color updated.');
}));
$('yaw').addEventListener('change',event=>safe(()=>{
  if(!current())return;
  const n=Number(event.target.value);
  change(editObject(world,selected,{yaw:n}),'Rotation updated.');
}));
for(const field of document.querySelectorAll('[data-vector]')) {
  field.addEventListener('change',()=>safe(()=>{
    const o=current();if(!o)return;
    const k=field.dataset.vector,index=Number(field.dataset.axis);
    if(!field.value.trim())throw new Error('Coordinate required.');
    const next=[...o[k]];next[index]=Number(field.value);
    change(editObject(world,selected,{[k]:next}),'Transform updated.');
  }));
}
$('worldTitle').addEventListener('change',event=>safe(()=>{
  change(renameWorld(world,event.target.value),'World renamed.');
}));
for(const field of document.querySelectorAll('[data-lighting]')){
  field.addEventListener('change',()=>safe(()=>{
    const key=field.dataset.lighting;
    const value=field.type==='color'?field.value:Number(field.value);
    const next=editWorldLighting(world,{[key]:value});
    change(next,'Updated world lighting: '+key+'.');
  }));
}
$('lightingPreset').addEventListener('change',event=>safe(()=>{
  if(event.target.value==='custom')return;
  const preset=event.target.value;
  change(replaceWorldLighting(world,lightingPreset(preset)),
    'Applied '+preset+' atmosphere preset.');
}));
$('resetLighting').addEventListener('click',()=>safe(()=>{
  change(replaceWorldLighting(world,{...DEFAULT_LIGHTING}),
    'Restored neutral world lighting.');
}));
$('undo').addEventListener('click',()=>safe(()=>{
  const old=undo.pop();if(!old)throw new Error('Nothing to undo.');
  world=parseWorld(old);
  if(!current())selected=world.objects.at(-1)?.id||null;
  redraw();status('Undo restored previous scene.');
}));
$('reset').addEventListener('click',()=>{
  if(!confirm('Reset the active VR world? You can undo once.'))return;
  const next=newWorld();selected='obj-2';change(next,'Fresh starter world created.');
});
$('save').addEventListener('click',()=>safe(()=>{
  localStorage.setItem(STORAGE,JSON.stringify(validateWorld(world)));
  status('Saved scene to this browser only.');
}));
function download(name,raw) {
  const blob=new Blob([raw],{type:'application/json'});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
$('export').addEventListener('click',()=>safe(()=>{
  download('pixelforge-vr-world.v1.json',JSON.stringify(validateWorld(world),null,2)+'\n');
  status('Portable scene JSON exported. No assets or executable content included.');
}));
$('import').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  try {
    if(file.size>200000)throw new Error('Scene JSON exceeds 200 KB.');
    const next=parseWorld(await file.text());
    selected=next.objects.at(-1)?.id||null;
    change(next,'Validated portable world imported.');
  }catch(error){status('IMPORT REJECTED: '+error.message);}
});
function validateGlbHeader(buffer) {
  if(buffer.byteLength<28)throw new Error('Truncated GLB file.');
  const dv=new DataView(buffer);
  if(dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2 ||
     dv.getUint32(8,true)!==buffer.byteLength)throw new Error('Invalid GLB v2 container.');
  const jsonLen=dv.getUint32(12,true);
  if(dv.getUint32(16,true)!==0x4e4f534a || jsonLen<2 || jsonLen>buffer.byteLength-20)
    throw new Error('Missing or invalid GLB JSON chunk.');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLen)).trim());
  if(json.asset?.version!=='2.0'||!Array.isArray(json.meshes)||!json.meshes.length)
    throw new Error('GLB has no declared 2.0 mesh.');
}
$('glbFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  try {
    const assetId=$('assetId').value.trim();
    if(!/^ASSET-[0-9]{6}$/.test(assetId))throw new Error('Provide a governed ASSET-000000 identifier.');
    if(!/^[\w.\- ]{1,120}\.glb$/i.test(file.name))throw new Error('Only simple-named .glb files are accepted.');
    if(file.size>50000000||file.size<28)throw new Error('GLB staging range is 28 bytes to 50 MB.');
    if(!crypto.subtle)throw new Error('SHA-256 requires localhost or a secure browser origin.');
    const buffer=await file.arrayBuffer();
    validateGlbHeader(buffer);
    const digest=await crypto.subtle.digest('SHA-256',buffer);
    const sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    const asset={asset_id:assetId,source_name:file.name,byte_length:file.size,sha256};
    // Validate scene capacity first; no world mutation on import rejection.
    const next=addObject(world,'asset-proxy',asset);
    if(!renderer)throw new Error('WebGL2 renderer unavailable.');
    const decoded=decodeGlbMesh(buffer);
    const report=await renderer.registerMesh(sha256,decoded);
    selected=next.objects.at(-1).id;
    change(next,'GLB geometry placed: '+report.meshCount+' primitives / '+report.vertexCount+' vertices / '+report.textureCount+' embedded textures. '+ 
      'Local preview only; rights, PBR, collision, performance and VR remain unqualified.'+
      (report.warnings.length?' Warnings: '+report.warnings.join(', '):''));
  }catch(error){status('ASSET REJECTED: '+error.message);}
});
// Rebind a scene's hash-bound GLB after a page reload or JSON import.
// Never substitute a same-named or modified file for a saved world asset.
$('rebindFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  const selectedAsset=current()?.asset;
  if(!file||!selectedAsset)return;
  try{
    if(!renderer)throw new Error('WebGL2 renderer unavailable.');
    if(file.name!==selectedAsset.source_name||file.size!==selectedAsset.byte_length||
       file.size>50000000||file.size<28)
      throw new Error('Selected file name/size differs from saved asset identity.');
    const bytes=await file.arrayBuffer();
    const digest=await crypto.subtle.digest('SHA-256',bytes);
    const sha256=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(sha256!==selectedAsset.sha256)throw new Error('SHA-256 mismatch: cannot silently replace scene asset.');
    const report=await renderer.registerMesh(sha256,decodeGlbMesh(bytes));
    redraw();
    status('Exact GLB rebound and rendered: '+report.vertexCount+' vertices / '+report.textureCount+' embedded textures. '+
      'Static preview only; no rights/physics/headset qualification.'+
      (report.warnings.length?' Warnings: '+report.warnings.join(', '):''));
  }catch(error){status('GLB REBIND REJECTED: '+error.message);}
});

try{
  renderer=createRenderer($('stage'),()=>world,()=>selected,()=>{
    $('enterVR').disabled=false;$('exitVR').disabled=true;
    status('WebXR session ended. Desktop editor restored.');
  });
  status('Desktop 3D editor ready. World preview only; use inspector to select geometry.');
}catch(error){status('WebGL2 unavailable: '+error.message);}
// Desktop viewport controls; no authority or executable scene changes.
const stage=$('stage'),overlay=$('moveGizmo');
const axisColor={x:'#ff747b',y:'#65e5a5',z:'#7baeff'};
const svgNS='http://www.w3.org/2000/svg';
let toolMode='move',gesture=null;
function svgNode(tag,props) {
  const el=document.createElementNS(svgNS,tag);
  for(const [key,value] of Object.entries(props))el.setAttribute(key,String(value));
  return el;
}
function drawGizmo() {
  overlay.replaceChildren();
  if(!renderer||!current())return;
  const width=stage.clientWidth,height=stage.clientHeight;
  if(width<1||height<1)return;
  overlay.setAttribute('viewBox','0 0 '+width+' '+height);
  const pos=current().position;
  if(toolMode==='rotate'){
    const ring=rotationRing(renderer.camera,pos,width,height);
    if(!ring)return;
    const d=ring.points.map((p,i)=>
      (i?'L ':'M ')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
    overlay.append(svgNode('path',{d,fill:'none',stroke:'#ffbc77','stroke-width':4}));
    overlay.append(svgNode('circle',{cx:ring.center.x,cy:ring.center.y,
      r:5,fill:'#ffd5a8',stroke:'#142637','stroke-width':2}));
    const label=svgNode('text',{x:ring.center.x+12,y:ring.center.y-10,fill:'#ffcb8b'});
    label.textContent='Y ROTATE';overlay.append(label);
    return;
  }
  const handles=toolMode==='scale'
    ?scaleHandles(renderer.camera,pos,width,height)
    :gizmoHandles(renderer.camera,pos,width,height);
  if(!handles)return;
  for(const h of handles){
    const c=axisColor[h.axis];
    overlay.append(svgNode('line',{x1:h.from.x,y1:h.from.y,
      x2:h.to.x,y2:h.to.y,stroke:c,'stroke-width':4}));
    if(toolMode==='scale'){
      overlay.append(svgNode('rect',{x:h.to.x-6,y:h.to.y-6,width:12,height:12,
        rx:2,fill:c,stroke:'#d8f8ef','stroke-width':1.5}));
    }else{
      overlay.append(svgNode('circle',{cx:h.to.x,cy:h.to.y,r:7,
        fill:c,stroke:'#d8f8ef','stroke-width':1.5}));
    }
    const t=svgNode('text',{x:h.to.x+10,y:h.to.y-9,fill:c});
    t.textContent=h.axis.toUpperCase();overlay.append(t);
  }
  const center=handles[0].from;
  if(toolMode==='scale'){
    overlay.append(svgNode('path',{
      d:'M '+center.x+' '+(center.y-10)+' L '+(center.x+10)+' '+center.y+
        ' L '+center.x+' '+(center.y+10)+' L '+(center.x-10)+' '+center.y+' Z',
      class:'scale-diamond'
    }));
  }else{
    overlay.append(svgNode('circle',{cx:center.x,cy:center.y,r:4,
      fill:'#f7fafc',stroke:'#122337','stroke-width':1.6}));
  }
}
function pointerLocal(e) {
  const r=stage.getBoundingClientRect();
  return {x:e.clientX-r.left,y:e.clientY-r.top};
}
function setTool(next) {
  if(!['move','rotate','scale'].includes(next))return;
  if(gesture)return; // Switching tools mid-drag must never corrupt undo history.
  toolMode=next;
  for(const button of document.querySelectorAll('[data-tool]'))
    button.setAttribute('aria-pressed',String(button.dataset.tool===next));
  $('moveControls').hidden=next!=='move';
  $('rotateControls').hidden=next!=='rotate';
  $('scaleControls').hidden=next!=='scale';
  drawGizmo();
  status('Tool: '+next.toUpperCase()+'. Select an object to edit; all modifications remain local and validated.');
}
for(const button of document.querySelectorAll('[data-tool]'))
  button.addEventListener('click',()=>setTool(button.dataset.tool));
stage.addEventListener('pointerdown',e=>{
  if(e.button!==0||!renderer)return;
  const {x,y}=pointerLocal(e);
  const obj=current(),width=stage.clientWidth,height=stage.clientHeight;
  let handle=null,mode=null;
  if(obj&&toolMode==='move'){
    const handles=gizmoHandles(renderer.camera,obj.position,width,height);
    handle=findGizmoHandle(handles,x,y);
    if(handle)mode='move';
  }else if(obj&&toolMode==='scale'){
    const handles=scaleHandles(renderer.camera,obj.position,width,height);
    handle=findScaleHandle(handles,x,y);
    if(handle)mode='scale';
  }else if(obj&&toolMode==='rotate'){
    const ring=rotationRing(renderer.camera,obj.position,width,height);
    if(findRotationRing(ring,x,y)){handle={axis:'y'};mode='rotate';}
  }
  if(mode){
    gesture={pointerId:e.pointerId,mode,handle,id:obj.id,
      startX:x,startY:y,lastX:x,lastY:y,
      startWorld:world,startPosition:[...obj.position],
      startScale:[...obj.scale],startYaw:obj.yaw};
  }else{
    const id=pickWorldObject(world,renderer.camera,x,y,width,height,
      sha=>renderer.getMeshBounds(sha));
    if(id){selected=id;redraw();}
    gesture={pointerId:e.pointerId,mode:id?'select':'orbit',
      startX:x,startY:y,lastX:x,lastY:y};
  }
  stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove',e=>{
  if(!gesture||gesture.pointerId!==e.pointerId||!renderer)return;
  const {x,y}=pointerLocal(e);
  if(['move','scale','rotate'].includes(gesture.mode)){
    try{
      let patch,fields;
      if(gesture.mode==='move'){
        patch={position:draggedAxisPosition(gesture.startPosition,gesture.handle,
          x-gesture.startX,y-gesture.startY,Number($('moveSnap').value))};
        fields='position';
      }else if(gesture.mode==='scale'){
        patch={scale:draggedScale(gesture.startScale,gesture.handle,
          x-gesture.startX,y-gesture.startY,Number($('scaleSnap').value))};
        fields='scale';
      }else{
        patch={yaw:draggedYaw(gesture.startYaw,x-gesture.startX,
          Number($('angleSnap').value))};
      }
      world=editObject(gesture.startWorld,gesture.id,patch);
      const obj=current();
      if(obj?.id===gesture.id){
        if(fields)document.querySelectorAll('[data-vector="'+fields+'"]').forEach(input=>{
          input.value=obj[fields][Number(input.dataset.axis)];
        });
        else $('yaw').value=obj.yaw;
      }
      drawGizmo();
    }catch(error){status('TRANSFORM REJECTED: '+error.message);}
    return;
  }
  if(gesture.mode==='select'&&Math.hypot(x-gesture.startX,y-gesture.startY)>5)
    gesture.mode='orbit';
  if(gesture.mode==='orbit'){
    renderer.camera.yaw+=(x-gesture.lastX)*.007;
    renderer.camera.pitch=Math.max(-1.25,Math.min(1.25,
      renderer.camera.pitch+(y-gesture.lastY)*.007));
    drawGizmo();
  }
  gesture.lastX=x;gesture.lastY=y;
});
function finishGesture(e,cancel=false){
  if(!gesture||gesture.pointerId!==e.pointerId)return;
  const active=gesture;gesture=null;
  if(['move','scale','rotate'].includes(active.mode)){
    const candidate=world;
    world=active.startWorld;
    const after=candidate.objects.find(o=>o.id===active.id);
    const changed=after&&(active.mode==='rotate'
      ? after.yaw!==active.startYaw
      : (active.mode==='scale'?after.scale.some((v,i)=>v!==active.startScale[i])
        : after.position.some((v,i)=>v!==active.startPosition[i])));
    if(!cancel&&changed){
      change(candidate,'Applied '+active.mode+' to '+active.id+
        '; one undo step saved.');
    }else redraw();
  }
  if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);
}
stage.addEventListener('pointerup',e=>finishGesture(e));
stage.addEventListener('pointercancel',e=>finishGesture(e,true));
stage.addEventListener('wheel',e=>{
  if(!renderer)return;
  e.preventDefault();
  renderer.camera.distance=Math.max(2,Math.min(95,
    renderer.camera.distance*Math.exp(e.deltaY*.001)));
  drawGizmo();
},{passive:false});
if(typeof ResizeObserver!=='undefined')new ResizeObserver(drawGizmo).observe(stage);
for(const button of document.querySelectorAll('[data-nudge]')){
  button.addEventListener('click',()=>safe(()=>{
    const obj=current();
    if(!obj)throw Error('Select an object first.');
    const [axis,direction]=button.dataset.nudge.split(':');
    const idx=AXES.indexOf(axis);
    const step=Number($('moveSnap').value);
    if(idx<0||!Number.isFinite(step)||step<=0)throw Error('Invalid nudge settings.');
    const pos=[...obj.position];
    pos[idx]=Math.max(-100,Math.min(100,Math.round((pos[idx]+Number(direction)*step)*1000)/1000));
    change(editObject(world,obj.id,{position:pos}),'Nudged '+obj.name+' on '+axis.toUpperCase()+'.');
  }));
}
for(const button of document.querySelectorAll('[data-rotate]')){
  button.addEventListener('click',()=>safe(()=>{
    const obj=current();
    if(!obj)throw Error('Select an object first.');
    const delta=Number(button.dataset.rotate)*Number($('angleSnap').value);
    change(editObject(world,obj.id,{yaw:Math.max(-360,Math.min(360,obj.yaw+delta))}),
      'Rotated '+obj.name+' around Y.');
  }));
}
for(const button of document.querySelectorAll('[data-resize]')){
  button.addEventListener('click',()=>safe(()=>{
    const obj=current();
    if(!obj)throw Error('Select an object first.');
    const [axis,dir]=button.dataset.resize.split(':');
    const scale=steppedScale(obj.scale,axis,Number(dir),Number($('scaleSnap').value));
    change(editObject(world,obj.id,{scale}),'Scaled '+obj.name+' ('+axis+').');
  }));
}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&gesture){
    finishGesture({pointerId:gesture.pointerId},true);
    status('Transform cancelled; original world restored.');
    return;
  }
  if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.repeat)return;
  if(/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName||''))return;
  const next={w:'move',e:'rotate',r:'scale'}[e.key.toLowerCase()];
  if(next){e.preventDefault();setTool(next);}
});
async function detectVR(){
  const button=$('enterVR');
  if(!renderer || !navigator.xr){button.textContent='VR Unavailable';return;}
  try {
    if(await navigator.xr.isSessionSupported('immersive-vr')) {
      button.disabled=false;button.textContent='Enter Experimental VR';
    } else button.textContent='VR Unsupported Here';
  }catch {button.textContent='VR Unsupported Here';}
}
$('enterVR').addEventListener('click',async()=>{
  if(!renderer)return;
  try{
    await renderer.enterVR();
    $('enterVR').disabled=true;$('exitVR').disabled=false;
    status('Experimental WebXR session entered. No controller interactions or comfort qualification.');
  }catch(error){status('VR ENTRY FAILED: '+error.message);}
});
$('exitVR').addEventListener('click',async()=>{
  try{
    await renderer?.exitVR();
    $('enterVR').disabled=false;$('exitVR').disabled=true;
    status('Returned to desktop world editor.');
  }catch(error){status('VR EXIT FAILED: '+error.message);}
});
redraw();
void detectVR();
