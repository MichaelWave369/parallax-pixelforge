// PixelForge Rung 6: closed-world declarative game rules.
// Data only. No eval, scripting, network actions, or authority escalation.
import {validateEventGraph,advanceEventGraph,dependenciesMet} from './event-graph.js';
export const GAMEPLAY_FORMAT='pixelforge.gameplay.v1';
export const MAX_PICKUPS=24;
export const MAX_TRIGGERS=12;
const MAX_RADIUS=4;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const vec=v=>Array.isArray(v)&&v.length===3&&v.every(n=>finite(n)&&n>=-100&&n<=100);
const rgba=v=>typeof v==='string'&&/^#[a-fA-F0-9]{6}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
function only(obj,keys){
  if(!plain(obj)||Object.keys(obj).some(k=>!keys.includes(k)))
    throw Error('Unknown or executable gameplay field.');
}
function text(value,max=100){
  if(typeof value!=='string'||!value.trim()||value.length>max)
    throw Error('Invalid gameplay text.');
  return value;
}
function pos(value,radius){
  if(!vec(value)||!finite(radius)||radius<.3||radius>MAX_RADIUS)
    throw Error('Gameplay marker position or radius exceeds bounds.');
  return [...value];
}
function item(value,kind,ids){
  const common=['id','name','position','radius'];
  only(value,kind==='collectible'?[...common,'color']:[...common,'message']);
  const pattern=kind==='collectible'?/^pickup-[1-9][0-9]{0,3}$/:/^trigger-[1-9][0-9]{0,3}$/;
  if(typeof value.id!=='string'||!pattern.test(value.id)||ids.has(value.id))
    throw Error('Invalid or duplicate gameplay marker ID.');
  ids.add(value.id);
  const output={id:value.id,name:text(value.name,60),position:pos(value.position,value.radius),radius:value.radius};
  if(kind==='collectible'){
    if(!rgba(value.color))throw Error('Invalid collectible color.');
    output.color=value.color;
  }else output.message=text(value.message,180);
  return output;
}
export function newGameplayRules(sourceSha){
  if(!hash(sourceSha))throw Error('Invalid source scene hash.');
  return {format:GAMEPLAY_FORMAT,source_sha256:sourceSha,collectibles:[],triggers:[],goal:null};
}
export function validateGameplayRules(value,sourceSha){
  only(value,['format','source_sha256','collectibles','triggers','goal','graph']);
  if(value.format!==GAMEPLAY_FORMAT||!hash(sourceSha)||value.source_sha256!==sourceSha)
    throw Error('Gameplay rules do not match this source scene.');
  if(!Array.isArray(value.collectibles)||value.collectibles.length>MAX_PICKUPS||
    !Array.isArray(value.triggers)||value.triggers.length>MAX_TRIGGERS)
    throw Error('Gameplay marker limit exceeded.');
  const ids=new Set();
  const collectibles=value.collectibles.map(x=>item(x,'collectible',ids));
  const triggers=value.triggers.map(x=>item(x,'trigger',ids));
  let goal=null;
  if(value.goal!==null){
    only(value.goal,['id','name','position','radius','message']);
    if(value.goal.id!=='goal-1'||ids.has(value.goal.id))throw Error('Invalid goal ID.');
    goal={id:'goal-1',name:text(value.goal.name,60),
      position:pos(value.goal.position,value.goal.radius),radius:value.goal.radius,
      message:text(value.goal.message,180)};
  }
  const graph=value.graph===undefined?null:
    validateEventGraph(value.graph,[...collectibles.map(x=>x.id),...triggers.map(x=>x.id)]);
  return {format:GAMEPLAY_FORMAT,source_sha256:sourceSha,collectibles,triggers,goal,
    ...(graph?{graph}:{})};
}
function nextId(records,prefix){
  const used=new Set(records.map(x=>x.id));
  for(let n=1;n<=9999;n++){const id=prefix+n;if(!used.has(id))return id;}
  throw Error('Gameplay identifier space exhausted.');
}
export function addGameplayMarker(rules,sourceSha,kind,position,name,message='Checkpoint reached.'){
  const v=validateGameplayRules(rules,sourceSha);
  const p=pos(position,1.25);
  if(!['collectible','trigger','goal'].includes(kind))throw Error('Unknown gameplay marker kind.');
  const label=text(name,60);
  if(kind==='collectible'){
    if(v.collectibles.length>=MAX_PICKUPS)throw Error('Collectible limit reached.');
    v.collectibles.push({id:nextId(v.collectibles,'pickup-'),name:label,position:p,radius:1.25,color:'#f9ce6d'});
  }else if(kind==='trigger'){
    if(v.triggers.length>=MAX_TRIGGERS)throw Error('Trigger limit reached.');
    v.triggers.push({id:nextId(v.triggers,'trigger-'),name:label,position:p,radius:1.25,message:text(message,180)});
  }else{
    v.goal={id:'goal-1',name:label,position:p,radius:1.5,message:text(message,180)};
  }
  return validateGameplayRules(v,sourceSha);
}
export function removeGameplayMarker(rules,sourceSha,id){
  const v=validateGameplayRules(rules,sourceSha);
  if(v.goal?.id===id)v.goal=null;
  else{
    const before=v.collectibles.length+v.triggers.length;
    v.collectibles=v.collectibles.filter(x=>x.id!==id);
    v.triggers=v.triggers.filter(x=>x.id!==id);
    if(v.collectibles.length+v.triggers.length===before)throw Error('Gameplay marker not found.');
  }
  if(v.graph){
    const prune=c=>c?{mode:c.mode,ids:c.ids.filter(x=>x!==id)}:null;
    v.graph={...v.graph,
      nodes:v.graph.nodes.map(n=>({...n,requires:prune(n.requires)})),
      doors:v.graph.doors.map(d=>({...d,requires:prune(d.requires)}))
        .filter(d=>d.requires.ids.length>0),
      goalRequires:prune(v.graph.goalRequires)};
    if(v.graph.goalRequires&&!v.graph.goalRequires.ids.length)v.graph.goalRequires=null;
  }
  return validateGameplayRules(v,sourceSha);
}
export function editGameplayMarker(rules,sourceSha,id,patch){
  const v=validateGameplayRules(rules,sourceSha);
  only(patch,['name','message','color','position','radius']);
  let matched=false;
  for(const key of ['collectibles','triggers']){
    v[key]=v[key].map(x=>{
      if(x.id!==id)return x;
      matched=true;
      return {...x,...patch};
    });
  }
  if(v.goal?.id===id){matched=true;v.goal={...v.goal,...patch};}
  if(!matched)throw Error('Gameplay marker not found.');
  return validateGameplayRules(v,sourceSha);
}
export function newGameplaySession(){
  return {collected:[],triggered:[],activated:[],openedDoors:[],won:false};
}
function near(player,mark){
  return Math.hypot(player[0]-mark.position[0],player[1]-mark.position[1],player[2]-mark.position[2])<=mark.radius;
}
export function advanceGameplaySession(rules,session,position,options={}){
  // Validate exactly once when loading, and reject mutations or malformed sessions
  // rather than allowing arbitrary event types through the runtime.
  if(!plain(rules)||rules.format!==GAMEPLAY_FORMAT||!hash(rules.source_sha256))
    throw Error('Invalid game rules.');
  if(!vec(position))throw Error('Invalid player coordinates.');
  only(options,['interact']);
  if(options.interact!==undefined&&typeof options.interact!=='boolean')throw Error('Invalid interact flag.');
  only(session,['collected','triggered','activated','openedDoors','won']);
  if(!Array.isArray(session.collected)||!Array.isArray(session.triggered)||
     (session.activated!==undefined&&!Array.isArray(session.activated))||
     (session.openedDoors!==undefined&&!Array.isArray(session.openedDoors))||
     typeof session.won!=='boolean')throw Error('Invalid game session.');
  const collectibles=new Set(rules.collectibles.map(x=>x.id));
  const triggers=new Set(rules.triggers.map(x=>x.id));
  if(session.collected.some(x=>!collectibles.has(x))||session.triggered.some(x=>!triggers.has(x)))
    throw Error('Session contains invalid marker IDs.');
  const nodeIds=new Set(rules.graph?.nodes.map(x=>x.id)||[]);
  const doorIds=new Set(rules.graph?.doors.map(x=>x.id)||[]);
  if((session.activated||[]).some(x=>!nodeIds.has(x))||
      (session.openedDoors||[]).some(x=>!doorIds.has(x)))
    throw Error('Session contains invalid event graph IDs.');
  if(session.won)return {session,events:[]};
  const collected=new Set(session.collected),triggered=new Set(session.triggered),events=[];
  for(const entry of rules.collectibles){
    if(!collected.has(entry.id)&&near(position,entry)){
      collected.add(entry.id);events.push({type:'collect',id:entry.id,text:'Collected '+entry.name});
    }
  }
  for(const entry of rules.triggers){
    if(!triggered.has(entry.id)&&near(position,entry)){
      triggered.add(entry.id);events.push({type:'trigger',id:entry.id,text:entry.message});
    }
  }
  const graphResult=rules.graph?
    advanceEventGraph(rules.graph,{...session,collected:[...collected],triggered:[...triggered]},
      position,options.interact===true):null;
  if(graphResult)events.push(...graphResult.events);
  const completed=graphResult?.active||new Set([...collected,...triggered]);
  const goalReady=rules.graph?.goalRequires?
    dependenciesMet(rules.graph.goalRequires,completed):
    collected.size===rules.collectibles.length&&triggered.size===rules.triggers.length;
  const win=Boolean(rules.goal)&&goalReady&&near(position,rules.goal);
  if(win)events.push({type:'win',id:rules.goal.id,text:rules.goal.message});
  if(!events.length)return {session,events};
  return {session:{
    collected:[...collected],triggered:[...triggered],
    activated:graphResult?.activated||session.activated||[],
    openedDoors:graphResult?.openedDoors||session.openedDoors||[],
    won:win
  },events};
}
export function markerPositionForObject(object){
  if(!plain(object)||!vec(object.position)||!vec(object.scale))throw Error('Select valid scene geometry.');
  const p=[object.position[0],Math.min(100,object.position[1]+object.scale[1]/2+.9),object.position[2]];
  return pos(p,1.25);
}
