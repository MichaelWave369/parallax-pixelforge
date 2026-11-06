// V6 read-only adapter for the existing PixelForge VR World v1 document.
// The canonical validator lives in vr-studio/world.js; this module never changes it.
import {newWorld,parseWorld,validateWorld} from '../../vr-studio/world.js';

export const PHYSICS_PROFILE_FORMAT='pixelforge.physics-sandbox.v1';
export const VR_SCENE_STORAGE_KEY='pixelforge.vr-world.v1.local';
export const MAX_SCENE_BYTES=200000;
export const MAX_PROFILE_BYTES=100000;
export const MAX_PLACED_OBJECTS=32;
export const PLACEMENT_TEMPLATES=Object.freeze({
  block:Object.freeze({label:'Block',size:Object.freeze([1,1,1]),color:'#61d9e8'}),
  platform:Object.freeze({label:'Platform',size:Object.freeze([2.5,.3,2.5]),color:'#df9d70'}),
  pillar:Object.freeze({label:'Pillar',size:Object.freeze([.7,2,.7]),color:'#b5a0fc'})
});
const MODES=new Set(['fixed','dynamic','none']);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const own=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const vec3=(a,min,max)=>Array.isArray(a)&&a.length===3&&a.every(v=>finite(v)&&v>=min&&v<=max);

