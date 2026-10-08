import {newWorld,parseWorld,validateWorld,addObject,editObject,removeObject,renameWorld,MAX_OBJECTS} from './world.js';
import {createRenderer} from './renderer.js';

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
function redraw() {
  $('worldTitle').value=world.title;
  $('count').textContent=world.objects.length+' / '+MAX_OBJECTS;
  const list=$('objects');list.replaceChildren();
  for(const o of world.objects) {
    const button=document.createElement('button');
    button.type='button';button.className=o.id===selected?'selected':'';
    const name=document.createElement('strong');name.textContent=o.name;
    const kind=document.createElement('span');kind.textContent=o.kind==='asset-proxy'?'GLB PROXY':o.kind.toUpperCase();
    button.append(name,kind);
    button.addEventListener('click',()=>{selected=o.id;redraw();});
    list.append(button);
  }
  const o=current();
  $('nothing').hidden=!!o;$('fields').hidden=!o;
  if(!o)return;
  $('selectedId').textContent=o.id;
  $('assetBadge').textContent=o.kind==='asset-proxy'?'UNQUALIFIED GLB PROXY':o.kind.toUpperCase();
  $('name').value=o.name;$('color').value=o.color;$('yaw').value=o.yaw;
  document.querySelectorAll('[data-vector]').forEach(input=>{
    input.value=o[input.dataset.vector][Number(input.dataset.axis)];
  });
  const facts=$('assetFacts');
  facts.hidden=!o.asset;
  facts.textContent=o.asset?o.asset.asset_id+' | '+o.asset.source_name+' | SHA-256 '+o.asset.sha256+
    ' | '+o.asset.byte_length+' bytes | Source file is NOT embedded. Mesh import and rights qualification pending.':'';
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
    const next=addObject(world,'asset-proxy',asset);
    selected=next.objects.at(-1).id;
    change(next,'GLB identity staged as a PROXY. Mesh, license and VR use remain unqualified.');
  }catch(error){status('ASSET REJECTED: '+error.message);}
});
try{
  renderer=createRenderer($('stage'),()=>world,()=>selected,()=>{
    $('enterVR').disabled=false;$('exitVR').disabled=true;
    status('WebXR session ended. Desktop editor restored.');
  });
  status('Desktop 3D editor ready. World preview only; use inspector to select geometry.');
}catch(error){status('WebGL2 unavailable: '+error.message);}
let dragging=false,lastX=0,lastY=0;
$('stage').addEventListener('pointerdown',event=>{
  dragging=true;lastX=event.clientX;lastY=event.clientY;
  $('stage').setPointerCapture(event.pointerId);
});
$('stage').addEventListener('pointerup',()=>dragging=false);
$('stage').addEventListener('pointercancel',()=>dragging=false);
$('stage').addEventListener('pointermove',event=>{
  if(!dragging||!renderer)return;
  renderer.camera.yaw+=(event.clientX-lastX)*.007;
  renderer.camera.pitch=Math.max(-1.25,Math.min(1.25,renderer.camera.pitch+(event.clientY-lastY)*.007));
  lastX=event.clientX;lastY=event.clientY;
});
$('stage').addEventListener('wheel',event=>{
  if(!renderer)return;
  event.preventDefault();
  renderer.camera.distance=Math.max(2,Math.min(95,renderer.camera.distance*Math.exp(event.deltaY*.001)));
},{passive:false});
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
