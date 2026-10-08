import test from 'node:test';
import assert from 'node:assert/strict';
import {rotationRing,findRotationRing,draggedYaw,scaleHandles,
  findScaleHandle,draggedScale,steppedScale} from '../vr-studio/transform-tools.js';
import {newWorld,editObject,parseWorld} from '../vr-studio/world.js';

const camera={yaw:0.6,pitch:0.46,distance:12,target:[0,0,-4]};
const size={width:800,height:600};

test('yaw-only ring follows camera projection; hidden at unusable edge-on angle',()=>{
  const ring=rotationRing(camera,[0,0,-4],size.width,size.height);
  assert.ok(ring);
  assert.equal(ring.points.length,65);
  assert.equal(findRotationRing(ring,ring.points[13].x,ring.points[13].y),true);
  assert.equal(findRotationRing(ring,ring.center.x,ring.center.y),false);
  assert.equal(findRotationRing(ring,-2000,-2000),false);
  assert.equal(rotationRing({...camera,pitch:0},[0,0,-4],800,600),null);
  assert.equal(rotationRing(camera,[0,0,100],800,600),null);
});

test('yaw scrub honors selected angular snapping and schema clamp',()=>{
  assert.equal(draggedYaw(10,0,15),10);
  assert.equal(draggedYaw(10,60,15),40);
  assert.equal(draggedYaw(-18,-30,5),-33);
  assert.equal(draggedYaw(355,1000,15),360);
  assert.equal(draggedYaw(-355,-1000,15),-360);
  assert.throws(()=>draggedYaw(1,10,0));
  assert.throws(()=>draggedYaw(1,Infinity,15));
  const world=newWorld();
  const edited=editObject(world,'obj-2',{yaw:draggedYaw(0,30,15)});
  assert.equal(edited.objects[1].yaw,15);
  assert.equal(world.objects[1].yaw,0);
});

test('scale handles share correct view projection and support uniform center',()=>{
  const handles=scaleHandles(camera,[0,0,-4],800,600);
  assert.ok(handles);
  const origin=handles[0].from;
  assert.equal(findScaleHandle(handles,origin.x,origin.y).axis,'uniform');
  const h=handles.find(h=>h.axis==='x');
  assert.equal(findScaleHandle(handles,h.to.x,h.to.y)?.axis,'x');
  assert.equal(findScaleHandle(handles,-100,-100),null);
});

test('axis drag, uniform drag and snap constrain scale without mutating input',()=>{
  const initial=[1,2,3],handles=scaleHandles(camera,[0,0,-4],800,600);
  const x=handles.find(h=>h.axis==='x');
  const deltaX=x.to.x-x.from.x,deltaY=x.to.y-x.from.y;
  const shifted=draggedScale(initial,x,deltaX,deltaY,.1);
  assert.equal(shifted[0],2);
  assert.deepEqual(shifted.slice(1),[2,3]);
  assert.deepEqual(initial,[1,2,3]);
  assert.deepEqual(draggedScale(initial,x,0,0,.1),initial);
  const uniform=findScaleHandle(handles,handles[0].from.x,handles[0].from.y);
  assert.deepEqual(draggedScale(initial,uniform,0,-120,.1),[2,4,6]);
  assert.deepEqual(draggedScale(initial,uniform,0,12000,.1),[.05,.05,.05]);
  assert.deepEqual(draggedScale(initial,uniform,0,-12000,.1),[50,50,50]);
  assert.throws(()=>draggedScale(initial,x,NaN,0,.1));
  assert.throws(()=>draggedScale(initial,x,5,0,0));
});

test('scale inspector steps are bounded and serialize in existing schema',()=>{
  assert.deepEqual(steppedScale([1,1,1],'z',-1,.1),[1,1,.9]);
  assert.deepEqual(steppedScale([1,1,1],'uniform',1,.5),[1.5,1.5,1.5]);
  assert.deepEqual(steppedScale([.05,50,1],'uniform',-1,.1),[.05,49.9,.9]);
  assert.throws(()=>steppedScale([1,1,1],'yaw',1,.1));
  assert.throws(()=>steppedScale([1,1,1],'x',0,.1));
  const world=newWorld();
  const edited=editObject(world,'obj-2',{scale:steppedScale(world.objects[1].scale,'uniform',1,.1)});
  assert.deepEqual(parseWorld(JSON.stringify(edited)),edited);
  assert.deepEqual(world.objects[1].scale,[.7,2,.7]);
});
