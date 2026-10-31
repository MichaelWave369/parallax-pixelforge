import {
  SCHEMA, KINDS, EFFECTS, MOTIONS,
  createScene, makeLayer, normalizeScene, normalizeLayer, renderScene, isSafeAsset
} from './engine.js';
import {normalizePuzzle,startPuzzle,renderPuzzle} from './puzzle.js';
import {importTileStudio,importSpriteStudio,renderTileWorld,tileCellsNear} from './studio-bridge.js';
import {normalizeDirector,renderDirectorLighting,renderDirectorGuides} from './world-director.js';
import {makeStarterAtlas,stripAtlas,renderPortals,renderRelics} from './room-atlas.js';
import {knownWorldFlags,normalizeQuestLine} from './quest-world.js';
import {STORY_SCHEMA,normalizeStory,renderStoryGuides,storyScene} from './living-story.js';
import {BOSS_SCHEMA,normalizeBoss,renderBossStage,bossTimelineBeats} from './boss-stage.js';

const $ = id => document.getElementById(id);
const canvas = $('sceneCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const KEY = 'pixelforge.layer-scene.v1.local';
let scene = createScene();
let selectedId = scene.layers[3].id;
let selectedPuzzle='enemy:0';
let selectedDirector='trigger:0';
let activeRoomId=null;
let selectedPortalIndex=0;
let selectedRelicIndex=0;
let selectedQuestIndex=0;
let selectedObjectiveIndex=0;
let selectedStoryDialogue=0,selectedStoryEncounter=0,selectedStoryVariant=0;
let previewStoryFlag='';
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
  syncAtlasControls();
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
function currentRoom(){
  return scene.atlas?.rooms.find(room=>room.id===activeRoomId)||null;
}
function commitActiveRoom(){
  const room=currentRoom();
  if(!room)return;
  // Never nest the atlas in a room. This keeps exported files finite.
  room.scene=stripAtlas(normalizeScene({...scene,atlas:null}));
  room.title=scene.title;
}
function adoptActiveRoom(){
  const atlas=scene.atlas;
  if(!atlas)return;
  const room=atlas.rooms.find(r=>r.id===activeRoomId)||atlas.rooms[0];
  activeRoomId=room.id;
  const restored=normalizeScene({...room.scene,atlas:null});
  scene={...restored,atlas};
  scene.title=room.title;
}
function loadActiveRoom(){
  adoptActiveRoom();
  selectedId=scene.layers[0].id;
  selectedPuzzle='spawn';selectedDirector='';selectedPortalIndex=0;selectedRelicIndex=0;
  selectedQuestIndex=0;selectedObjectiveIndex=0;
  selectedStoryDialogue=0;selectedStoryEncounter=0;selectedStoryVariant=0;
  previewStoryFlag='';elapsed=0;
  syncScene();
}
function currentPortal(){
  return currentRoom()?.portals[selectedPortalIndex]||null;
}
function syncAtlasControls(){
  const atlas=scene.atlas;
  if(atlas&&!currentRoom())activeRoomId=atlas.startRoom;
  const room=currentRoom();
  const roomSelect=$('atlasRoom');
  roomSelect.replaceChildren();
  const rooms=atlas?.rooms||[];
  for(const entry of rooms){
    const option=document.createElement('option');
    option.value=entry.id;
    option.textContent=entry.title+(entry.id===atlas.startRoom?' / START':'');
    roomSelect.append(option);
  }
  if(rooms.length)roomSelect.value=activeRoomId;
  const portals=room?.portals||[];
  if(selectedPortalIndex>=portals.length)selectedPortalIndex=0;
  const portalSelect=$('atlasPortal');portalSelect.replaceChildren();
  for(const [i,portal] of portals.entries()){
    const option=document.createElement('option');
    option.value=String(i);option.textContent=portal.label+' / '+(portal.targetRoom||'UNLINKED');
    portalSelect.append(option);
  }
  if(portals.length)portalSelect.value=String(selectedPortalIndex);
  const p=currentPortal();
  const target=$('portalTarget');target.replaceChildren();
  for(const [id,label] of [['','Unlinked passage'],...rooms.map(r=>[r.id,r.title])]){
    const option=document.createElement('option');option.value=id;option.textContent=label;target.append(option);
  }
  const authoredRooms=rooms.map(r=>r.id===activeRoomId?{...r,scene:stripAtlas(scene)}:r);
  const flagChoices=knownWorldFlags({rooms:authoredRooms});
  const requiredFlags=$('portalRequiresFlag');requiredFlags.replaceChildren();
  for(const flag of ['',...flagChoices]){
    const option=document.createElement('option');option.value=flag;
    option.textContent=flag||'No flag required';requiredFlags.append(option);
  }
  requiredFlags.value=p?.requiresFlag||'';
  const requiredQuests=$('portalRequiresQuest');requiredQuests.replaceChildren();
  for(const choice of [{id:'',title:'No quest required'},...(atlas?.quests||[])]){
    const option=document.createElement('option');option.value=choice.id;
    option.textContent=choice.title;requiredQuests.append(option);
  }
  requiredQuests.value=p?.requiresQuest||'';
  const relicChoices=rooms.flatMap(r=>(r.relics||[]).map(relic=>({
    key:r.id+':'+relic.id,label:r.title+' / '+relic.name
  })));
  const required=$('portalRequiresRelic');required.replaceChildren();
  for(const choice of [{key:'',label:'No relic required'},...relicChoices]){
    const option=document.createElement('option');
    option.value=choice.key;option.textContent=choice.label;required.append(option);
  }
  required.value=p?.requiresRelic||'';
  const relics=room?.relics||[];
  if(selectedRelicIndex>=relics.length)selectedRelicIndex=0;
  const relicSelect=$('atlasRelic');relicSelect.replaceChildren();
  for(const [index,relic] of relics.entries()){
    const option=document.createElement('option');
    option.value=String(index);option.textContent=relic.name;relicSelect.append(option);
  }
  if(relics.length)relicSelect.value=String(selectedRelicIndex);
  const relic=relics[selectedRelicIndex]||null;
  $('relicName').value=relic?.name??'';
  $('relicX').value=relic?.x??0;
  $('relicY').value=relic?.y??440;
  $('atlasRelic').disabled=!relic;
  $('relicName').disabled=!relic;
  $('relicX').disabled=!relic;
  $('relicY').disabled=!relic;
  $('addRelic').disabled=!room||relics.length>=8;
  $('removeRelic').disabled=!relic;
  const fields={
    atlasRoomTitle:room?.title??'',
    portalLabel:p?.label??'',portalTarget:p?.targetRoom??'',
    portalX:p?.x??0,portalY:p?.y??0,portalW:p?.w??56,portalH:p?.h??76,
    portalArrivalX:p?.arrivalX??80,portalArrivalY:p?.arrivalY??458
  };
  for(const [id,value] of Object.entries(fields))$(id).value=value;
  $('portalRequiresKey').checked=p?.requiresKey??false;
  $('makeAtlas').disabled=Boolean(atlas);
  $('addRoom').disabled=!atlas||rooms.length>=6;
  $('removeRoom').disabled=!atlas||rooms.length<=1;
  $('setStartRoom').disabled=!atlas||activeRoomId===atlas.startRoom;
  $('addPortal').disabled=!room||portals.length>=8;
  $('removePortal').disabled=!p;
  for(const id of ['atlasRoom','atlasRoomTitle','atlasPortal'])$(id).disabled=!room;
  for(const id of ['portalLabel','portalTarget','portalX','portalY','portalW','portalH',
    'portalArrivalX','portalArrivalY','portalRequiresKey','portalRequiresRelic',
    'portalRequiresFlag','portalRequiresQuest'])$(id).disabled=!p;
  $('atlasStatus').textContent=atlas?
    rooms.length+' linked rooms · '+rooms.reduce((n,r)=>n+r.portals.length,0)+
    ' doors · current: '+room?.title+' · starts: '+rooms.find(r=>r.id===atlas.startRoom)?.title+
    '. Export JSON preserves every room.':
    'Single-room mode. Create a two-room adventure to author doors and connected worlds.';
  syncQuestControls();
  syncStoryControls();
  syncBossControls();
}
$('makeAtlas').onclick=()=>{
  if(scene.atlas)return;
  scene.atlas=makeStarterAtlas(scene,normalizeScene);
  activeRoomId=scene.atlas.startRoom;selectedPortalIndex=0;
  syncScene();flash('Two connected rooms created. Customize each room and its doors.');
};
$('atlasRoom').onchange=e=>{
  commitActiveRoom();activeRoomId=e.target.value;loadActiveRoom();
  flash('Editing '+scene.title+'. Current room artwork and puzzles restored.');
};
$('atlasRoomTitle').onchange=e=>{
  const room=currentRoom();if(!room)return;
  const title=e.target.value.trim().slice(0,80)||'Untitled Chamber';
  room.title=title;scene.title=title;
  syncAtlasControls();$('sceneTitle').textContent=title;
};
$('setStartRoom').onclick=()=>{
  if(!scene.atlas)return;
  commitActiveRoom();scene.atlas.startRoom=activeRoomId;syncAtlasControls();
  flash('Adventure now starts in '+scene.title+'.');
};
function uniqueRoomId(){
  const used=new Set(scene.atlas.rooms.map(r=>r.id));
  let i=1;while(used.has('chamber-'+i))i++;
  return 'chamber-'+i;
}
$('addRoom').onclick=()=>{
  if(!scene.atlas||scene.atlas.rooms.length>=6)return;
  commitActiveRoom();
  const oldRoom=currentRoom();
  const nextId=uniqueRoomId();
  const source=stripAtlas(normalizeScene({...scene,atlas:null}));
  source.title='Chamber '+(scene.atlas.rooms.length+1);
  source.playable.spawn={x:75,y:458};
  source.playable.key={x:1145,y:455};
  const newRoom={id:nextId,title:source.title,scene:source,portals:[],relics:[]};
  scene.atlas.rooms.push(newRoom);
  // Auto-connect in both directions when portal capacity permits.
  if(oldRoom&&oldRoom.portals.length<8)
    oldRoom.portals.push({id:'to-'+nextId,x:1515,y:424,w:56,h:76,targetRoom:nextId,
      arrivalX:135,arrivalY:458,requiresKey:false,label:'ENTER '+source.title.toUpperCase()});
  newRoom.portals.push({id:'back-to-'+oldRoom.id,x:55,y:424,w:56,h:76,targetRoom:oldRoom.id,
    arrivalX:1425,arrivalY:458,requiresKey:false,label:'RETURN '+oldRoom.title.toUpperCase()});
  activeRoomId=nextId;loadActiveRoom();
  flash('New room connected with two-way doors. Move the doors to match the level.');
};
$('removeRoom').onclick=()=>{
  const atlas=scene.atlas;if(!atlas||atlas.rooms.length<=1)return;
  if(!confirm('Delete this room and its incoming door links?'))return;
  const removing=activeRoomId;
  atlas.rooms=atlas.rooms.filter(r=>r.id!==removing);
  for(const r of atlas.rooms){
    r.portals=r.portals.filter(p=>p.targetRoom!==removing);
    for(const p of r.portals)if(p.requiresRelic?.startsWith(removing+':'))p.requiresRelic='';
  }
  if(atlas.startRoom===removing)atlas.startRoom=atlas.rooms[0].id;
  activeRoomId=atlas.rooms[0].id;loadActiveRoom();
  flash('Removed the room and all links pointing to it.');
};
$('atlasPortal').onchange=e=>{selectedPortalIndex=Number(e.target.value)||0;syncAtlasControls();};
const portalFields={
  portalLabel:'label',portalTarget:'targetRoom',
  portalX:'x',portalY:'y',portalW:'w',portalH:'h',
  portalArrivalX:'arrivalX',portalArrivalY:'arrivalY'
};
for(const [id,key] of Object.entries(portalFields)){
  $(id).onchange=e=>{
    const p=currentPortal();if(!p)return;
    const val=['label','targetRoom'].includes(key)?e.target.value:Number(e.target.value);
    if(typeof val==='number'&&!Number.isFinite(val)){syncAtlasControls();return;}
    p[key]=val;
    // Normalizing bounds at export; also immediately update preview.
    syncAtlasControls();
  };
}
$('portalRequiresKey').onchange=e=>{
  const p=currentPortal();if(!p)return;p.requiresKey=e.target.checked;syncAtlasControls();
};
$('portalRequiresRelic').onchange=e=>{
  const p=currentPortal();if(!p)return;p.requiresRelic=e.target.value;syncAtlasControls();
};
for(const [control,key] of [['portalRequiresFlag','requiresFlag'],['portalRequiresQuest','requiresQuest']]){
  $(control).onchange=e=>{
    const p=currentPortal();if(!p)return;p[key]=e.target.value;syncAtlasControls();
  };
}
$('atlasRelic').onchange=e=>{
  selectedRelicIndex=Number(e.target.value)||0;syncAtlasControls();
};
for(const [id,key] of [['relicName','name'],['relicX','x'],['relicY','y']]){
  $(id).onchange=e=>{
    const room=currentRoom();const relic=room?.relics[selectedRelicIndex];
    if(!relic)return;
    const value=key==='name'?e.target.value.trim().slice(0,70):Number(e.target.value);
    if(typeof value==='number'&&!Number.isFinite(value)){syncAtlasControls();return;}
    relic[key]=value;
    syncAtlasControls();
  };
}
$('addRelic').onclick=()=>{
  const room=currentRoom();if(!room||room.relics.length>=8)return;
  const used=new Set(room.relics.map(r=>r.id));let n=1;
  while(used.has('relic-'+n))n++;
  room.relics.push({id:'relic-'+n,name:'Ancient Relic',x:Math.max(0,scene.camera.x+360),y:420});
  selectedRelicIndex=room.relics.length-1;syncAtlasControls();
  flash('Relic added. Collect it in play mode to unlock inventory gates.');
};
$('removeRelic').onclick=()=>{
  const room=currentRoom();const relic=room?.relics[selectedRelicIndex];if(!relic)return;
  const id=room.id+':'+relic.id;
  room.relics.splice(selectedRelicIndex,1);
  for(const entry of scene.atlas.rooms)for(const portal of entry.portals){
    if(portal.requiresRelic===id)portal.requiresRelic='';
  }
  selectedRelicIndex=0;syncAtlasControls();flash('Relic removed; its door requirements cleared.');
};
$('addPortal').onclick=()=>{
  const room=currentRoom();if(!room||room.portals.length>=8)return;
  const other=scene.atlas.rooms.find(r=>r.id!==room.id);
  let i=1;const used=new Set(room.portals.map(p=>p.id));
  while(used.has('door-'+i))i++;
  room.portals.push({id:'door-'+i,x:Math.max(0,scene.camera.x+365),y:424,w:56,h:76,
    targetRoom:other?.id||'',arrivalX:other?.scene.playable.spawn.x??80,
    arrivalY:other?.scene.playable.spawn.y??458,requiresKey:false,label:'NEW PASSAGE'});
  selectedPortalIndex=room.portals.length-1;syncAtlasControls();
  flash('Door added. Set its destination and arrival position.');
};
$('removePortal').onclick=()=>{
  const room=currentRoom();if(!room||!currentPortal())return;
  room.portals.splice(selectedPortalIndex,1);
  selectedPortalIndex=0;syncAtlasControls();flash('Door removed.');
};
function selectedQuest(){
  return scene.atlas?.quests?.[selectedQuestIndex]||null;
}
function selectedObjective(){
  return selectedQuest()?.objectives?.[selectedObjectiveIndex]||null;
}
function questTargetChoices(kind){
  const atlas=scene.atlas;
  if(!atlas)return [];
  if(kind==='visit')return atlas.rooms.map(r=>({value:r.id,label:'Visit: '+r.title}));
  if(kind==='relic')return atlas.rooms.flatMap(r=>(r.relics||[])
    .map(relic=>({value:r.id+':'+relic.id,label:r.title+' / '+relic.name})));
  if(kind==='flag'){
    const rooms=atlas.rooms.map(r=>r.id===activeRoomId?{...r,scene:stripAtlas(scene)}:r);
    return knownWorldFlags({rooms}).map(value=>({value,label:'Activate: '+value}));
  }
  return [];
}
function syncQuestControls(){
  const atlas=scene.atlas;
  const quests=atlas?.quests||[];
  if(selectedQuestIndex>=quests.length)selectedQuestIndex=0;
  const quest=selectedQuest(),select=$('questSelect');
  select.replaceChildren();
  for(const [i,q] of quests.entries()){
    const option=document.createElement('option');option.value=String(i);
    option.textContent=q.title;select.append(option);
  }
  if(quest)select.value=String(selectedQuestIndex);
  if(selectedObjectiveIndex>=(quest?.objectives.length||0))selectedObjectiveIndex=0;
  const objective=selectedObjective(),objectives=$('objectiveSelect');
  objectives.replaceChildren();
  for(const [i,o] of (quest?.objectives||[]).entries()){
    const option=document.createElement('option');option.value=String(i);
    option.textContent=o.label;objectives.append(option);
  }
  if(objective)objectives.value=String(selectedObjectiveIndex);
  $('questTitle').value=quest?.title||'';
  $('questDescription').value=quest?.description||'';
  $('objectiveLabel').value=objective?.label||'';
  $('objectiveKind').value=objective?.kind==='invalid'?'relic':objective?.kind||'visit';
  const targets=$('objectiveTarget');targets.replaceChildren();
  const choices=questTargetChoices(objective?.kind);
  for(const choice of choices){
    const option=document.createElement('option');
    option.value=choice.value;option.textContent=choice.label;targets.append(option);
  }
  if(objective&&!choices.some(choice=>choice.value===objective.target)){
    const option=document.createElement('option');option.value=objective.target;
    option.textContent=objective.target?'Missing target: '+objective.target:'Select a valid target';
    targets.append(option);
  }
  if(objective)targets.value=objective.target;
  for(const id of ['questSelect','questTitle','questDescription'])$(id).disabled=!quest;
  for(const id of ['objectiveSelect','objectiveLabel','objectiveKind','objectiveTarget'])
    $(id).disabled=!objective;
  $('addQuest').disabled=!atlas||quests.length>=12;
  $('removeQuest').disabled=!quest;
  $('addObjective').disabled=!quest||quest.objectives.length>=6;
  $('removeObjective').disabled=!objective;
  $('questStatus').textContent=atlas?
    quests.length+' quests · '+quests.reduce((n,q)=>n+q.objectives.length,0)+
    ' objectives · Complete objectives to unlock quest-gated doors.':
    'Create a multi-room adventure to author quests.';
}
$('questSelect').onchange=e=>{
  selectedQuestIndex=Number(e.target.value)||0;selectedObjectiveIndex=0;syncQuestControls();
};
$('objectiveSelect').onchange=e=>{
  selectedObjectiveIndex=Number(e.target.value)||0;syncQuestControls();
};
for(const [control,key] of [['questTitle','title'],['questDescription','description']]){
  $(control).onchange=e=>{
    const quest=selectedQuest();if(!quest)return;
    quest[key]=e.target.value.slice(0,key==='title'?80:220);
    scene.atlas.quests=normalizeQuestLine(scene.atlas.quests);
    syncAtlasControls();
  };
}
$('objectiveKind').onchange=e=>{
  const obj=selectedObjective();if(!obj)return;
  obj.kind=e.target.value;
  obj.target=questTargetChoices(obj.kind)[0]?.value||'';
  syncQuestControls();
};
$('objectiveTarget').onchange=e=>{
  const obj=selectedObjective();if(!obj)return;obj.target=e.target.value;
  syncQuestControls();
};
$('objectiveLabel').onchange=e=>{
  const obj=selectedObjective();if(!obj)return;
  obj.label=e.target.value.slice(0,100);
  syncQuestControls();
};
function nextQuestId(){
  const ids=new Set((scene.atlas.quests||[]).map(q=>q.id));
  let i=1;while(ids.has('quest-'+i))i++;
  return 'quest-'+i;
}
$('addQuest').onclick=()=>{
  const atlas=scene.atlas;if(!atlas||atlas.quests.length>=12)return;
  atlas.quests.push({id:nextQuestId(),title:'New quest',description:'Write this quest\'s story here.',
    objectives:[]});
  selectedQuestIndex=atlas.quests.length-1;selectedObjectiveIndex=0;
  syncAtlasControls();flash('Quest added. Add a room, relic or world-flag objective.');
};
$('removeQuest').onclick=()=>{
  const atlas=scene.atlas,quest=selectedQuest();if(!atlas||!quest)return;
  atlas.quests.splice(selectedQuestIndex,1);
  for(const room of atlas.rooms)for(const portal of room.portals)
    if(portal.requiresQuest===quest.id)portal.requiresQuest='';
  selectedQuestIndex=0;selectedObjectiveIndex=0;syncAtlasControls();
  flash('Quest removed. Its linked door requirements were cleared.');
};
$('addObjective').onclick=()=>{
  const quest=selectedQuest();if(!quest||quest.objectives.length>=6)return;
  let i=1;const used=new Set(quest.objectives.map(o=>o.id));
  while(used.has('objective-'+i))i++;
  const kind='visit',target=questTargetChoices(kind).at(-1)?.value||'';
  quest.objectives.push({id:'objective-'+i,kind,target,label:'Visit the chamber'});
  selectedObjectiveIndex=quest.objectives.length-1;
  syncQuestControls();flash('Objective added. Select its condition and destination.');
};
$('removeObjective').onclick=()=>{
  const quest=selectedQuest(),objective=selectedObjective();if(!quest||!objective)return;
  quest.objectives.splice(selectedObjectiveIndex,1);
  selectedObjectiveIndex=0;syncQuestControls();
};
function emptyStory(){
  return {schema:STORY_SCHEMA,dialogues:[],encounters:[],variants:[]};
}
function editStory(){
  const room=currentRoom();if(!room)return null;
  if(!room.story)room.story=emptyStory();
  return room.story;
}
function storyList(){
  return currentRoom()?.story||null;
}
function storySelected(kind){
  const story=storyList();
  const idx=kind==='dialogues'?selectedStoryDialogue:
    kind==='encounters'?selectedStoryEncounter:selectedStoryVariant;
  return story?.[kind]?.[idx]||null;
}
function fillStorySelect(id,items,index,label){
  const select=$(id);select.replaceChildren();
  for(const [i,item] of (items||[]).entries()){
    const option=document.createElement('option');
    option.value=String(i);option.textContent=label(item);
    select.append(option);
  }
  if((items||[]).length)select.value=String(index);
  select.disabled=!(items||[]).length;
}
function fillStoryOptions(id,choices,selected){
  const select=$(id);select.replaceChildren();
  for(const [value,title] of choices){
    const option=document.createElement('option');
    option.value=value;option.textContent=title;
    select.append(option);
  }
  if(selected&&!choices.some(([v])=>v===selected)){
    const option=document.createElement('option');
    option.value=selected;option.textContent='Missing: '+selected;
    select.append(option);
  }
  select.value=selected||'';
}
function syncStoryControls(){
  const room=currentRoom(),story=storyList();
  const dialogues=story?.dialogues||[],encounters=story?.encounters||[],
    variants=story?.variants||[];
  if(selectedStoryDialogue>=dialogues.length)selectedStoryDialogue=0;
  if(selectedStoryEncounter>=encounters.length)selectedStoryEncounter=0;
  if(selectedStoryVariant>=variants.length)selectedStoryVariant=0;
  fillStorySelect('storyDialogue',dialogues,selectedStoryDialogue,d=>d.speaker+' / '+d.id);
  fillStorySelect('storyEncounter',encounters,selectedStoryEncounter,e=>e.id+' / '+e.enemyId);
  fillStorySelect('storyVariant',variants,selectedStoryVariant,v=>v.id+' / '+v.layerId);
  const d=storySelected('dialogues'),e=storySelected('encounters'),v=storySelected('variants');
  const dFields={
    storySpeaker:d?.speaker??'',storyText:d?.text??'',
    storyX:d?.x??0,storyY:d?.y??0,storyW:d?.w??110,storyH:d?.h??120,
    storyChoiceA:d?.choices?.[0]?.label??'',
    storyChoiceAFlag:d?.choices?.[0]?.setFlag??'',
    storyChoiceB:d?.choices?.[1]?.label??'',
    storyChoiceBFlag:d?.choices?.[1]?.setFlag??''
  };
  for(const [id,value] of Object.entries(dFields)){
    $(id).value=value;$(id).disabled=!d;
  }
  $('storyOnce').checked=d?.once??true;$('storyOnce').disabled=!d;
  const roomFlags=scene.atlas?knownWorldFlags({rooms:scene.atlas.rooms
    .map(r=>r.id===activeRoomId?{...r,scene:stripAtlas(scene)}:r)}):[];
  const flagOpts=[['','No flag required'],...roomFlags.map(v=>[v,v])];
  fillStoryOptions('storyRequiresFlag',flagOpts,d?.requiresFlag||'');
  $('storyRequiresFlag').disabled=!d;
  fillStoryOptions('storyEncounterFlag',flagOpts,e?.requiresFlag||'');
  $('storyEncounterFlag').disabled=!e;
  const eFields={
    storyEncounterMessage:e?.message??'',
    storyEncounterX:e?.x??0,storyEncounterY:e?.y??0,
    storyEncounterW:e?.w??110,storyEncounterH:e?.h??120
  };
  for(const [id,value] of Object.entries(eFields)){$(id).value=value;$(id).disabled=!e;}
  fillStoryOptions('storyEncounterEnemy',scene.playable.enemies.map(enemy=>[enemy.id,enemy.id]),e?.enemyId||'');
  $('storyEncounterEnemy').disabled=!e;
  fillStoryOptions('storyVariantLayer',scene.layers.map(l=>[l.id,l.name]),v?.layerId||'');
  $('storyVariantLayer').disabled=!v;
  fillStoryOptions('storyVariantFlag',flagOpts,v?.whenFlag||'');
  $('storyVariantFlag').disabled=!v;
  $('storyVariantMode').value=v?.mode??'reveal';
  $('storyVariantMode').disabled=!v;
  fillStoryOptions('storyPreviewFlag',[['','Before story choices'],...roomFlags.map(f=>[f,'After: '+f])],previewStoryFlag);
  $('storyPreviewFlag').disabled=!room;
  $('addStoryDialogue').disabled=!room||dialogues.length>=12;
  $('removeStoryDialogue').disabled=!d;
  $('addStoryEncounter').disabled=!room||encounters.length>=12;
  $('removeStoryEncounter').disabled=!e;
  $('addStoryVariant').disabled=!room||variants.length>=24;
  $('removeStoryVariant').disabled=!v;
  $('storyStatus').textContent=room?
    dialogues.length+' conversations · '+encounters.length+' guardian zones · '+
    variants.length+' scenery rules · These events travel with '+room.title+'.':
    'Create a Room Atlas to author dialogue and living story events.';
}
function storyId(items,prefix){
  const seen=new Set(items.map(x=>x.id));let i=1;
  while(seen.has(prefix+'-'+i))i++;
  return prefix+'-'+i;
}
$('storyDialogue').onchange=value=>{selectedStoryDialogue=Number(value.target.value)||0;syncStoryControls();};
$('storyEncounter').onchange=value=>{selectedStoryEncounter=Number(value.target.value)||0;syncStoryControls();};
$('storyVariant').onchange=value=>{selectedStoryVariant=Number(value.target.value)||0;syncStoryControls();};
$('storyPreviewFlag').onchange=e=>{previewStoryFlag=e.target.value;syncStoryControls();};
function updateStoryField(kind,key,value){
  const item=storySelected(kind);if(!item)return;
  item[key]=value;
  if(key==='requiresFlag'||key==='whenFlag'||key==='setFlag')
    syncAtlasControls();
  else syncStoryControls();
}
for(const [elementId,kind,key] of [
  ['storySpeaker','dialogues','speaker'],['storyText','dialogues','text'],
  ['storyRequiresFlag','dialogues','requiresFlag'],
  ['storyX','dialogues','x'],['storyY','dialogues','y'],
  ['storyW','dialogues','w'],['storyH','dialogues','h'],
  ['storyEncounterMessage','encounters','message'],
  ['storyEncounterEnemy','encounters','enemyId'],
  ['storyEncounterFlag','encounters','requiresFlag'],
  ['storyEncounterX','encounters','x'],['storyEncounterY','encounters','y'],
  ['storyEncounterW','encounters','w'],['storyEncounterH','encounters','h'],
  ['storyVariantLayer','variants','layerId'],
  ['storyVariantFlag','variants','whenFlag'],['storyVariantMode','variants','mode']
]){
  $(elementId).onchange=e=>{
    const value=['x','y','w','h'].includes(key)?Number(e.target.value):e.target.value;
    if(typeof value==='number'&&!Number.isFinite(value)){syncStoryControls();return;}
    updateStoryField(kind,key,value);
  };
}
$('storyOnce').onchange=e=>updateStoryField('dialogues','once',e.target.checked);
for(const [elementId,index,key] of [
  ['storyChoiceA',0,'label'],['storyChoiceAFlag',0,'setFlag'],
  ['storyChoiceB',1,'label'],['storyChoiceBFlag',1,'setFlag']
]){
  $(elementId).onchange=e=>{
    const d=storySelected('dialogues');if(!d)return;
    while(d.choices.length<=index){
      const i=d.choices.length;
      d.choices.push({id:'choice-'+(i+1),label:'Continue',setFlag:''});
    }
    d.choices[index][key]=e.target.value;
    syncAtlasControls();
  };
}
$('addStoryDialogue').onclick=()=>{
  const s=editStory();if(!s||s.dialogues.length>=12)return;
  s.dialogues.push({id:storyId(s.dialogues,'dialogue'),
    x:Math.min(5900,Math.max(0,scene.camera.x+300)),y:385,w:145,h:115,
    speaker:'ECHO KEEPER',text:'A story begins here.',requiresFlag:'',once:true,
    choices:[
      {id:'answer-1',label:'Restore the light',setFlag:'story-light'},
      {id:'answer-2',label:'Preserve the silence',setFlag:'story-silence'}
    ]});
  selectedStoryDialogue=s.dialogues.length-1;syncAtlasControls();
  flash('Conversation added. Set the speaker, choices, and world flags.');
};
$('removeStoryDialogue').onclick=()=>{
  const s=storyList();if(!s||!storySelected('dialogues'))return;
  s.dialogues.splice(selectedStoryDialogue,1);selectedStoryDialogue=0;
  syncAtlasControls();flash('Dialogue removed.');
};
$('addStoryEncounter').onclick=()=>{
  const s=editStory();if(!s||s.encounters.length>=12)return;
  const first=scene.playable.enemies[0];
  s.encounters.push({id:storyId(s.encounters,'guardian'),x:Math.max(0,scene.camera.x+380),
    y:390,w:120,h:110,enemyId:first?.id||'',requiresFlag:'',
    message:'A guardian has awakened.'});
  selectedStoryEncounter=s.encounters.length-1;syncAtlasControls();
  flash('Guardian zone added. Link an existing puzzle enemy.');
};
$('removeStoryEncounter').onclick=()=>{
  const s=storyList();if(!s||!storySelected('encounters'))return;
  s.encounters.splice(selectedStoryEncounter,1);selectedStoryEncounter=0;
  syncAtlasControls();flash('Guardian encounter removed.');
};
$('addStoryVariant').onclick=()=>{
  const s=editStory();if(!s||s.variants.length>=24)return;
  const flags=scene.atlas?knownWorldFlags(scene.atlas):[];
  s.variants.push({id:storyId(s.variants,'scenery'),layerId:scene.layers[0]?.id||'',
    whenFlag:flags[0]||'',mode:'reveal'});
  selectedStoryVariant=s.variants.length-1;syncAtlasControls();
  flash('Scenery rule added. Choose its layer and the flag that changes it.');
};
$('removeStoryVariant').onclick=()=>{
  const s=storyList();if(!s||!storySelected('variants'))return;
  s.variants.splice(selectedStoryVariant,1);selectedStoryVariant=0;
  syncAtlasControls();flash('Scenery rule removed.');
};
function syncBossControls(){
  const room=currentRoom(),boss=room?.boss||null;
  const core={
    bossName:boss?.name??'',bossIntro:boss?.intro??'',
    bossVictoryFlag:boss?.victoryFlag??'',bossMaxHealth:boss?.maxHealth??6,
    bossX:boss?.x??0,bossY:boss?.y??0,bossW:boss?.w??80,bossH:boss?.h??90,
    bossTriggerX:boss?.triggerX??0,bossTriggerY:boss?.triggerY??0,
    bossTriggerW:boss?.triggerW??150,bossTriggerH:boss?.triggerH??140
  };
  for(let i=1;i<=3;i++){
    const phase=boss?.phases?.[i-1];
    core['bossPhase'+i+'Name']=phase?.name??'';
    core['bossPhase'+i+'Interval']=phase?.interval??2;
    core['bossPhase'+i+'Speed']=phase?.speed??210;
    core['bossPhase'+i+'Telegraph']=phase?.telegraph??Math.min(.55,(phase?.interval??2)*.5);
    core['bossPhase'+i+'Cue']=phase?.cue??'INCOMING';
  }
  for(const [kind,count] of [['Intro',3],['Victory',2]]){
    const beats=boss?bossTimelineBeats(boss,kind.toLowerCase()):[];
    for(let i=1;i<=count;i++){
      const beat=beats[i-1];
      core['boss'+kind+'Beat'+i+'Title']=beat?.title??'BEAT '+i;
      core['boss'+kind+'Beat'+i+'Text']=beat?.text??'A new moment unfolds.';
      core['boss'+kind+'Beat'+i+'Seconds']=beat?.seconds??2;
    }
  }
  for(const [id,value] of Object.entries(core)){
    $(id).value=value;$(id).disabled=!boss;
  }
  $('addBossStage').disabled=!room||Boolean(boss);
  $('removeBossStage').disabled=!boss;
  $('bossStatus').textContent=boss?
    boss.name+' · '+boss.maxHealth+' HP · three authored phases · '+
      (boss.victoryFlag?'Defeat sets '+boss.victoryFlag:'No defeat flag')+'.':
    room?'No boss authored here. Add one to build a three-phase encounter.':
      'Create a Room Atlas to author boss encounters.';
}
$('addBossStage').onclick=()=>{
  const room=currentRoom();if(!room||room.boss)return;
  const bossX=Math.min(scene.playable.worldWidth-100,Math.max(200,scene.camera.x+380));
  const roomSlug=room.id.toLowerCase().replace(/[^a-z0-9_-]/g,'-').slice(0,40);
  room.boss=normalizeBoss({
    schema:BOSS_SCHEMA,id:'boss-'+roomSlug,name:'THE ASH WARDEN',
    intro:'The chamber remembers every traveler. Now it tests your courage.',
    x:bossX,y:410,w:80,h:90,
    triggerX:Math.max(0,bossX-155),triggerY:355,triggerW:145,triggerH:145,
    maxHealth:6,victoryFlag:'boss-'+roomSlug+'-fallen',
    phases:[
      {name:'THE FIRST VEIL',interval:2.1,speed:210,telegraph:.8,cue:'ASH ORB INCOMING'},
      {name:'THE SHADOW STIRS',interval:1.4,speed:275,telegraph:.6,cue:'SHADOW BOLT'},
      {name:'THE LAST EMBER',interval:.85,speed:345,telegraph:.35,cue:'LAST EMBER'}
    ],
    introBeats:[
      {title:'THE SILENCE',text:'A guardian awakens in the darkness.',seconds:2},
      {title:'THE GUARDIAN',text:'A challenge echoes through the chamber.',seconds:2.5},
      {title:'THE TEST',text:'Watch the warning lines and ready your stone ray.',seconds:2}
    ],
    victoryBeats:[
      {title:'THE LAST EMBER',text:'The guardian falls.',seconds:2.2},
      {title:'A NEW PATH',text:'The world remembers your courage.',seconds:2.5}
    ]
  });
  syncAtlasControls();
  flash('Boss arena created. Set its position, introduction, and phase timings.');
};
$('removeBossStage').onclick=()=>{
  const room=currentRoom();if(!room?.boss)return;
  if(!confirm('Remove this room boss and its defeat condition?'))return;
  delete room.boss;
  syncAtlasControls();flash('Boss removed. Doors requiring its old flag stay locked until updated.');
};
const bossFieldKeys={
  bossName:'name',bossIntro:'intro',bossVictoryFlag:'victoryFlag',
  bossMaxHealth:'maxHealth',bossX:'x',bossY:'y',bossW:'w',bossH:'h',
  bossTriggerX:'triggerX',bossTriggerY:'triggerY',
  bossTriggerW:'triggerW',bossTriggerH:'triggerH'
};
for(const [input,key] of Object.entries(bossFieldKeys)){
  $(input).onchange=e=>{
    const room=currentRoom();if(!room?.boss)return;
    const textual=['name','intro','victoryFlag'].includes(key);
    const value=textual?e.target.value:Number(e.target.value);
    if(!textual&&!Number.isFinite(value)){syncBossControls();return;}
    room.boss=normalizeBoss({...room.boss,[key]:value});
    if(key==='victoryFlag')syncAtlasControls();
    else syncBossControls();
  };
}
for(let i=1;i<=3;i++)for(const [suffix,key] of [
  ['Name','name'],['Interval','interval'],['Speed','speed'],
  ['Telegraph','telegraph'],['Cue','cue']
]){
  const input='bossPhase'+i+suffix;
  $(input).onchange=e=>{
    const room=currentRoom();if(!room?.boss)return;
    const textual=key==='name'||key==='cue';
    const value=textual?e.target.value:Number(e.target.value);
    if(!textual&&!Number.isFinite(value)){syncBossControls();return;}
    const phases=room.boss.phases.map(p=>({...p}));
    phases[i-1][key]=value;
    room.boss=normalizeBoss({...room.boss,phases});
    syncBossControls();
  };
}
for(const [kind,count] of [['Intro',3],['Victory',2]]){
  for(let i=1;i<=count;i++)for(const [suffix,key] of [
    ['Title','title'],['Text','text'],['Seconds','seconds']
  ]){
    $('boss'+kind+'Beat'+i+suffix).onchange=e=>{
      const room=currentRoom();if(!room?.boss)return;
      const value=key==='seconds'?Number(e.target.value):e.target.value;
      if(key==='seconds'&&!Number.isFinite(value)){syncBossControls();return;}
      const source=bossTimelineBeats(room.boss,kind.toLowerCase()).map(b=>({...b}));
      while(source.length<count){
        source.push({title:'BEAT '+(source.length+1),
          text:'A new moment unfolds.',seconds:2});
      }
      source[i-1][key]=value;
      const dataKey=kind==='Intro'?'introBeats':'victoryBeats';
      room.boss=normalizeBoss({...room.boss,[dataKey]:source});
      syncBossControls();
    };
  }
}
function directorChoices(){
  const d=scene.playable.director;
  return [
    ...d.triggers.map((x,i)=>({value:'trigger:'+i,label:(x.kind==='checkpoint'?'Checkpoint: ':x.kind==='flag'?'World flag: ':'Message: ')+x.id})),
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
    directorFlagId:[item?.flagId??'',isTrigger&&item?.kind==='flag'], 
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
  $('addFlag').disabled=d.triggers.length>=32;
  $('addCamera').disabled=d.cameras.length>=16;
  $('addLight').disabled=d.lights.length>=24;
  $('directorStatus').textContent=d.triggers.length+' event zones · '+d.cameras.length+
    ' camera regions · '+d.lights.length+' light pools · '+Math.round(d.ambient*100)+'% ambient darkness.';
  puzzlePreviewState=startPuzzle(scene);
}
$('directorObject').onchange=e=>{selectedDirector=e.target.value;syncDirectorControls();};
const directorBindings={
  directorX:'x',directorY:'y',directorW:'w',directorH:'h',
  directorKind:'kind',directorMessage:'message',directorFlagId:'flagId',directorFocus:'focus',
  directorRadius:'radius',directorIntensity:'intensity',directorColor:'color'
};
for(const [id,key] of Object.entries(directorBindings)){
  $(id).onchange=e=>{
    const {item}=activeDirector();if(!item||!(key in item))return;
    const value=['kind','message','color','flagId'].includes(key)?e.target.value:Number(e.target.value);
    if(typeof value==='number'&&!Number.isFinite(value)){syncDirectorControls();return;}
    item[key]=value;
    syncDirectorControls();
    if(key==='flagId'||key==='kind')syncAtlasControls();
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
  if(kind==='message'||kind==='checkpoint'||kind==='flag'){ 
    if(d.triggers.length>=32)return;
    const triggerId=directorNextId(kind);
    d.triggers.push({id:triggerId,kind,flagId:kind==='flag'?triggerId:'',x:baseX,y:385,w:130,h:115,
      message:kind==='checkpoint'?'BEACON ACTIVATED':kind==='flag'?'WORLD STATE CHANGED':'A NEW PASSAGE OPENS.',once:true});
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
$('addFlag').onclick=()=>{addWorldObject('flag');syncAtlasControls();};
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
function sceneJson(){commitActiveRoom();return JSON.stringify(normalizeScene(scene),null,2);}
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
  scene=createScene();activeRoomId=null;selectedPortalIndex=0;selectedId=scene.layers[3].id;elapsed=0;syncScene();
};
$('importScene').onclick=()=>$('sceneFile').click();
$('sceneFile').onchange=async e=>{
  const file=e.target.files?.[0];e.target.value='';
  if(!file)return;
  if(file.size>12_000_000){flash('Scene file too large (12 MB max).');return;}
  try{
    const parsed=JSON.parse(await file.text());
    scene=normalizeScene(parsed);activeRoomId=scene.atlas?.startRoom??null;
    if(scene.atlas)adoptActiveRoom();
    selectedId=scene.layers[0].id;elapsed=0;
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
    const visualScene=scene.atlas?storyScene({scene,atlas:scene.atlas,roomId:activeRoomId,
      worldFlags:new Set(previewStoryFlag?[previewStoryFlag]:[])}):scene;
    const visualOptions={solo:solo?selectedId:null,spread,reducedMotion};
    if(tileWorld){
      const split=scene.layers.length-1;
      renderScene(ctx,visualScene,elapsed,{...visualOptions,endLayer:split});
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
    if(currentRoom()?.boss)
      renderBossStage(ctx,{atlas:scene.atlas,roomId:activeRoomId,game:{}},scene.camera.x,
        {guides:$('bossShowGuides').checked});
    if($('storyShowGuides').checked&&currentRoom()?.story)
      renderStoryGuides(ctx,currentRoom().story,scene.camera.x);
    if($('portalPreview').checked&&scene.atlas){
      const previewSession={atlas:scene.atlas,roomId:activeRoomId,game:{keyCollected:true,time:elapsed},
        inventory:new Set(scene.atlas.rooms.flatMap(r=>(r.relics||[]).map(item=>r.id+':'+item.id)))};
      renderPortals(ctx,previewSession,scene.camera.x,{guides:true});
      renderRelics(ctx,{...previewSession,inventory:new Set()},scene.camera.x);
    }
  }
  requestAnimationFrame(tick);
}
try{
  const saved=localStorage.getItem(KEY);
  if(saved){scene=normalizeScene(JSON.parse(saved));activeRoomId=scene.atlas?.startRoom??null;
    if(scene.atlas)adoptActiveRoom();selectedId=scene.layers[0].id;}
}catch{/* Invalid older browser save: leave demo available. */}
syncScene();
if(!ctx){$('statusIndicator').textContent='CANVAS UNAVAILABLE';flash('Canvas 2D is unavailable in this browser.');}
else requestAnimationFrame(tick);
