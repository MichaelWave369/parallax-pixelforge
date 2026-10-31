// PixelForge Layer Studio / Rung 11: Cinematic Director.
// Screen-space camera and lighting transitions only, never changes gameplay state.
// The controller is ephemeral: room saves retain existing boss/quest progress only.
const clamp=(v,fallback,min,max)=>{
  const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
};
const focusOptions=new Set(['player','boss','room']);
export const CINEMATIC_FOCUS=['player','boss','room'];
export function normalizeCinematicCue(beat){
  const out={};
  if(focusOptions.has(beat?.camera))out.camera=beat.camera;
  if(beat?.ambient!=null)out.ambient=clamp(beat.ambient,.35,0,.8);
  if(beat?.focusX!=null)out.focusX=clamp(beat.focusX,0,0,6000);
  if(beat?.cue!=null&&typeof beat.cue==='string')out.cue=beat.cue.slice(0,80);
  return out;
}
function targetX(beat,session){
  const viewport=clamp(session.scene.width,960,100,2500);
  const worldWidth=clamp(session.game?.puzzle?.worldWidth,viewport,viewport,12000);
  const max=Math.max(0,worldWidth-viewport);
  const player=session.game?.player;
  const def=session.atlas?.rooms.find(r=>r.id===session.roomId)?.boss;
  const focus=focusOptions.has(beat?.camera)?beat.camera:'player';
  const center=beat?.focusX!=null?clamp(beat.focusX,worldWidth/2,0,worldWidth):
    focus==='boss'&&def?def.x+def.w/2:focus==='room'?worldWidth/2:
    player?player.x+player.w/2:viewport/2;
  return clamp(center-viewport/2,0,0,max);
}
export function createCinematicDirector(session,timeline,baseCamera){
  const baseAmbient=clamp(session.game?.puzzle?.director?.ambient,0,0,.8);
  return {timeline,cameraX:clamp(baseCamera,0,0,12000),
    ambient:baseAmbient,baseAmbient,beatIndex:timeline?.index??0,
    cue:''};
}
export function stepCinematicDirector(director,session,dt=1/60,{reducedMotion=false}={}){
  if(!director)return null;
  const beat=director.timeline?.beats?.[director.timeline.index];
  if(!beat)return {cameraX:director.cameraX,ambient:director.ambient,cue:''};
  const targetCamera=targetX(beat,session);
  const ambient=beat.ambient??director.baseAmbient;
  const seconds=clamp(dt,0,0,.2);
  const easing=reducedMotion?1:1-Math.exp(-3.5*seconds);
  director.cameraX+=(targetCamera-director.cameraX)*easing;
  director.ambient+=(ambient-director.ambient)*easing;
  director.beatIndex=director.timeline.index;
  director.cue=beat.cue||'';
  return {cameraX:director.cameraX,ambient:director.ambient,cue:director.cue,
    focus:beat.camera||'player'};
}
export function cinematicView(director){
  return director?{cameraX:director.cameraX,ambient:director.ambient,
    cue:director.cue||''}:null;
}
