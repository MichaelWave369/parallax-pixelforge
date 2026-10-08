// PixelForge v5.38: deterministic math for desktop object picking and translation.
// No DOM, WebGL, external data, scripts or new scene authority.
export const AXES = Object.freeze(['x','y','z']);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a);
const normalize=a=>{const n=length(a);if(n<1e-8)throw Error('Invalid camera orientation.');return a.map(x=>x/n);};
function validView(camera,width,height) {
  if(!camera||!Number.isFinite(camera.distance)||camera.distance<=0||
    !Number.isFinite(camera.yaw)||!Number.isFinite(camera.pitch)||
    !Array.isArray(camera.target)||camera.target.length!==3||
    !camera.target.every(Number.isFinite)||!(width>0)||!(height>0))
    throw Error('Invalid viewport/camera.');
}
export function cameraFrame(camera) {
  validView(camera,1,1);
  const cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
  const eye=[
    camera.target[0]+camera.distance*cp*Math.sin(camera.yaw),
    camera.target[1]+camera.distance*sp,
    camera.target[2]+camera.distance*cp*Math.cos(camera.yaw)
  ];
  const forward=normalize(sub(camera.target,eye));
  const right=normalize(cross(forward,[0,1,0]));
  const up=normalize(cross(right,forward));
  return {eye,forward,right,up};
}
export function projectWorldPoint(camera,point,width,height) {
  validView(camera,width,height);
  if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))return null;
  const frame=cameraFrame(camera),rel=sub(point,frame.eye);
  const depth=dot(rel,frame.forward);
  if(depth<=0.05)return null;
  const halfTan=Math.tan(Math.PI/6);
  const nx=dot(rel,frame.right)/(depth*halfTan*(width/height));
  const ny=dot(rel,frame.up)/(depth*halfTan);
  return {x:(nx+1)*width/2,y:(1-ny)*height/2,depth,
    visible:Math.abs(nx)<=1&&Math.abs(ny)<=1};
}
export function screenRay(camera,x,y,width,height) {
  validView(camera,width,height);
  if(![x,y].every(Number.isFinite))throw Error('Invalid pointer.');
  const frame=cameraFrame(camera),halfTan=Math.tan(Math.PI/6);
  const nx=(x/width)*2-1,ny=1-(y/height)*2;
  const dir=normalize(frame.forward.map((v,i)=>
    v+nx*halfTan*(width/height)*frame.right[i]+ny*halfTan*frame.up[i]));
  return {origin:frame.eye,direction:dir};
}
function validBounds(bounds) {
  return bounds&&Array.isArray(bounds.min)&&Array.isArray(bounds.max)&&
    bounds.min.length===3&&bounds.max.length===3&&
    [...bounds.min,...bounds.max].every(Number.isFinite)&&
    bounds.min.every((v,i)=>v<=bounds.max[i]);
}
const UNIT_BOUNDS={min:[-.5,-.5,-.5],max:[.5,.5,.5]};
export function hitObjectBounds(ray,obj,bounds=UNIT_BOUNDS) {
  if(!obj||!validBounds(bounds)||!Array.isArray(obj.position)||!Array.isArray(obj.scale)||
    ![...obj.position,...obj.scale,obj.yaw].every(Number.isFinite)||
    obj.scale.some(n=>n<=0))return null;
  const angle=obj.yaw*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
  const inverse=(v,scale)=>[
    (c*v[0]-s*v[2])/scale[0],
    v[1]/scale[1],
    (s*v[0]+c*v[2])/scale[2]
  ];
  const localOrigin=inverse(sub(ray.origin,obj.position),obj.scale);
  const localDir=inverse(ray.direction,obj.scale);
  let tmin=-Infinity,tmax=Infinity;
  for(let i=0;i<3;i++){
    const d=localDir[i],v=localOrigin[i],min=bounds.min[i],max=bounds.max[i];
    if(Math.abs(d)<1e-10){if(v<min||v>max)return null;continue;}
    const t1=(min-v)/d,t2=(max-v)/d;
    tmin=Math.max(tmin,Math.min(t1,t2));
    tmax=Math.min(tmax,Math.max(t1,t2));
    if(tmax<tmin)return null;
  }
  const t=tmin>=0?tmin:tmax>=0?tmax:null;
  return t!==null&&Number.isFinite(t)?t:null;
}
export function pickWorldObject(world,camera,x,y,width,height,getBounds=()=>null) {
  const ray=screenRay(camera,x,y,width,height);
  let chosen=null,best=Infinity;
  for(const obj of world?.objects||[]) {
    const bounds=obj.kind==='asset-proxy'&&obj.asset
      ? getBounds(obj.asset.sha256)||UNIT_BOUNDS : UNIT_BOUNDS;
    const t=hitObjectBounds(ray,obj,bounds);
    if(t!==null&&t<best){best=t;chosen=obj.id;}
  }
  return chosen;
}
export function gizmoHandles(camera,position,width,height) {
  const origin=projectWorldPoint(camera,position,width,height);
  if(!origin||!origin.visible)return null;
  const size=clamp(camera.distance*0.1,0.55,3);
  const handles=[];
  for(let i=0;i<3;i++) {
    const end=[...position];end[i]+=size;
    const projected=projectWorldPoint(camera,end,width,height);
    if(projected&&projected.depth>0.05)handles.push({
      axis:AXES[i],from:{x:origin.x,y:origin.y},
      to:{x:projected.x,y:projected.y},worldLength:size
    });
  }
  return handles.length?handles:null;
}
export function findGizmoHandle(handles,x,y) {
  if(!handles)return null;
  let nearest=null,dist=Infinity;
  for(const h of handles) {
    const dx=h.to.x-h.from.x,dy=h.to.y-h.from.y;
    const denom=dx*dx+dy*dy;
    if(denom<16)continue; // nearly edge-on: axis is not safely draggable
    const u=clamp(((x-h.from.x)*dx+(y-h.from.y)*dy)/denom,0,1);
    if(u<.2)continue; // center stays available for object selection
    const distance=Math.hypot(x-h.from.x-dx*u,y-h.from.y-dy*u);
    if(distance<=13&&distance<dist){nearest=h;dist=distance;}
  }
  return nearest;
}
export function draggedAxisPosition(position,handle,dx,dy,snap=0.25) {
  if(!handle||!AXES.includes(handle.axis)||!position?.every(Number.isFinite)||
    ![dx,dy,snap].every(Number.isFinite)||snap<=0||snap>10)
    throw Error('Invalid translation request.');
  const vx=handle.to.x-handle.from.x,vy=handle.to.y-handle.from.y;
  const sq=vx*vx+vy*vy;
  if(sq<16)return [...position];
  const delta=((dx*vx+dy*vy)/sq)*handle.worldLength;
  const idx=AXES.indexOf(handle.axis);
  const next=[...position];
  next[idx]=clamp(Math.round((position[idx]+delta)/snap)*snap,-100,100);
  return next;
}
