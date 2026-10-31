import {
  SCHEMA, KINDS, EFFECTS, MOTIONS,
  createScene, makeLayer, normalizeScene, normalizeLayer, renderScene, isSafeAsset
} from './engine.js';
import {normalizePuzzle,startPuzzle,renderPuzzle} from './puzzle.js';
import {importTileStudio,importSpriteStudio,renderTileWorld,tileCellsNear} from './studio-bridge.js';
import {normalizeDirector,renderDirectorLighting,renderDirectorGuides} from './world-director.js';

const $ = id => document.getElementById(id);
const canvas = $('sceneCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const KEY = 'pixelforge.layer-scene.v1.local';
let scene = createScene();
let selectedId = scene.layers[3].id;
let selectedPuzzle='enemy:0';
let selectedDirector='trigger:0';
let puzzlePreviewState=null;
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
  $('overlayFrames').value = l.overlay.asset?.frames || 1;
  $('overlayFps').value = l.overlay.asset?.fps || 8;
  $('overlayX').value = l.overlay.x;
  $('overlayY').value = l.overlay.y;
  $('overlayAssetStatus').textContent = l.overlay.asset ? 'Independent animated overlay: ' + l.overlay.asset.frames + ' frame(s) at ' + l.overlay.asset.fps + ' FPS.' : 'No animated image overlay assigned.';
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
  syncPuzzleControls();
  syncArtBridgeControls();
  syncDirectorControls();
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
  ['overlayX','overlay.x',v=>Number(v)],
  ['overlayY','overlay.y',v=>Number(v)],
  ['overlayFrames','overlay.asset.frames',v=>Number(v)],
  ['overlayFps','overlay.asset.fps',v=>Number(v)],
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
    if(path[1]==='asset' && !copy.overlay.asset){flash('Upload an overlay image before adjusting its frames.');syncInspector();return;}
    if(path.length===1)copy[path[0]]=value;
    else if(path.length===2)copy[path[0]][path[1]]=value;
    else copy[path[0]][path[1]][path[2]]=value;
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

function syncArtBridgeControls(){
  const world=scene.playable.tileWorld,actor=scene.playable.actor;
  $('tileScale').value=world?.scale??2;
  $('tileOriginX').value=world?.originX??0;
  $('tileOriginY').value=world?.originY??0;
  for(const id of ['tileScale','tileOriginX','tileOriginY','removeTileWorld'])$(id).disabled=!world;
  $('removeActor').disabled=!actor;
  $('tileWorldStatus').textContent=world?
    'Tile map: '+world.sceneId+' · '+world.width+'×'+world.height+' cells · '+world.tiles.length+' tiles · '+(world.tiles.some(t=>t.pixels.some(Boolean))?'painted pixels loaded':'metadata-only colors')+'.' :
    'No imported map. Stonebridge platforms remain playable.';
  $('actorStatus').textContent=actor?
    'Sprite Studio hero: '+actor.width+'×'+actor.height+' · '+actor.frames.length+' labeled frames · '+actor.fps+' FPS.' :
    'No Sprite Studio character. Built-in hero remains active.';
}
async function readBoundedFile(file){
  if(!file||file.size>12_000_000)throw Error('Use a JSON file smaller than 12 MB.');
  try{return JSON.parse(await file.text());}
  catch{throw Error('Could not parse JSON from that file.');}
}
$('useSavedStudio').onclick=()=>{
  try{
    const saved=localStorage.getItem('parallax.pixelforge.v5.0.project');
    if(!saved)throw Error('No saved Creator Studio project found in this browser.');
    if(saved.length>12_000_000)throw Error('Saved Studio project is too large for the browser handoff.');
    const project=JSON.parse(saved);
    // Creator Studio's canonical state has spriteStudio and tileStudio top-level keys.
    if(project.tileStudio?.studioType!=='pixelforge.tile-studio.v5.10' ||
       project.spriteStudio?.studioType!=='pixelforge.sprite-studio.v5.9')
      throw Error('Saved project has no compatible native Tile Studio and Sprite Studio states.');
    const world=importTileStudio(project);
    const actor=importSpriteStudio(project);
    scene.playable.tileWorld=world;scene.playable.actor=actor;
    scene.playable.worldWidth=Math.min(6000,Math.max(960,world.originX+world.width*world.tileSize*world.scale));
    scene.playable=normalizePuzzle(scene.playable);
    syncPuzzleControls();syncArtBridgeControls();
    $('puzzlePreview').checked=true;
    flash('Imported painted tiles and sprite animation from saved Creator Studio.');
  }catch(err){flash('Saved Studio import failed: '+err.message);}
};
$('importTileWorld').onclick=()=>$('tileWorldFile').click();
$('tileWorldFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
    const raw=await readBoundedFile(file);
    // The adapter consumes the existing native Tile Studio state or exported map contract.
    const world=importTileStudio(raw);
    scene.playable.tileWorld=world;
    scene.playable.worldWidth=Math.min(6000,Math.max(960,world.originX+world.width*world.tileSize*world.scale));
    scene.playable=normalizePuzzle(scene.playable);
    syncPuzzleControls();syncArtBridgeControls();
    $('puzzlePreview').checked=true;
    flash('PixelForge Tile Studio map imported. Solid cells now have collision.');
  }catch(err){flash('Tile import rejected: '+err.message);}
};
$('importActor').onclick=()=>$('actorFile').click();
$('actorFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  try{
    const raw=await readBoundedFile(file);
    scene.playable.actor=importSpriteStudio(raw);
    scene.playable=normalizePuzzle(scene.playable);
    syncPuzzleControls();syncArtBridgeControls();
    $('puzzlePreview').checked=true;
    flash('Labeled Sprite Studio frames imported for the playable hero.');
  }catch(err){flash('Sprite import rejected: '+err.message);}
};
for(const [id,key] of [['tileScale','scale'],['tileOriginX','originX'],['tileOriginY','originY']]){
  $(id).onchange=e=>{
    const world=scene.playable.tileWorld;if(!world)return;
    const proposed=Number(e.target.value);
    if(!Number.isFinite(proposed)){syncArtBridgeControls();return;}
    world[key]=proposed;
    scene.playable=normalizePuzzle(scene.playable);
    syncPuzzleControls();syncArtBridgeControls();
  };
}
$('removeTileWorld').onclick=()=>{
  scene.playable.tileWorld=null;syncPuzzleControls();syncArtBridgeControls();
  flash('Tile map detached; original puzzle platforms restored.');
};
$('removeActor').onclick=()=>{
  scene.playable.actor=null;syncPuzzleControls();syncArtBridgeControls();
  flash('Built-in hero restored.');
};
function directorChoices(){
  const d=scene.playable.director;
  return [
    ...d.triggers.map((x,i)=>({value:'trigger:'+i,label:(x.kind==='checkpoint'?'Checkpoint: ':'Message: ')+x.id})),
    ...d.cameras.map((x,i)=>({value:'camera:'+i,label:'Camera: '+x.id})),
    ...d.lights.map((x,i)=>({value:'light:'+i,label:'Light: '+x.id}))
  ];
}
function activeDirector(){
  const [kind,index]=selectedDirector.split(':');
  const d=scene.playable.director;
  const collection=kind==='trigger'?d.triggers:kind==='camera'?d.cameras:kind==='light'?d.lights:[];
  return {kind,collection,item:collection[Number(index)]||null};
}
function syncDirectorControls(){
  scene.playable.director=normalizeDirector(scene.playable.director);
  const d=scene.playable.director;
  const choices=directorChoices(),select=$('directorObject');
  if(!choices.some(x=>x.value===selectedDirector))selectedDirector=choices[0]?.value||'';
  select.replaceChildren();
  if(!choices.length){
    const option=document.createElement('option');option.textContent='No objects';option.value='';
    select.append(option);
  }else for(const choice of choices){
    const option=document.createElement('option');option.textContent=choice.label;option.value=choice.value;
    select.append(option);
  }
  select.value=selectedDirector;
  const {kind,item}=activeDirector();
  const isTrigger=kind==='trigger'&&Boolean(item);
  const isCamera=kind==='camera'&&Boolean(item);
  const isLight=kind==='light'&&Boolean(item);
  const fields={
    directorX:[item?.x??0,Boolean(item)],
    directorY:[item?.y??0,isTrigger||isLight],
    directorW:[item?.w??0,isTrigger||isCamera],
    directorH:[item?.h??0,isTrigger],
    directorKind:[item?.kind??'message',isTrigger],
    directorMessage:[item?.message??'',isTrigger],
    directorFocus:[item?.focus??.38,isCamera],
    directorRadius:[item?.radius??240,isLight],
    directorIntensity:[item?.intensity??1,isLight],
    directorColor:[item?.color??'#ffcf93',isLight]
  };
  for(const [id,[value,enabled]] of Object.entries(fields)){
    $(id).value=value;$(id).disabled=!enabled;
  }
  $('directorAmbient').value=d.ambient;
  $('removeDirector').disabled=!item;
  $('addMessage').disabled=d.triggers.length>=32;
  $('addCheckpoint').disabled=d.triggers.length>=32;
  $('addCamera').disabled=d.cameras.length>=16;
  $('addLight').disabled=d.lights.length>=24;
  $('directorStatus').textContent=d.triggers.length+' event zones · '+d.cameras.length+
    ' camera regions · '+d.lights.length+' light pools · '+Math.round(d.ambient*100)+'% ambient darkness.';
  puzzlePreviewState=startPuzzle(scene);
}
$('directorObject').onchange=e=>{selectedDirector=e.target.value;syncDirectorControls();};
const directorBindings={
  directorX:'x',directorY:'y',directorW:'w',directorH:'h',
  directorKind:'kind',directorMessage:'message',directorFocus:'focus',
  directorRadius:'radius',directorIntensity:'intensity',directorColor:'color'
};
for(const [id,key] of Object.entries(directorBindings)){
  $(id).onchange=e=>{
    const {item}=activeDirector();if(!item||!(key in item))return;
    const value=['kind','message','color'].includes(key)?e.target.value:Number(e.target.value);
    if(typeof value==='number'&&!Number.isFinite(value)){syncDirectorControls();return;}
    item[key]=value;
    syncDirectorControls();
  };
}
$('directorAmbient').oninput=e=>{
  scene.playable.director.ambient=Number(e.target.value);
  $('directorStatus').textContent='Ambient darkness: '+Math.round(scene.playable.director.ambient*100)+'%';
};
$('directorAmbient').onchange=syncDirectorControls;
function directorNextId(prefix){
  const all=[...scene.playable.director.triggers,...scene.playable.director.cameras,...scene.playable.director.lights];
  const taken=new Set(all.map(x=>x.id));let i=1;while(taken.has(prefix+'-'+i))i++;
  return prefix+'-'+i;
}
function addWorldObject(kind){
  const d=scene.playable.director,baseX=Math.max(0,Math.min(5900,scene.camera.x+330));
  let index;
  if(kind==='message'||kind==='checkpoint'){
    if(d.triggers.length>=32)return;
    d.triggers.push({id:directorNextId(kind),kind,x:baseX,y:385,w:130,h:115,
      message:kind==='checkpoint'?'BEACON ACTIVATED':'A NEW PASSAGE OPENS.',once:true});
    index='trigger:'+(d.triggers.length-1);
  }else if(kind==='camera'){
    if(d.cameras.length>=16)return;
    d.cameras.push({id:directorNextId(kind),x:baseX,w:420,focus:.55});
    index='camera:'+(d.cameras.length-1);
  }else{
    if(d.lights.length>=24)return;
    d.lights.push({id:directorNextId('light'),x:baseX,y:310,radius:220,
      intensity:.9,color:'#ffcf93'});
    index='light:'+(d.lights.length-1);
  }
  selectedDirector=index;syncDirectorControls();flash('World object added. Position it in world coordinates.');
}
$('addMessage').onclick=()=>addWorldObject('message');
$('addCheckpoint').onclick=()=>addWorldObject('checkpoint');
$('addCamera').onclick=()=>addWorldObject('camera');
$('addLight').onclick=()=>addWorldObject('light');
$('removeDirector').onclick=()=>{
  const {collection,item}=activeDirector();if(!item)return;
  collection.splice(collection.indexOf(item),1);
  selectedDirector='';syncDirectorControls();flash('World object removed.');
};
function puzzleObjects(){
  return [
    {value:'spawn',label:'Player spawn'},
    {value:'key',label:'Golden key'},
    {value:'gate',label:'Exit gate'},
    ...scene.playable.platforms.map((p,i)=>({value:'platform:'+i,label:'Platform / '+p.id})),
    ...scene.playable.enemies.map((p,i)=>({value:'enemy:'+i,label:'Enemy / '+p.id}))
  ];
}
function activePuzzleObject(){
  const s=scene.playable;
  if(selectedPuzzle==='spawn'||selectedPuzzle==='key'||selectedPuzzle==='gate')return s[selectedPuzzle];
  const [type,num]=selectedPuzzle.split(':');
  const list=type==='enemy'?s.enemies:type==='platform'?s.platforms:[];
  return list[Number(num)]||s.spawn;
}
function syncPuzzleControls(){
  scene.playable=normalizePuzzle(scene.playable);
  const choices=puzzleObjects();
  const select=$('puzzleObject');
  if(!choices.some(x=>x.value===selectedPuzzle))selectedPuzzle='spawn';
  select.replaceChildren();
  for(const choice of choices){
    const option=document.createElement('option');
    option.value=choice.value;option.textContent=choice.label;
    select.append(option);
  }
  select.value=selectedPuzzle;
  const p=activePuzzleObject();
  $('worldWidth').value=scene.playable.worldWidth;
  $('puzzleX').value=p.x;$('puzzleY').value=p.y;
  $('puzzleW').value=p.w||'';$('puzzleH').value=p.h||'';
  const box=selectedPuzzle.startsWith('enemy:')||selectedPuzzle.startsWith('platform:');
  $('puzzleW').disabled=!box;$('puzzleH').disabled=!box;
  $('removePuzzle').disabled=!box;
  $('addPlatform').disabled=scene.playable.platforms.length>=64;
  $('addEnemy').disabled=scene.playable.enemies.length>=32;
  puzzlePreviewState=startPuzzle(scene);
}
$('puzzleObject').onchange=e=>{selectedPuzzle=e.target.value;syncPuzzleControls();};
for(const [id,key] of [['puzzleX','x'],['puzzleY','y'],['puzzleW','w'],['puzzleH','h']]){
  $(id).onchange=e=>{
    const item=activePuzzleObject();
    if(!(key in item))return;
    const value=Number(e.target.value);
    if(!Number.isFinite(value)){syncPuzzleControls();return;}
    item[key]=value;
    syncPuzzleControls();
  };
}
$('worldWidth').onchange=e=>{
  scene.playable.worldWidth=Number(e.target.value);
  syncPuzzleControls();
};
function nextPuzzleId(type){
  const pool=type==='platform'?scene.playable.platforms:scene.playable.enemies;
  const ids=new Set(pool.map(x=>x.id));
  let i=1;while(ids.has(type+'-'+i))i++;
  return type+'-'+i;
}
$('addPlatform').onclick=()=>{
  const pool=scene.playable.platforms;
  if(pool.length>=64)return;
  pool.push({id:nextPuzzleId('platform'),x:Math.max(0,scene.camera.x+330),y:420,w:100,h:20});
  selectedPuzzle='platform:'+(pool.length-1);
  syncPuzzleControls();
  flash('Platform added. Adjust its world-space coordinates.');
};
$('addEnemy').onclick=()=>{
  const pool=scene.playable.enemies;
  if(pool.length>=32)return;
  pool.push({id:nextPuzzleId('enemy'),x:Math.max(0,scene.camera.x+450),y:448,w:44,h:52});
  selectedPuzzle='enemy:'+(pool.length-1);
  syncPuzzleControls();
  flash('Petrifiable enemy added.');
};
$('removePuzzle').onclick=()=>{
  const [type,index]=selectedPuzzle.split(':');
  const list=type==='enemy'?scene.playable.enemies:type==='platform'?scene.playable.platforms:null;
  if(!list||!list[Number(index)])return;
  list.splice(Number(index),1);selectedPuzzle='spawn';syncPuzzleControls();
};
$('playPuzzle').onclick=()=>{
  try{
    sessionStorage.setItem('pixelforge.layer-studio.play-scene.v1',sceneJson());
    location.href='./play.html';
  }catch{
    flash('The scene is too large for a browser handoff. Try exporting JSON and smaller art files.');
  }
};
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
$('overlayFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2_000_000){
    flash('Use PNG, JPG or WebP under 2 MB.');return;
  }
  const target=selectedId;
  try{
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(reader.result);
      reader.onerror=()=>reject(new Error('Read failed'));reader.readAsDataURL(file);
    });
    if(!isSafeAsset(dataUrl))throw new Error('Unsupported or oversized overlay.');
    const item=scene.layers.find(l=>l.id===target);
    if(!item)return;
    item.overlay.asset={dataUrl,frames:1,fps:12};
    syncScene();flash('Animated overlay attached independently of the base artwork.');
  }catch(err){flash(err.message);}
};
$('clearOverlay').onclick=()=>{layer().overlay.asset=null;syncInspector();};
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
    const tileWorld=scene.playable.tileWorld;
    const visualOptions={solo:solo?selectedId:null,spread,reducedMotion};
    if(tileWorld){
      const split=scene.layers.length-1;
      renderScene(ctx,scene,elapsed,{...visualOptions,endLayer:split});
      renderTileWorld(ctx,tileWorld,scene.camera.x,scene.width,scene.height);
      if($('puzzlePreview').checked&&puzzlePreviewState){
        puzzlePreviewState.time=elapsed;
        renderPuzzle(ctx,puzzlePreviewState,{cameraX:scene.camera.x,width:scene.width,height:scene.height,hud:false,reducedMotion,tiles:false});
      }
      renderScene(ctx,scene,elapsed,{...visualOptions,startLayer:split,clear:false});
      if($('showTileCollision').checked){
        const size=tileWorld.tileSize*tileWorld.scale;
        ctx.save();ctx.strokeStyle='#ffd481a9';ctx.lineWidth=1.5;
        for(let row=0;row<tileWorld.height;row++)for(let col=0;col<tileWorld.width;col++){
          if(!tileWorld.layers.collision[row*tileWorld.width+col] &&
             tileWorld.tiles[tileWorld.layers.ground[row*tileWorld.width+col]]?.walkable!==false)continue;
          const x=tileWorld.originX+col*size-scene.camera.x,y=tileWorld.originY+row*size;
          if(x+size<0||x>scene.width||y+size<0||y>scene.height)continue;
          ctx.strokeRect(x+.5,y+.5,size-1,size-1);
        }
        ctx.restore();
      }
    }else{
      renderScene(ctx,scene,elapsed,visualOptions);
      if($('puzzlePreview').checked&&puzzlePreviewState){
        puzzlePreviewState.time=elapsed;
        renderPuzzle(ctx,puzzlePreviewState,{cameraX:scene.camera.x,width:scene.width,height:scene.height,hud:false,reducedMotion});
      }
    }
    const director=scene.playable.director;
    if($('previewLighting').checked)
      renderDirectorLighting(ctx,director,scene.camera.x,scene.width,scene.height);
    if($('directorPreview').checked)
      renderDirectorGuides(ctx,director,scene.camera.x,scene.width,scene.height);
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
