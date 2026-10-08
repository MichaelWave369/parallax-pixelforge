// PixelForge v5.39: desktop-only bounded rotate and scale tools.
// Pure projection and transform math. Scene authority remains governed by world.js.
import {projectWorldPoint,gizmoHandles,findGizmoHandle} from './viewport-tools.js';
const finite=Number.isFinite;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const round=(n,step)=>Math.round(n/step)*step;
const validSnap=(step,min,max)=>finite(step)&&step>=min&&step<=max;
const validScale=(scale)=>Array.isArray(scale)&&scale.length===3&&scale.every(v=>finite(v)&&v>=.05&&v<=50);

// Yaw-only ring: schema v1 intentionally has no pitch or roll.
export function rotationRing(camera,position,width,height) {
  const center=projectWorldPoint(camera,position,width,height);
  if(!center||!center.visible)return null;
  const radius=clamp(camera.distance*.1,.6,3);
  const points=[];
  for(let i=0;i<=64;i++) {
    const theta=2*Math.PI*i/64;
    const p=[position[0]+Math.cos(theta)*radius,
      position[1],position[2]+Math.sin(theta)*radius];
    const q=projectWorldPoint(camera,p,width,height);
    if(!q||!finite(q.x)||!finite(q.y))return null;
    points.push({x:q.x,y:q.y});
  }
  const extent=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  // A near-edge-on ring is not draggable: provide inspector buttons instead.
  if(extent<10)return null;
  return {points,center:{x:center.x,y:center.y},radius};
}
export function findRotationRing(ring,x,y) {
  if(!ring||![x,y].every(finite))return false;
  if(Math.hypot(x-ring.center.x,y-ring.center.y)<10)return false;
  for(let i=1;i<ring.points.length;i++){
    const a=ring.points[i-1],b=ring.points[i];
    const dx=b.x-a.x,dy=b.y-a.y,denom=dx*dx+dy*dy;
    if(denom<1e-8)continue;
    const t=clamp(((x-a.x)*dx+(y-a.y)*dy)/denom,0,1);
    if(Math.hypot(x-(a.x+t*dx),y-(a.y+t*dy))<=12)return true;
  }
  return false;
}
export function draggedYaw(startYaw,dx,snap=15) {
  if(![startYaw,dx].every(finite)||startYaw< -360||startYaw>360||
     !validSnap(snap,1,90))throw Error('Invalid rotate request.');
  // Screen-space scrub: 2 px per degree, quantized to selected angle snap.
  // Quantize delta rather than existing yaw, so an unsnapped starting
  // orientation remains unchanged if the gesture has not moved.
  const change=round(dx*.5,snap);
  return clamp(Math.round((startYaw+change)*1000)/1000,-360,360);
}
export function scaleHandles(camera,position,width,height) {
  const axes=gizmoHandles(camera,position,width,height);
  if(!axes)return null;
  // Reuse the same projected world axes as move mode, but present square
  // endpoints and a diamond at the center for uniform scale.
  return axes;
}
export function findScaleHandle(handles,x,y) {
  if(!handles||!handles.length||![x,y].every(finite))return null;
  const center=handles[0].from;
  if(Math.hypot(x-center.x,y-center.y)<=12)
    return {axis:'uniform',from:center,to:center,worldLength:1};
  return findGizmoHandle(handles,x,y);
}
export function draggedScale(initial,handle,dx,dy,snap=.1) {
  if(!validScale(initial)||!handle||![dx,dy].every(finite)||
     !validSnap(snap,.01,5))throw Error('Invalid scale request.');
  const next=[...initial];
  let factor=0;
  if(handle.axis==='uniform') {
    // Drag upward to enlarge, downward to shrink.
    factor=-dy/120;
  } else {
    const index={x:0,y:1,z:2}[handle.axis];
    if(index===undefined)throw Error('Invalid scale axis.');
    const vx=handle.to.x-handle.from.x,vy=handle.to.y-handle.from.y;
    const mag=vx*vx+vy*vy;
    if(mag<16||!finite(handle.worldLength)||handle.worldLength<=0)
      return next;
    factor=(dx*vx+dy*vy)/mag;
  }
  // Preserve the initial scale for tiny movements; only the delta snaps.
  if(handle.axis==='uniform'){
    return next.map(value=>clamp(Math.round((value+round(value*factor,snap))*10000)/10000,.05,50));
  }
  const i={x:0,y:1,z:2}[handle.axis];
  next[i]=clamp(Math.round((next[i]+round(next[i]*factor,snap))*10000)/10000,.05,50);
  return next;
}
export function steppedScale(initial,axis,direction,step=.1) {
  if(!validScale(initial)||!['x','y','z','uniform'].includes(axis)||
     ![-1,1].includes(direction)||!validSnap(step,.01,5))
    throw Error('Invalid scale step.');
  return initial.map((v,i)=>axis==='uniform'||axis===['x','y','z'][i]
    ? clamp(Math.round((v+direction*step)*10000)/10000,.05,50):v);
}
