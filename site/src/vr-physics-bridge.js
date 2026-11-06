// V6 read-only adapter for the existing PixelForge VR World v1 document.
// The canonical validator lives in vr-studio/world.js; this module never changes it.
import {newWorld,parseWorld,validateWorld} from '../../vr-studio/world.js';

export const PHYSICS_PROFILE_FORMAT='pixelforge.physics-sandbox.v1';
export const VR_SCENE_STORAGE_KEY='pixelforge.vr-world.v1.local';
export const MAX_SCENE_BYTES=200000;
export const MAX_PROFILE_BYTES=100000;
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
  return {format:PHYSICS_PROFILE_FORMAT,source_format:'pixelforge.vr-world.v1',source_sha256:sceneHash,objects:normalized};
}
export function editPhysicsObject(profile,world,sceneHash,id,patch){
  const current=validatePhysicsProfile(profile,world,sceneHash);
  if(!own(patch)||Object.keys(patch).some(k=>!['body','friction','restitution','position','scale','yaw'].includes(k)))throw Error('Physics edit contains an unapproved field.');
  if(!current.objects.some(o=>o.id===id))throw Error('Physics object ID not found.');
  const objects=current.objects.map(o=>o.id===id?{...o,...patch}:o);
  return validatePhysicsProfile({...current,objects},world,sceneHash);
}
export function toPhysicsDescriptors(world,profile,sceneHash) {
  const clean=validatePhysicsProfile(profile,world,sceneHash);
  const config=new Map(clean.objects.map(o=>[o.id,o]));
  return world.objects.map(o=>{
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
}
