import {
  SCHEMA, KINDS, EFFECTS, MOTIONS,
  createScene, makeLayer, normalizeScene, normalizeLayer, renderScene, isSafeAsset
} from './engine.js';

const $ = id => document.getElementById(id);
const canvas = $('sceneCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const KEY = 'pixelforge.layer-scene.v1.local';
let scene = createScene();
let selectedId = scene.layers[3].id;
let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let solo = false;
let spread = 0;
let elapsed = 0;
let lastFrame = null;
let previousDraw = 0;
let toastTimer;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function flash(message) {
  const node = $('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2800);
}
function layer() {
  return scene.layers.find(l => l.id === selectedId) || scene.layers[0];
}
function fillSelect(id, values) {
  $(id).replaceChildren();
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value.replace(/(^|\s)\w/g, c => c.toUpperCase());
    $(id).append(option);
  }
}
fillSelect('layerKind', KINDS);
fillSelect('motionType', MOTIONS);
fillSelect('overlayType', EFFECTS);

function renderLayerList() {
  const list = $('layerList');
  list.replaceChildren();
  // Visual timeline is nearest first; engine draw order remains back-to-front.
  for (let i = scene.layers.length - 1; i >= 0; i--) {
    const item = scene.layers[i], selected = item.id === selectedId;
    const row = document.createElement('div');
    row.className = 'layer-item' + (selected ? ' active' : '');
    const glyph = document.createElement('span');
    glyph.className = 'layer-icon';
    glyph.textContent = String(i+1).padStart(2,'0');
    const choose = document.createElement('button');
    choose.type = 'button';
    choose.className = 'layer-select';
    choose.setAttribute('aria-pressed',String(selected));
    const name = document.createElement('b');
    name.textContent = item.name;
    const detail = document.createElement('small');
    detail.textContent = item.kind.toUpperCase() + ' / ' + item.parallax.toFixed(2) + '× DEPTH';
    choose.append(name,detail);
    choose.onclick = () => { selectedId = item.id; syncInspector(); renderLayerList(); };
    const eye = document.createElement('button');
    eye.type = 'button';
    eye.className = 'eye' + (item.visible ? '' : ' off');
    eye.title = item.visible ? 'Hide plane' : 'Show plane';
    eye.setAttribute('aria-label',(item.visible ? 'Hide ' : 'Show ') + item.name);
    eye.textContent = item.visible ? '◉' : '○';
    eye.onclick = () => { item.visible = !item.visible; renderLayerList(); };
    row.append(glyph, choose, eye);
    list.append(row);
  }
  $('layerCount').textContent = String(scene.layers.length).padStart(2,'0');
  const index = scene.layers.findIndex(l=>l.id === selectedId);
  $('selectedNumber').textContent = String(index+1).padStart(2,'0');
  $('moveUp').disabled = index >= scene.layers.length-1;
  $('moveDown').disabled = index <= 0;
  $('deleteLayer').disabled = scene.layers.length <= 1;
  $('addLayer').disabled = scene.layers.length >= 24;
  $('duplicateLayer').disabled = scene.layers.length >= 24;
}
function syncInspector() {
  const l = layer();
  $('layerName').value = l.name;
  $('layerKind').value = l.kind;
  $('layerX').value = l.x;
  $('layerY').value = l.y;
  $('layerDepth').value = l.parallax;
  $('layerOpacity').value = l.opacity;
  $('motionType').value = l.motion.type;
  $('motionAmplitude').value = l.motion.amplitude;
  $('motionSpeed').value = l.motion.speed;
  $('overlayType').value = l.overlay.type;
  $('overlayIntensity').value = l.overlay.intensity;
  $('overlaySpeed').value = l.overlay.speed;
  $('assetFrames').value = l.asset?.frames || 1;
  $('assetFps').value = l.asset?.fps || 8;
  $('assetStatus').textContent = l.asset ?
    'Embedded image ready. ' + l.asset.frames + ' frame(s) at ' + l.asset.fps + ' FPS.' :
    'No image assigned. Procedural artwork is active for non-image sources.';
  $('depthValue').textContent = l.parallax.toFixed(2);
  $('opacityValue').textContent = Math.round(l.opacity * 100) + '%';
  $('amplitudeValue').textContent = l.motion.amplitude.toFixed(0);
  $('speedValue').textContent = l.motion.speed.toFixed(2);
  $('intensityValue').textContent = l.overlay.intensity.toFixed(2);
  $('effectSpeedValue').textContent = l.overlay.speed.toFixed(2);
  $('selectedNumber').textContent = String(scene.layers.indexOf(l)+1).padStart(2,'0');
}
function syncScene() {
  $('sceneTitle').textContent = scene.title;
  canvas.width = scene.width;
  canvas.height = scene.height;
  document.querySelector('.scene-pills span').textContent = scene.width + ' × ' + scene.height;
  $('cameraX').value = Math.min(1200,Math.max(-1200,scene.camera.x));
  $('cameraXValue').textContent = scene.camera.x.toFixed(0);
  $('playPause').textContent = playing ? 'Ⅱ Pause' : '▶ Play';
  $('playPause').setAttribute('aria-pressed', String(playing));
  $('fpsBadge').textContent = playing && !reducedMotion ? 'ANIMATED' : 'PAUSED / STILL';
  renderLayerList();
  syncInspector();
}
const bindings = [
  ['layerName','name',v => v.slice(0,80)],
  ['layerKind','kind',v => v],
  ['layerX','x',v => Number(v)],
  ['layerY','y',v => Number(v)],
  ['layerDepth','parallax',v => Number(v)],
  ['layerOpacity','opacity',v => Number(v)],
  ['motionType','motion.type',v=>v],
  ['motionAmplitude','motion.amplitude',v=>Number(v)],
  ['motionSpeed','motion.speed',v=>Number(v)],
  ['overlayType','overlay.type',v=>v],
  ['overlayIntensity','overlay.intensity',v=>Number(v)],
  ['overlaySpeed','overlay.speed',v=>Number(v)],
  ['assetFrames','asset.frames',v=>Number(v)],
  ['assetFps','asset.fps',v=>Number(v)]
];
for (const [id,key,convert] of bindings) {
  $(id).addEventListener(id==='layerName' || id==='layerX' || id==='layerY' || id==='assetFrames' || id==='assetFps' ? 'change' : 'input', () => {
    const current = layer();
    const value = convert($(id).value);
    const copy = structuredClone(current);
    const path = key.split('.');
    if(path[0]==='asset' && !copy.asset){flash('Upload an image before adjusting its frames.');syncInspector();return;}
    if(path.length===1)copy[path[0]]=value;
    else copy[path[0]][path[1]]=value;
    const index = scene.layers.indexOf(current);
    scene.layers[index] = normalizeLayer(copy,index);
    if(id==='layerKind' && value==='image' && !copy.asset) flash('Choose Import image to fill this plane.');
    syncInspector();
    if(['layerName','layerKind','layerDepth'].includes(id))renderLayerList();
  });
}
function uniqueId() {
  let n=1;
  while(scene.layers.some(l=>l.id==='custom-plane-'+n))n++;
  return 'custom-plane-'+n;
}
$('addLayer').onclick=()=>{
  if(scene.layers.length>=24)return;
  const added=makeLayer(scene.layers.length);
  added.id=uniqueId();added.name='New depth plane';added.kind='ruins';
  scene.layers.push(added);selectedId=added.id;
  syncScene();flash('New plane added to the front of the composition.');
};
$('duplicateLayer').onclick=()=>{
  if(scene.layers.length>=24)return;
  const original=layer(), duplicate=structuredClone(original);
  duplicate.id=uniqueId();duplicate.name=(duplicate.name+' copy').slice(0,80);
  scene.layers.splice(scene.layers.indexOf(original)+1,0,duplicate);
  selectedId=duplicate.id;syncScene();
};
$('deleteLayer').onclick=()=>{
  if(scene.layers.length===1)return;
  const index=scene.layers.indexOf(layer());scene.layers.splice(index,1);
  selectedId=scene.layers[Math.min(index,scene.layers.length-1)].id;
  syncScene();
};
for(const [id,direction] of [['moveUp',1],['moveDown',-1]]){
  $(id).onclick=()=>{
    const index=scene.layers.indexOf(layer()),target=index+direction;
    if(target<0||target>=scene.layers.length)return;
    [scene.layers[index],scene.layers[target]]=[scene.layers[target],scene.layers[index]];
    syncScene();
  };
}
$('playPause').onclick=()=>{playing=!playing;syncScene();};
$('solo').onchange=e=>{solo=e.target.checked;};
$('spread').oninput=e=>{spread=Number(e.target.value);$('spreadValue').textContent=String(spread);};
$('cameraX').oninput=e=>{scene.camera.x=Number(e.target.value);$('cameraXValue').textContent=String(scene.camera.x);};
let drag=null;
canvas.addEventListener('pointerdown',e=>{
  drag={x:e.clientX,camera:scene.camera.x};
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(!drag)return;
  const rect=canvas.getBoundingClientRect();
  const shift=(e.clientX-drag.x)*(scene.width/rect.width);
  scene.camera.x=Math.max(-1200,Math.min(1200,drag.camera-shift));
  $('cameraX').value=scene.camera.x;
  $('cameraXValue').textContent=scene.camera.x.toFixed(0);
});
canvas.addEventListener('pointerup',()=>{drag=null;});
canvas.addEventListener('pointercancel',()=>{drag=null;});

function download(blob,filename) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function sceneJson(){return JSON.stringify(normalizeScene(scene),null,2);}
function filename(){return scene.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'layer-scene';}
$('exportScene').onclick=()=>{
  download(new Blob([sceneJson()],{type:'application/json'}),filename()+'.layer-scene.json');
  flash('Portable Layer Scene JSON exported.');
};
$('saveScene').onclick=()=>{
  try{localStorage.setItem(KEY,sceneJson());flash('Scene saved to this browser.');}
  catch{flash('Browser storage is full. Export JSON to keep your scene.');}
};
$('newScene').onclick=()=>{
  if(!confirm('Replace the current scene with the seven-plane demo? Export first to keep edits.'))return;
  scene=createScene();selectedId=scene.layers[3].id;elapsed=0;syncScene();
};
$('importScene').onclick=()=>$('sceneFile').click();
$('sceneFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  if(file.size>12_000_000){flash('Scene file too large (12 MB max).');return;}
  try{
    const parsed=JSON.parse(await file.text());
    scene=normalizeScene(parsed);selectedId=scene.layers[0].id;elapsed=0;
    syncScene();flash('Imported '+scene.layers.length+' animated planes.');
  }catch(err){flash('Cannot import scene: '+err.message);}
};
$('imageFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2_000_000){
    flash('Use PNG, JPG or WebP under 2 MB.');return;
  }
  const target=selectedId;
  try{
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error('Read failed'));
      reader.readAsDataURL(file);
    });
    if(!isSafeAsset(dataUrl))throw new Error('Unsupported or oversized image.');
    const item=scene.layers.find(l=>l.id===target);
    if(!item)return;
    item.asset={dataUrl,frames:1,fps:8};
    item.kind='image';
    syncScene();
    flash('Image embedded. Set frame count for horizontal sprite sheets.');
  }catch(err){flash(err.message);}
};
$('clearImage').onclick=()=>{
  layer().asset=null;
  if(layer().kind==='image')layer().kind='ruins';
  syncInspector();renderLayerList();
};
$('snapshot').onclick=()=>{
  canvas.toBlob(blob=>{
    if(blob)download(blob,filename()+'-snapshot.png');
    else flash('Snapshot could not be created.');
  },'image/png');
};
function tick(now) {
  if(lastFrame===null)lastFrame=now;
  const dt=Math.min((now-lastFrame)/1000,.08);lastFrame=now;
  if(playing&&!reducedMotion)elapsed+=dt;
  if(now-previousDraw>32){
    previousDraw=now;
    renderScene(ctx,scene,elapsed,{solo:solo?selectedId:null,spread,reducedMotion});
  }
  requestAnimationFrame(tick);
}
try{
  const saved=localStorage.getItem(KEY);
  if(saved){scene=normalizeScene(JSON.parse(saved));selectedId=scene.layers[0].id;}
}catch{/* Invalid older browser save: leave demo available. */}
syncScene();
if(!ctx){$('statusIndicator').textContent='CANVAS UNAVAILABLE';flash('Canvas 2D is unavailable in this browser.');}
else requestAnimationFrame(tick);
