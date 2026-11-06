// Portable, data-only World Player contract for PixelForge v6.
// The JSON contains only primitive geometry, declared collision and spawn data.
// It is not a JavaScript cartridge, an authority token, or a trusted signature.
import {validateWorld} from '../../vr-studio/world.js';
import {toPhysicsDescriptors,validatePhysicsProfile} from './vr-physics-bridge.js';

export const PLAYABLE_FORMAT='pixelforge.playable-world.v1';
export const PLAYABLE_MAX_BYTES=160000;
export const PLAYABLE_MAX_OBJECTS=160; // 128 VR source + 32 placed prefabs
const CAPABILITIES=Object.freeze({authority:'LOCAL_BROWSER_ONLY',physics:'RAPIER_PREVIEW',network:'NONE',scripts:'NONE'});
const KINDS=new Set(['floor','block','pillar','portal','platform']);
const BODIES=new Set(['fixed','dynamic','none']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const vec=(v,a,b)=>Array.isArray(v)&&v.length===3&&v.every(x=>finite(x)&&x>=a&&x<=b);
function fields(value,allowed){
  if(!plain(value)||Object.keys(value).some(k=>!allowed.includes(k)))
    throw Error('Playable world includes an unknown or unsafe data field.');
}
function checkDescriptor(item,seen){
  fields(item,['id','name','kind','color','body','friction','restitution','position','scale','yaw']);
  if(typeof item.id!=='string'||!(/^(obj-[1-9][0-9]{0,8}|placed-[1-9][0-9]{0,5})$/).test(item.id)||seen.has(item.id))
    throw Error('Invalid or duplicate playable object ID.');
  seen.add(item.id);
  if(typeof item.name!=='string'||!item.name.trim()||item.name.length>80)throw Error('Invalid playable object name.');
  if(!KINDS.has(item.kind)||!BODIES.has(item.body))throw Error('Unsupported playable geometry or rigid-body type.');
  if(typeof item.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(item.color))throw Error('Invalid playable color.');
  if(!finite(item.friction)||item.friction<0||item.friction>1||!finite(item.restitution)||item.restitution<0||item.restitution>1)
    throw Error('Invalid playable physics materials.');
  if(!vec(item.position,-100,100)||!vec(item.scale,.05,50)||!finite(item.yaw)||item.yaw< -360||item.yaw>360)
    throw Error('Invalid playable object transform.');
  return {id:item.id,name:item.name,kind:item.kind,color:item.color,body:item.body,
    friction:item.friction,restitution:item.restitution,
    position:[...item.position],scale:[...item.scale],yaw:item.yaw};
}
export function validatePlayableWorld(input){
  fields(input,['format','title','source','capabilities','gravity','spawn','objects']);
  if(input.format!==PLAYABLE_FORMAT)throw Error('Unsupported playable world version.');
  if(typeof input.title!=='string'||!input.title.trim()||input.title.length>100)
    throw Error('Playable world requires a bounded title.');
  fields(input.source,['format','sha256']);
  if(input.source.format!=='pixelforge.vr-world.v1'||typeof input.source.sha256!=='string'||
     !/^[a-f0-9]{64}$/.test(input.source.sha256))throw Error('Invalid provenance reference.');
  fields(input.capabilities,['authority','physics','network','scripts']);
  if(Object.entries(CAPABILITIES).some(([key,value])=>input.capabilities[key]!==value))
    throw Error('Playable world cannot claim privileged capabilities.');
  if(!finite(input.gravity)||input.gravity< -20||input.gravity>0)throw Error('Gravity must be between -20 and 0.');
  if(!vec(input.spawn,-100,100))throw Error('Invalid player spawn coordinates.');
  if(!Array.isArray(input.objects)||input.objects.length<1||input.objects.length>PLAYABLE_MAX_OBJECTS)
    throw Error('Playable world object count is out of bounds.');
  const seen=new Set(),objects=input.objects.map(item=>checkDescriptor(item,seen));
  if(!objects.some(o=>o.kind==='floor'&&o.body==='fixed'))
    throw Error('A walkable world needs a fixed floor.');
  return {format:PLAYABLE_FORMAT,title:input.title,
    source:{format:input.source.format,sha256:input.source.sha256},
    capabilities:{...CAPABILITIES},gravity:input.gravity,spawn:[...input.spawn],objects};
}
export function parsePlayableWorld(raw){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>PLAYABLE_MAX_BYTES)
    throw Error('Playable file must be 160 KB or smaller.');
  return validatePlayableWorld(JSON.parse(raw));
}
export function buildPlayableWorld(sourceWorld,profile,sourceHash,gravity=-9.81){
  validateWorld(sourceWorld);
  validatePhysicsProfile(profile,sourceWorld,sourceHash);
  const items=toPhysicsDescriptors(sourceWorld,profile,sourceHash)
    .filter(o=>!o.proxy)
    .map(o=>({
      id:o.id,name:o.name,kind:o.kind,color:o.color,body:o.body,
      friction:o.friction,restitution:o.restitution,
      position:[...o.position],scale:[...o.scale],yaw:o.yaw
    }));
  // Exclude private proxy asset data, including identifiers and paths.
  const floor=items.find(o=>o.kind==='floor'&&o.body==='fixed');
  if(!floor)throw Error('Add or enable a fixed floor before building a playable world.');
  const spawn=[floor.position[0],Math.min(100,floor.position[1]+floor.scale[1]/2+2.2),floor.position[2]];
  return validatePlayableWorld({format:PLAYABLE_FORMAT,title:sourceWorld.title,
    source:{format:sourceWorld.format,sha256:sourceHash},
    capabilities:{...CAPABILITIES},gravity,spawn,objects:items});
}
export function createSamplePlayableWorld(){
  // A public demo never asserts a source scene was actually hash-verified.
  return validatePlayableWorld({
    format:PLAYABLE_FORMAT,title:'The Living World · Starter Course',
    source:{format:'pixelforge.vr-world.v1',sha256:'0'.repeat(64)},
    capabilities:{...CAPABILITIES},gravity:-9.81,spawn:[0,2.2,0],
    objects:[
      {id:'obj-1',name:'Training Floor',kind:'floor',color:'#314f68',body:'fixed',friction:.85,restitution:.1,position:[0,-.15,0],scale:[18,.3,18],yaw:0},
      {id:'placed-1',name:'First Step',kind:'platform',color:'#56c7d6',body:'fixed',friction:.8,restitution:.2,position:[-3,.4,-1],scale:[2,.8,3],yaw:0},
      {id:'placed-2',name:'Pillar Gate',kind:'pillar',color:'#e9a470',body:'fixed',friction:.8,restitution:.2,position:[3,1,0],scale:[1.5,2,1.5],yaw:0},
      {id:'placed-3',name:'Floating Route',kind:'platform',color:'#aa91ee',body:'fixed',friction:.7,restitution:.1,position:[1,1.8,-4],scale:[4,.35,2],yaw:20},
      {id:'placed-4',name:'Falling Cube',kind:'block',color:'#f8cb78',body:'dynamic',friction:.7,restitution:.3,position:[0,6,-2],scale:[.8,.8,.8],yaw:0},
      {id:'placed-5',name:'Destination Marker',kind:'portal',color:'#8ff5e6',body:'none',friction:0,restitution:0,position:[6,1,-6],scale:[1.4,2,.3],yaw:0}
    ]});
}
