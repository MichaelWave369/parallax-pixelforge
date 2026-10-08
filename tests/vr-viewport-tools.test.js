import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraFrame,projectWorldPoint,screenRay,hitObjectBounds,
  pickWorldObject,gizmoHandles,findGizmoHandle,draggedAxisPosition} from '../vr-studio/viewport-tools.js';
import {newWorld,editObject} from '../vr-studio/world.js';

const camera={yaw:0,pitch:0,distance:10,target:[0,0,0]};
const width=800,height=600;
const close=(actual,expected,tol=0.0001)=>assert.ok(Math.abs(actual-expected)<=tol,
  'Expected '+actual+' ≈ '+expected);

test('camera screen projection and ray are inverse directionally',()=>{
  const frame=cameraFrame(camera);
  assert.deepEqual(frame.eye,[0,0,10]);
  const center=projectWorldPoint(camera,[0,0,0],width,height);
  close(center.x,400);close(center.y,300);
  const p=[2,1,-3],point=projectWorldPoint(camera,p,width,height);
  assert.equal(point.visible,true);
  const ray=screenRay(camera,point.x,point.y,width,height);
  const to=p.map((v,i)=>v-ray.origin[i]);
  const size=Math.hypot(...to);
  for(let i=0;i<3;i++)close(ray.direction[i],to[i]/size);
  assert.equal(projectWorldPoint(camera,[0,0,11],width,height),null);
});
test('ray picking chooses nearest hit, supports importing actual mesh bounds',()=>{
  const scene={
    objects:[
      {id:'far',kind:'block',position:[0,0,-3],scale:[1,1,1],yaw:0},
      {id:'near',kind:'block',position:[0,0,0],scale:[1,1,1],yaw:0}
    ]
  };
  assert.equal(pickWorldObject(scene,camera,400,300,width,height),'near');
  assert.equal(pickWorldObject(scene,camera,799,0,width,height),null);
  scene.objects=[{id:'asset',kind:'asset-proxy',position:[0,0,0],
    scale:[1,1,1],yaw:0,asset:{sha256:'a'.repeat(64)}}];
  const x=projectWorldPoint(camera,[3,0,0],width,height);
  assert.equal(pickWorldObject(scene,camera,x.x,x.y,width,height),null);
  assert.equal(pickWorldObject(scene,camera,x.x,x.y,width,height,()=>
    ({min:[-4,-1,-1],max:[4,1,1]})),'asset');
});
test('ray-to-bounds handles rotated and nonuniformly scaled objects',()=>{
  const ray=screenRay(camera,400,300,width,height);
  assert.notEqual(hitObjectBounds(ray,{position:[0,0,0],scale:[1,2,1],yaw:45}),null);
  assert.equal(hitObjectBounds(ray,{position:[6,0,0],scale:[1,1,1],yaw:30}),null);
});
test('visible handles pick colored translation axes, not the shared center',()=>{
  const h=gizmoHandles(camera,[0,0,0],width,height);
  assert.ok(h);assert.ok(h.length>=2);
  for(const handle of h){
    const found=findGizmoHandle(h,handle.to.x,handle.to.y);
    if(Math.hypot(handle.to.x-handle.from.x,handle.to.y-handle.from.y)>4)
      assert.equal(found?.axis,handle.axis);
  }
  assert.equal(findGizmoHandle(h,400,300),null);
  assert.equal(gizmoHandles(camera,[0,0,11],width,height),null);
});
test('dragging a gizmo axis moves only its coordinate and snaps safely',()=>{
  const handles=gizmoHandles(camera,[0,0,0],width,height);
  const h=handles.find(h=>h.axis==='x');
  const p=draggedAxisPosition([0,0,0],h,h.to.x-h.from.x,h.to.y-h.from.y,.25);
  close(p[0],h.worldLength,.25);
  assert.equal(p[1],0);assert.equal(p[2],0);
  const base=newWorld();
  const obj=base.objects[1];
  const moved=editObject(base,obj.id,{position:p});
  assert.deepEqual(base.objects[1].position,[-2,1,-4]);
  assert.deepEqual(moved.objects[1].position,p);
  assert.throws(()=>draggedAxisPosition([0,0,0],h,5,5,0));
  assert.throws(()=>draggedAxisPosition([0,0,0],h,5,5,NaN));
});
