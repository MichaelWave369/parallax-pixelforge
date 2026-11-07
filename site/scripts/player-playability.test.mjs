import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_MOTION,DOOR_DISSOLVE_SECONDS,horizontalMotion,canJump,doorDissolvePose
} from '../src/player-playability.js';

test('camera-relative W and D directions match orbit orientation',()=>{
  const worldForward=horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:.1});
  assert.ok(worldForward[1]<0);
  assert.ok(Math.abs(worldForward[0])<1e-8);
  const turned=horizontalMotion({forward:[1,0],input:[0,1],previous:[0,0],dt:.1});
  assert.ok(turned[0]>0);
  assert.ok(Math.abs(turned[1])<1e-8);
  const right=horizontalMotion({forward:[1,0],input:[1,0],previous:[0,0],dt:.1});
  assert.ok(right[1]>0);
});
test('diagonal motion normalizes speed and idle motion brakes smoothly',()=>{
  const w=horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:.1});
  const diagonal=horizontalMotion({forward:[0,-1],input:[1,1],previous:[0,0],dt:.1});
  assert.ok(Math.abs(Math.hypot(...diagonal)-Math.hypot(...w))<1e-8);
  const slowed=horizontalMotion({forward:[0,-1],input:[0,0],previous:w,dt:.1});
  assert.ok(Math.hypot(...slowed)<Math.hypot(...w));
  assert.ok(Math.hypot(...slowed)>0);
});
test('Shift sprint increases requested movement without changing world data',()=>{
  const standard=horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:.1});
  const fast=horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:.1,sprint:true});
  assert.ok(Math.hypot(...fast)>Math.hypot(...standard));
  assert.equal(PLAYER_MOTION.sprintSpeed>PLAYER_MOTION.walkSpeed,true);
});
test('zero-step, extreme inputs and invalid vectors are bounded',()=>{
  assert.deepEqual(horizontalMotion({forward:[0,-1],input:[0,1],previous:[1,2],dt:0}),[1,2]);
  const huge=horizontalMotion({forward:[0,-1],input:[100,100],previous:[0,0],dt:.1});
  assert.ok(Math.hypot(...huge)<=PLAYER_MOTION.walkSpeed);
  assert.throws(()=>horizontalMotion({forward:[NaN,-1],input:[0,1],previous:[0,0],dt:.1}),/Invalid/);
  assert.throws(()=>horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:Infinity}),/Invalid/);
  assert.throws(()=>horizontalMotion({forward:[0,-1],input:[0,1],previous:[0,0],dt:3}),/Invalid/);
});
test('jump occurs only when requested, grounded and not paused',()=>{
  assert.equal(canJump(true,true,false),true);
  assert.equal(canJump(true,false,false),false);
  assert.equal(canJump(true,true,true),false);
  assert.equal(canJump(false,true,false),false);
});
test('door opening is bounded and collision-independent visual feedback',()=>{
  const start=doorDissolvePose(0),half=doorDissolvePose(DOOR_DISSOLVE_SECONDS/2);
  const end=doorDissolvePose(DOOR_DISSOLVE_SECONDS);
  assert.deepEqual(start,{opacity:1,scaleY:1,lift:0,emissive:0,done:false});
  assert.ok(half.opacity>0&&half.opacity<1);
  assert.ok(half.scaleY<start.scaleY);
  assert.equal(end.opacity,0);
  assert.equal(end.done,true);
  assert.equal(end.scaleY,.04);
  assert.deepEqual(doorDissolvePose(DOOR_DISSOLVE_SECONDS*10),end);
  assert.deepEqual(doorDissolvePose(-1),start);
  assert.throws(()=>doorDissolvePose(NaN),/Invalid/);
});
