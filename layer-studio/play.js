import {createScene, normalizeScene, renderScene} from './engine.js';
import {startPuzzle,stepPuzzle,renderPuzzle,renderPuzzleHud,cameraFor} from './puzzle.js';
import {renderDirectorLighting} from './world-director.js';
import {createWorldSession,stepWorldSession,renderPortals,renderPortalPrompt,renderRelics,atlasMapData} from './room-atlas.js';
import {writeSaveSlot,readSaveSlot,inspectSaveSlot,deleteSaveSlot,SLOT_COUNT} from './adventure-journal.js';

const $=id=>document.getElementById(id);
const SCENE_KEY='pixelforge.layer-studio.play-scene.v1';
const SAVE_KEY='pixelforge.layer-scene.v1.local';
const canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function loadScene(){
  for(const [storage,key] of [[sessionStorage,SCENE_KEY],[localStorage,SAVE_KEY]]){
    try{
      const raw=storage.getItem(key);
      if(raw)return normalizeScene(JSON.parse(raw));
    }catch{/* An invalid or inaccessible saved scene never prevents play. */}
  }
  return createScene();
}
const rootScene=loadScene();
let session=createWorldSession(rootScene);
let scene=session.scene,game=session.game,paused=false;
let activePanel='';
function fitCanvas(){
  canvas.width=scene.width;canvas.height=scene.height;
  canvas.style.aspectRatio=scene.width+' / '+scene.height;
  $('touchInteract').hidden=!session.atlas;
}
fitCanvas();
const keys=new Set(),touch=new Set(),edge={jump:false,fire:false,interact:false};
let lastJumpPad=false,lastFirePad=false,lastInteractPad=false;
const controlKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space','Enter','KeyF','KeyK','KeyR','KeyP','KeyE','KeyM','KeyI','KeyJ','Escape']);
function setMessage(s){if($('message').textContent!==s)$('message').textContent=s;}
function reset(){
  session=createWorldSession(rootScene);
  game=session.game;scene=session.scene;fitCanvas();
  paused=false;edge.jump=false;edge.fire=false;edge.interact=false;
  $('pause').textContent='Pause';
  closePanel();
  setMessage('Aim across the chasm. A stone spirit can carry your weight.');
}
function togglePause(){
  if(game.status==='won')return;
  paused=!paused;
  $('pause').textContent=paused?'Resume':'Pause';
  setMessage(paused?'Paused. Press P or Resume to continue.':'Keep moving toward the key and the cathedral gate.');
}
$('restart').onclick=reset;
$('pause').onclick=togglePause;
window.addEventListener('keydown',e=>{
  if(controlKeys.has(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Escape'&&activePanel){closePanel();return;}
  if(e.code==='KeyM'){togglePanel('map');return;}
  if(e.code==='KeyI'){togglePanel('inventory');return;}
  if(e.code==='KeyJ'){togglePanel('saves');return;}
  if(activePanel)return;
  keys.add(e.code);
  if(['ArrowUp','KeyW','Space'].includes(e.code))edge.jump=true;
  if(['KeyF','KeyK','Enter'].includes(e.code))edge.fire=true;
  if(e.code==='KeyE')edge.interact=true;
  if(e.code==='KeyR')reset();
  if(e.code==='KeyP')togglePause();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touch.clear();edge.jump=false;edge.fire=false;edge.interact=false;});
function bindHold(id,action) {
  const el=$(id);
  el.addEventListener('pointerdown',e=>{
    e.preventDefault();el.setPointerCapture(e.pointerId);
    touch.add(action);el.classList.add('active');
    if(action==='jump'||action==='fire'||action==='interact')edge[action]=true;
  });
  function release(){
    touch.delete(action);el.classList.remove('active');
  }
  el.addEventListener('pointerup',release);
  el.addEventListener('pointercancel',release);
  el.addEventListener('lostpointercapture',release);
}
for(const [id,action] of [
  ['touchLeft','left'],['touchRight','right'],
  ['touchJump','jump'],['touchFire','fire'],['touchInteract','interact']
])bindHold(id,action);
function pollPad(){
  let pads=[];
  try{pads=navigator.getGamepads?.()||[];}catch{pads=[];}
  const pad=Array.from(pads).find(Boolean);
  if(!pad){lastJumpPad=false;lastFirePad=false;lastInteractPad=false;return {left:false,right:false};}
  const ax=pad.axes?.[0]??0;
  const jump=Boolean(pad.buttons?.[0]?.pressed);
  const fire=Boolean(pad.buttons?.[1]?.pressed || pad.buttons?.[5]?.pressed || pad.buttons?.[7]?.pressed);
  const interact=Boolean(pad.buttons?.[2]?.pressed);
  if(jump&&!lastJumpPad)edge.jump=true;
  if(fire&&!lastFirePad)edge.fire=true;
  if(interact&&!lastInteractPad)edge.interact=true;
  lastJumpPad=jump;lastFirePad=fire;lastInteractPad=interact;
  return {left:ax<-.28||Boolean(pad.buttons?.[14]?.pressed),right:ax>.28||Boolean(pad.buttons?.[15]?.pressed)};
}
function controls(pad){
  return {
    left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left')||pad.left,
    right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right')||pad.right,
    jumpPressed:edge.jump,
    firePressed:edge.fire,
    interactPressed:edge.interact
  };
}
function updateMessage(old){
  if(game.status==='won')setMessage('VAULT CLEARED! The stone bridge led you to the key and the exit.');
  else if(!old.keyCollected&&game.keyCollected)setMessage('KEY ACQUIRED. The cathedral gate is unlocked. Head right!');
  else if(old.petrified!==game.petrified)setMessage('PETRIFIED! The spirit is now a solid stone platform. Jump onto it.');
  else if(old.inventoryCount!==session.inventory.size)setMessage(session.notice);
  else if(old.deaths!==game.deaths)setMessage(game.checkpoint?'Returned to the activated beacon.':'Back to the courtyard. The statues and key remain until restart.');
  else if(old.health!==game.health)setMessage('A spirit struck you! Keep some distance and fire your stone ray.');
  else if(old.eventVersion!==game.eventVersion)setMessage(game.eventMessage);
}
function clearMovement(){
  keys.clear();touch.clear();
  edge.jump=false;edge.fire=false;edge.interact=false;
  for(const button of document.querySelectorAll('.touch-controls button'))button.classList.remove('active');
}
function closePanel(){
  activePanel='';
  $('journalPanel').hidden=true;
  clearMovement();
  last=0;accumulator=0;
}
function togglePanel(name){
  if(activePanel===name){closePanel();return;}
  activePanel=name;
  clearMovement();
  last=0;accumulator=0;
  renderPanel();
}
function element(tag,klass,label){
  const node=document.createElement(tag);
  if(klass)node.className=klass;
  if(label!=null)node.textContent=String(label);
  return node;
}
function renderPanel(){
  const panel=$('journalPanel'),content=$('journalContent');
  panel.hidden=false;content.replaceChildren();
  if(activePanel==='map'){
    $('journalTitle').textContent='World Map';
    if(!session.atlas){
      content.append(element('p','journal-empty','This is a single-room adventure. Add a Room Atlas in Layer Studio to reveal connected locations.'));
      return;
    }
    const map=atlasMapData(session);
    content.append(element('p','journal-note',
      'Visited rooms are named. Unvisited rooms stay mysterious. The map is a guide, not a teleport.'));
    const grid=element('div','map-grid');
    for(const room of map.rooms){
      const card=element('div','map-room'+(room.active?' active':'')+(!room.visited?' unknown':''));
      card.append(element('strong',null,room.active?'◆ '+room.title:room.visited?room.title:'Unexplored chamber'));
      card.append(element('small',null,room.active?'CURRENT ROOM':room.visited?'VISITED':'UNEXPLORED'));
      if(room.visited)card.append(element('span',null,
        room.collected+'/'+room.total+' relics · '+room.portals+' doors'));
      grid.append(card);
    }
    content.append(grid);
    content.append(element('h3',null,'Passages'));
    for(const edge of map.edges.filter(e=>map.rooms.find(r=>r.id===e.from)?.visited)){
      const destination=map.rooms.find(r=>r.id===edge.to);
      const current=map.rooms.find(r=>r.id===edge.from);
      content.append(element('p','map-edge',current?.title+' → '+
        (destination?.visited?destination.title:'Unexplored chamber')+
        (edge.requiresKey?' · room key':'')+
        (edge.requiresRelic?' · relic gate':'')));
    }
  }else if(activePanel==='inventory'){
    $('journalTitle').textContent='Inventory';
    if(!session.atlas){
      content.append(element('p','journal-empty','The single-room challenge has its usual local gate key. Create a Room Atlas to collect persistent relics.'));
      return;
    }
    content.append(element('p','journal-note','The current room key does not travel. Relics stay with you between rooms.'));
    content.append(element('p','inventory-key',game.keyCollected?'CURRENT ROOM KEY: FOUND':'CURRENT ROOM KEY: NOT FOUND'));
    const found=[];
    for(const room of session.atlas.rooms)for(const relic of room.relics||[]){
      if(session.inventory.has(room.id+':'+relic.id))found.push({relic,room});
    }
    const max=session.atlas.rooms.reduce((n,r)=>n+(r.relics?.length||0),0);
    content.append(element('h3',null,'Relics '+found.length+' / '+max));
    if(!found.length)content.append(element('p','journal-empty','Your relic pouch is empty. Explore glowing pickups in the world.'));
    for(const entry of found){
      const row=element('div','relic-card');
      row.append(element('strong',null,'✦ '+entry.relic.name));
      row.append(element('small',null,'FOUND IN '+entry.room.title.toUpperCase()));
      content.append(row);
    }
  }else if(activePanel==='saves'){
    $('journalTitle').textContent='Save Journal';
    content.append(element('p','journal-note',
      'Three manual local save slots for this exact authored adventure. Slots are stored in this browser only. Changing the authored world creates a different set of slots.'));
    for(let n=1;n<=SLOT_COUNT;n++){
      const row=element('div','save-row'),info=element('div','save-info'),actions=element('div','save-actions');
      let record;
      try{record=inspectSaveSlot(localStorage,rootScene,n);}
      catch(err){content.replaceChildren(element('p','journal-error','Browser storage unavailable: '+err.message));return;}
      info.append(element('strong',null,'SLOT '+n));
      info.append(element('small',null,
        record?.corrupt?'Invalid or corrupt save':record?
        (rootScene.atlas?.rooms.find(r=>r.id===record.roomId)?.title||rootScene.title)+' · '+
          new Date(record.when).toLocaleString()+' · '+record.relics+' relics':
        'Empty slot'));
      const save=element('button',null,'Save');
      save.onclick=()=>{
        try{
          if(record&&!window.confirm('Overwrite save slot '+n+'?'))return;
          writeSaveSlot(localStorage,rootScene,session,n);
          setMessage('ADVENTURE SAVED TO LOCAL SLOT '+n+'.');renderPanel();
        }catch(err){setMessage('SAVE FAILED: '+err.message);renderPanel();}
      };
      actions.append(save);
      const load=element('button',null,'Load');load.disabled=!record||record.corrupt;
      load.onclick=()=>{
        try{
          const restored=readSaveSlot(localStorage,rootScene,n);
          if(!restored)throw Error('This save slot is empty.');
          session=restored;game=session.game;scene=session.scene;
          fitCanvas();paused=false;$('pause').textContent='Pause';
          closePanel();setMessage('ADVENTURE RESTORED FROM SLOT '+n+'.');
        }catch(err){setMessage('LOAD FAILED: '+err.message);}
      };
      actions.append(load);
      const remove=element('button','danger','Delete');
      remove.disabled=!record;
      remove.onclick=()=>{
        if(!window.confirm('Delete local save slot '+n+'?'))return;
        try{deleteSaveSlot(localStorage,rootScene,n);renderPanel();}
        catch(err){setMessage('DELETE FAILED: '+err.message);}
      };
      actions.append(remove);
      row.append(info,actions);content.append(row);
    }
  }
}
$('mapButton').onclick=()=>togglePanel('map');
$('inventoryButton').onclick=()=>togglePanel('inventory');
$('journalButton').onclick=()=>togglePanel('saves');
$('closeJournal').onclick=closePanel;
let last=0,accumulator=0;
const STEP=1/60;
function frame(now) {
  const dt=last?Math.min((now-last)/1000,.08):0;
  last=now;
  const pad=pollPad();
  if(!paused&&!activePanel&&game.status==='playing'){
    accumulator+=dt;
    let runs=0;
    while(accumulator>=STEP && runs<6){
      const before={health:game.health,deaths:game.deaths,petrified:game.petrified,keyCollected:game.keyCollected,eventVersion:game.eventVersion,inventoryCount:session.inventory.size};
      const outcome=stepWorldSession(session,controls(pad),STEP);
      game=session.game;
      if(outcome.travelled){scene=session.scene;fitCanvas();setMessage('ENTERED '+scene.title.toUpperCase()+'. EXPLORE THE NEW ROOM.');}
      else if(outcome.denied)setMessage(session.notice);
      edge.jump=false;edge.fire=false;edge.interact=false;
      if(!outcome.travelled&&!outcome.denied)updateMessage(before);
      accumulator-=STEP;runs++;
    }
    if(runs>=6)accumulator=0;
  }else{
    accumulator=0;
    // Ignore queued actions while paused or after victory, so resuming cannot fire unexpectedly.
    edge.jump=false;edge.fire=false;edge.interact=false;
  }
  if(ctx){
    const cam=cameraFor(game,scene.width);
    const split=scene.layers.length-1;
    renderScene(ctx,scene,game.time,{cameraX:cam,endLayer:split,reducedMotion});
    renderPuzzle(ctx,game,{cameraX:cam,width:scene.width,height:scene.height,reducedMotion,hud:false});
    renderRelics(ctx,session,cam);
    renderPortals(ctx,session,cam);
    renderScene(ctx,scene,game.time,{cameraX:cam,startLayer:split,clear:false,reducedMotion});
    renderDirectorLighting(ctx,game.puzzle.director,cam,scene.width,scene.height);
    renderPuzzleHud(ctx,game,{width:scene.width,height:scene.height});
    renderPortalPrompt(ctx,session,scene.width,scene.height);
    if(paused){
      ctx.save();ctx.fillStyle='#061522bb';ctx.fillRect(0,0,scene.width,scene.height);
      ctx.fillStyle='#fff0cd';ctx.font='bold 35px ui-monospace,monospace';
      ctx.textAlign='center';ctx.fillText('PAUSED',scene.width/2,scene.height/2);
      ctx.restore();
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
