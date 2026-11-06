// Pure, bounded transaction at the boundary between Three.js editor handles
// and the existing scene-bound PixelForge physics sidecar. No VR source mutation.
import {editPhysicsObject,validatePhysicsProfile} from './vr-physics-bridge.js';

export const GIZMO_MODES=Object.freeze(['inspect','translate','rotate','scale']);
export const GIZMO_SNAPS=Object.freeze({
  translation:Object.freeze([0,.1,.25,.5,1]),
  rotation:Object.freeze([0,5,15,30,45]),
  scale:Object.freeze([0,.05,.1,.25,.5])
});
export const DEFAULT_GIZMO_SNAP=Object.freeze({translation:.25,rotation:15,scale:.1});

const own=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
function round6(value){
  const n=Math.round(value*1e6)/1e6;
  return Object.is(n,-0)?0:n;
}
export function validateGizmoSnap(snap){
  if(!own(snap))throw Error('Missing gizmo snap configuration.');
  for(const key of Object.keys(GIZMO_SNAPS)){
    if(!GIZMO_SNAPS[key].includes(snap[key]))throw Error('Unsupported '+key+' snap step.');
  }
  return {translation:snap.translation,rotation:snap.rotation,scale:snap.scale};
}
export function snappedValue(value,step){
  if(!finite(value)||!finite(step)||step<0)throw Error('Nonfinite or invalid transform input.');
  return round6(step===0?value:Math.round(value/step)*step);
}
function vector(value){
  if(!Array.isArray(value)||value.length!==3||!value.every(finite))
    throw Error('Transform must contain three finite coordinates.');
  return value;
}
export function normalizeYaw(degrees){
  if(!finite(degrees)||Math.abs(degrees)>1000000)throw Error('Invalid yaw degrees.');
  return round6(((degrees+180)%360+360)%360-180);
}
export function applyGizmoTransform(profile,world,sceneHash,id,mode,raw,snaps=DEFAULT_GIZMO_SNAP){
  const config=validateGizmoSnap(snaps);
  if(!['translate','rotate','scale'].includes(mode))throw Error('Select an editable gizmo mode.');
  if(!own(raw))throw Error('Missing gizmo transform.');
  if(Object.keys(raw).some(key=>!['position','yaw','scale'].includes(key)))throw Error('Unapproved gizmo transform field.');
  const profileBefore=validatePhysicsProfile(profile,world,sceneHash);
  const selected=profileBefore.objects.find(o=>o.id===id);
  if(!selected)throw Error('This scene object has no editable collision profile.');
  let patch;
  if(mode==='translate'){
    const values=vector(raw.position);
    if(values.some(n=>n < -100||n > 100))throw Error('Translation exceeds VR World scene limits.');
    patch={position:values.map(n=>snappedValue(n,config.translation))};
  }else if(mode==='rotate'){
    patch={yaw:snappedValue(normalizeYaw(raw.yaw),config.rotation)};
    patch.yaw=normalizeYaw(patch.yaw);
  }else{
    const values=vector(raw.scale);
    if(values.some(n=>n < .05||n >50))throw Error('Scale exceeds VR World scene limits.');
    patch={scale:values.map(n=>snappedValue(n,config.scale))};
    if(patch.scale.some(n=>n<.05))throw Error('Scale cannot collapse to zero.');
  }
  return editPhysicsObject(profileBefore,world,sceneHash,id,patch);
}