export function sampleVrWorld(){return structuredClone(newWorld());}
export function parseVrScene(raw){return parseWorld(raw);}
export async function fingerprintVrWorld(world) {
  validateWorld(world);
  const bytes=new TextEncoder().encode(JSON.stringify(world));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function newPhysicsProfile(world,sceneHash){
  validateWorld(world);
  if(!/^[0-9a-f]{64}$/.test(sceneHash))throw Error('Invalid scene fingerprint.');
  return {
    format:PHYSICS_PROFILE_FORMAT,
    source_format:'pixelforge.vr-world.v1',
    source_sha256:sceneHash,
    placed:[],
    objects:world.objects.filter(o=>o.kind!=='asset-proxy').map(o=>({
      id:o.id,
      body:o.kind==='portal'?'none':'fixed',
      friction:0.8,
      restitution:0.2,
      position:[...o.position],
      scale:[...o.scale],
      yaw:o.yaw
    }))
  };
}
export function validatePhysicsProfile(value,world,sceneHash){
  validateWorld(world);
  if(!own(value)||value.format!==PHYSICS_PROFILE_FORMAT||value.source_format!=='pixelforge.vr-world.v1'
      ||value.source_sha256!==sceneHash||!/^[0-9a-f]{64}$/.test(sceneHash))throw Error('Physics profile does not match this VR scene.');
  const eligible=world.objects.filter(o=>o.kind!=='asset-proxy');
  if(!Array.isArray(value.objects)||value.objects.length!==eligible.length)throw Error('Physics profile object count mismatch.');
  const ids=new Set(eligible.map(o=>o.id)),used=new Set();
  const normalized=[];
  for(const o of value.objects){
    if(!own(o)||typeof o.id!=='string'||!ids.has(o.id)||used.has(o.id))throw Error('Unknown, duplicate, or ineligible physics object ID.');
    used.add(o.id);
    if(!MODES.has(o.body))throw Error('Unsupported rigid body mode.');
    if(!finite(o.friction)||o.friction<0||o.friction>1||!finite(o.restitution)||o.restitution<0||o.restitution>1)throw Error('Physics material values must be between 0 and 1.');
    if(!vec3(o.position,-100,100)||!vec3(o.scale,0.05,50)||!finite(o.yaw)||o.yaw < -360||o.yaw >360)throw Error('Physics transform exceeds VR World limits.');
    normalized.push({id:o.id,body:o.body,friction:o.friction,restitution:o.restitution,position:[...o.position],scale:[...o.scale],yaw:o.yaw});
  }
  // Optional placed[] preserves imports from the Rung 2/3 sidecar format.
  const sourceIds=new Set(world.objects.map(o=>o.id));
  const placed=value.placed===undefined?[]:value.placed;
  if(!Array.isArray(placed)||placed.length>MAX_PLACED_OBJECTS)throw Error('Placed object limit exceeded.');
  const placedIds=new Set();
  const cleanPlaced=placed.map(o=>{
    if(!own(o)||typeof o.id!=='string'||!/^placed-[1-9][0-9]{0,5}$/.test(o.id)
      ||placedIds.has(o.id)||sourceIds.has(o.id))throw Error('Invalid or duplicate placed object ID.');
    placedIds.add(o.id);
    if(!Object.hasOwn(PLACEMENT_TEMPLATES,o.kind))throw Error('Unsupported placed object kind.');
    if(typeof o.name!=='string'||o.name.length<1||o.name.length>80||!o.name.trim())throw Error('Invalid placed object name.');
    if(typeof o.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(o.color))throw Error('Invalid placed object color.');
    if(!MODES.has(o.body)||!finite(o.friction)||o.friction<0||o.friction>1||
       !finite(o.restitution)||o.restitution<0||o.restitution>1)throw Error('Invalid placed physics material.');
    if(!vec3(o.position,-100,100)||!vec3(o.scale,.05,50)||!finite(o.yaw)||o.yaw < -360||o.yaw>360)
      throw Error('Placed transform exceeds VR World limits.');
    return {id:o.id,name:o.name,kind:o.kind,color:o.color,body:o.body,
      friction:o.friction,restitution:o.restitution,
      position:[...o.position],scale:[...o.scale],yaw:o.yaw};
  });
  return {format:PHYSICS_PROFILE_FORMAT,source_format:'pixelforge.vr-world.v1',
    source_sha256:sceneHash,objects:normalized,placed:cleanPlaced};
}
export function editPhysicsObject(profile,world,sceneHash,id,patch){
  const current=validatePhysicsProfile(profile,world,sceneHash);
  if(!own(patch)||Object.keys(patch).some(k=>!['body','friction','restitution','position','scale','yaw'].includes(k)))throw Error('Physics edit contains an unapproved field.');
  if(![...current.objects,...current.placed].some(o=>o.id===id))throw Error('Physics object ID not found.');
  const objects=current.objects.map(o=>o.id===id?{...o,...patch}:o);
  const placed=current.placed.map(o=>o.id===id?{...o,...patch}:o);
  return validatePhysicsProfile({...current,objects,placed},world,sceneHash);
}
export function toPhysicsDescriptors(world,profile,sceneHash) {
  const clean=validatePhysicsProfile(profile,world,sceneHash);
  const config=new Map(clean.objects.map(o=>[o.id,o]));
  const canonical=world.objects.map(o=>{
    const settings=config.get(o.id);
    return {
      id:o.id,name:o.name,kind:o.kind,color:o.color,
      proxy:o.kind==='asset-proxy',
      body:settings?.body||'none',
      friction:settings?.friction??0.8,
      restitution:settings?.restitution??0.2,
      position:[...(settings?.position||o.position)],
      scale:[...(settings?.scale||o.scale)],
      yaw:settings?.yaw??o.yaw
    };
  });
  return [...canonical,...clean.placed.map(o=>({...o,proxy:false}))];
}

// Surface-grounded placement. The target MUST be a fixed, horizontal cuboid top.
// This uses the canonical scene and validated sidecar, never guessed GLB geometry.
export function placeOnSurface(profile,world,sceneHash,kind,surface,snap=.25){
  const current=validatePhysicsProfile(profile,world,sceneHash);
  if(!Object.hasOwn(PLACEMENT_TEMPLATES,kind))throw Error('Unknown placement prefab.');
  if(![0,.1,.25,.5,1].includes(snap))throw Error('Unsupported placement snap step.');
  if(current.placed.length>=MAX_PLACED_OBJECTS)throw Error('Placed object limit reached.');
  if(!own(surface)||typeof surface.targetId!=='string'||!vec3(surface.point,-100,100)
      ||!vec3(surface.normal,-1,1))throw Error('Invalid placement hit.');
  const n=surface.normal;
  if(Math.hypot(...n)<.99||Math.hypot(...n)>1.01||n[1]<.93)throw Error('Only upward horizontal surfaces support placement.');
  const target=toPhysicsDescriptors(world,current,sceneHash).find(o=>o.id===surface.targetId);
  if(!target||target.proxy||target.body!=='fixed')throw Error('Placement target must be an approved fixed collider.');
  const [tx,ty,tz]=target.position,[sx,sy,sz]=target.scale;
  const dx=surface.point[0]-tx,dz=surface.point[2]-tz;
  const a=target.yaw*Math.PI/180;
  const localX=Math.cos(a)*dx-Math.sin(a)*dz;
  const localZ=Math.sin(a)*dx+Math.cos(a)*dz;
  const top=ty+sy/2;
  if(Math.abs(surface.point[1]-top)>.08||
      Math.abs(localX)>sx/2+.04||Math.abs(localZ)>sz/2+.04)
    throw Error('Placement must hit the top face of the target collider.');
  const template=PLACEMENT_TEMPLATES[kind];
  const snapTo=n=>Math.round(n*1e6)/1e6;
  const atX=snap? snapTo(Math.round(surface.point[0]/snap)*snap):surface.point[0];
  const atZ=snap? snapTo(Math.round(surface.point[2]/snap)*snap):surface.point[2];
  const atY=snapTo(top+template.size[1]/2);
  if(!vec3([atX,atY,atZ],-100,100))throw Error('New object exceeds VR World bounds.');
  const largest=Math.max(0,...current.placed.map(o=>Number(o.id.slice(7))));
  const id='placed-'+(largest+1);
  const obj={id,name:template.label+' '+(largest+1),kind,
    color:template.color,body:'fixed',friction:.8,restitution:.2,
    position:[atX,atY,atZ],scale:[...template.size],yaw:0};
  return {id,profile:validatePhysicsProfile({...current,placed:[...current.placed,obj]},world,sceneHash)};
}
export function removePlacedObject(profile,world,sceneHash,id){
  const current=validatePhysicsProfile(profile,world,sceneHash);
  if(!current.placed.some(o=>o.id===id))throw Error('Only sandbox placed objects can be deleted.');
  return validatePhysicsProfile({...current,placed:current.placed.filter(o=>o.id!==id)},world,sceneHash);
}
