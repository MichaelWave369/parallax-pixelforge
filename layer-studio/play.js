import {createScene, normalizeScene, renderScene} from './engine.js';
import {startPuzzle,stepPuzzle,renderPuzzle,renderPuzzleHud,cameraFor} from './puzzle.js';
import {renderDirectorLighting} from './world-director.js';

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
const scene=loadScene();
canvas.width=scene.width;canvas.height=scene.height;
canvas.style.aspectRatio=scene.width+' / '+scene.height;
let game=startPuzzle(scene),paused=false;
const keys=new Set(),touch=new Set(),edge={jump:false,fire:false};
let lastJumpPad=false,lastFirePad=false;
const controlKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space','Enter','KeyF','KeyK','KeyR','KeyP']);
function setMessage(s){if($('message').textContent!==s)$('message').textContent=s;}
function reset(){
  game=startPuzzle(scene);paused=false;edge.jump=false;edge.fire=false;
  $('pause').textContent='Pause';
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
  keys.add(e.code);
  if(['ArrowUp','KeyW','Space'].includes(e.code))edge.jump=true;
  if(['KeyF','KeyK','Enter'].includes(e.code))edge.fire=true;
  if(e.code==='KeyR')reset();
  if(e.code==='KeyP')togglePause();
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touch.clear();edge.jump=false;edge.fire=false;});
function bindHold(id,action) {
  const el=$(id);
  el.addEventListener('pointerdown',e=>{
    e.preventDefault();el.setPointerCapture(e.pointerId);
    touch.add(action);el.classList.add('active');
    if(action==='jump'||action==='fire')edge[action]=true;
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
  ['touchJump','jump'],['touchFire','fire']
])bindHold(id,action);
function pollPad(){
  let pads=[];
  try{pads=navigator.getGamepads?.()||[];}catch{pads=[];}
  const pad=Array.from(pads).find(Boolean);
  if(!pad){lastJumpPad=false;lastFirePad=false;return {left:false,right:false};}
  const ax=pad.axes?.[0]??0;
  const jump=Boolean(pad.buttons?.[0]?.pressed);
  const fire=Boolean(pad.buttons?.[1]?.pressed || pad.buttons?.[5]?.pressed || pad.buttons?.[7]?.pressed);
  if(jump&&!lastJumpPad)edge.jump=true;
  if(fire&&!lastFirePad)edge.fire=true;
  lastJumpPad=jump;lastFirePad=fire;
  return {left:ax<-.28||Boolean(pad.buttons?.[14]?.pressed),right:ax>.28||Boolean(pad.buttons?.[15]?.pressed)};
}
function controls(pad){
  return {
    left:keys.has('ArrowLeft')||keys.has('KeyA')||touch.has('left')||pad.left,
    right:keys.has('ArrowRight')||keys.has('KeyD')||touch.has('right')||pad.right,
    jumpPressed:edge.jump,
    firePressed:edge.fire
  };
}
function updateMessage(old){
  if(game.status==='won')setMessage('VAULT CLEARED! The stone bridge led you to the key and the exit.');
  else if(!old.keyCollected&&game.keyCollected)setMessage('KEY ACQUIRED. The cathedral gate is unlocked. Head right!');
  else if(old.petrified!==game.petrified)setMessage('PETRIFIED! The spirit is now a solid stone platform. Jump onto it.');
  else if(old.deaths!==game.deaths)setMessage(game.checkpoint?'Returned to the activated beacon.':'Back to the courtyard. The statues and key remain until restart.');
  else if(old.health!==game.health)setMessage('A spirit struck you! Keep some distance and fire your stone ray.');
  else if(old.eventVersion!==game.eventVersion)setMessage(game.eventMessage);
}
let last=0,accumulator=0;
const STEP=1/60;
function frame(now) {
  const dt=last?Math.min((now-last)/1000,.08):0;
  last=now;
  const pad=pollPad();
  if(!paused&&game.status==='playing'){
    accumulator+=dt;
    let runs=0;
    while(accumulator>=STEP && runs<6){
      const before={health:game.health,deaths:game.deaths,petrified:game.petrified,keyCollected:game.keyCollected,eventVersion:game.eventVersion};
      stepPuzzle(game,controls(pad),STEP);
      edge.jump=false;edge.fire=false;
      updateMessage(before);
      accumulator-=STEP;runs++;
    }
    if(runs>=6)accumulator=0;
  }else{
    accumulator=0;
    // Ignore queued actions while paused or after victory, so resuming cannot fire unexpectedly.
    edge.jump=false;edge.fire=false;
  }
  if(ctx){
    const cam=cameraFor(game,scene.width);
    const split=scene.layers.length-1;
    renderScene(ctx,scene,game.time,{cameraX:cam,endLayer:split,reducedMotion});
    renderPuzzle(ctx,game,{cameraX:cam,width:scene.width,height:scene.height,reducedMotion,hud:false});
    renderScene(ctx,scene,game.time,{cameraX:cam,startLayer:split,clear:false,reducedMotion});
    renderDirectorLighting(ctx,game.puzzle.director,cam,scene.width,scene.height);
    renderPuzzleHud(ctx,game,{width:scene.width,height:scene.height});
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
