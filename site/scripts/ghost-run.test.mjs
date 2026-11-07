import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld} from '../src/playable-world.js';
import {digestPlayableWorld} from '../src/playtest-save.js';
import {
  GHOST_FORMAT,GHOST_MAX_SAMPLES,GHOST_MAX_BYTES,GHOST_MAX_DURATION_MS,
  ghostStorageKey,appendGhostSample,createGhostRun,validateGhostRun,
  parseGhostRun,ghostPoseAt,analyzeGhostRun
} from '../src/ghost-run.js';

const frames=()=>[
  {t:0,position:[0,1,0],grounded:true},
  {t:200,position:[1,1,0],grounded:true},
  {t:400,position:[2,2,0],grounded:false},
  {t:600,position:[3,1,0],grounded:true}
];
test('world digest binds portable ghost to actual playable-world content, independent of source SHA metadata',async()=>{
  const world=createSamplePlayableWorld();
  const digest=await digestPlayableWorld(world);
  const run=createGhostRun(digest,frames(),1770000000000);
  assert.equal(run.format,GHOST_FORMAT);
  assert.equal(run.created_at,1770000000000);
  assert.equal(ghostStorageKey(digest),'pixelforge.v6.ghost.v1.'+digest);
  assert.deepEqual(parseGhostRun(JSON.stringify(run),digest),run);
  const changed=structuredClone(world);changed.gravity=-8;
  const other=await digestPlayableWorld(changed);
  assert.notEqual(digest,other);
  assert.equal(changed.source.sha256,world.source.sha256);
  assert.throws(()=>parseGhostRun(JSON.stringify(run),other),/different playable world/);
});
test('time interpolation is linear and clamp-safe at either end of a ghost route',async()=>{
  const digest=await digestPlayableWorld(createSamplePlayableWorld());
  const run=createGhostRun(digest,frames());
  assert.deepEqual(ghostPoseAt(run,-10),{position:[0,1,0],grounded:true,done:false});
  assert.deepEqual(ghostPoseAt(run,300),{position:[1.5,1.5,0],grounded:true,done:false});
  assert.deepEqual(ghostPoseAt(run,600),{position:[3,1,0],grounded:true,done:true});
  assert.deepEqual(ghostPoseAt(run,2000),{position:[3,1,0],grounded:true,done:true});
  assert.throws(()=>ghostPoseAt(run,Infinity),/Invalid/);
});
test('analytics report duration, 3D distance, movement, approximate jumps and dwell hotspots',async()=>{
  const digest=await digestPlayableWorld(createSamplePlayableWorld());
  const run=createGhostRun(digest,frames());
  const x=analyzeGhostRun(run);
  assert.equal(x.samples,4);
  assert.equal(x.durationSeconds,.6);
  assert.equal(x.distanceMeters,3.8);
  assert.equal(x.averageSpeed,6.4);
  assert.equal(x.movingSeconds,.6);
  assert.equal(x.jumps,1);
  assert.deepEqual(x.hotspots,[{x:1,z:1,seconds:.4},{x:3,z:1,seconds:.2}]);
});
test('ghost samples reject nonfinite data, unsafe fields, duplicate or out-of-order timestamps',async()=>{
  const digest=await digestPlayableWorld(createSamplePlayableWorld());
  assert.throws(()=>createGhostRun(digest,[frames()[0]]),/2 to 2400/);
  assert.throws(()=>createGhostRun(digest,[frames()[1],frames()[2]]),/start at t=0/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],frames()[0]]),/time-ordered/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],{...frames()[1],position:[NaN,0,0]}]),/bounded/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],{...frames()[1],url:'https://example.test'}]),/unknown/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],{...frames()[1],t:GHOST_MAX_DURATION_MS+1}]),/time/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],{...frames()[1],grounded:1}]),/grounded/);
  assert.throws(()=>appendGhostSample(frames(),frames()[2]),/time-ordered/);
  assert.throws(()=>createGhostRun(digest,[frames()[0],frames()[1]],-4),/timestamp/);
});
test('bounded importer refuses malformed, oversized and foreign JSON without execution',async()=>{
  const digest=await digestPlayableWorld(createSamplePlayableWorld()),run=createGhostRun(digest,frames());
  assert.throws(()=>parseGhostRun('{nope',digest),SyntaxError);
  assert.throws(()=>parseGhostRun('x'.repeat(GHOST_MAX_BYTES+1),digest),/320 KB/);
  assert.throws(()=>validateGhostRun({...run,execute:'alert(1)'},digest),/unknown/);
  assert.throws(()=>validateGhostRun({...run,world_sha256:'0'.repeat(64)},digest),/different playable/);
  assert.throws(()=>ghostStorageKey('not-a-hash'),/digest/);
  assert.ok(GHOST_MAX_SAMPLES<=2400);
});
test('sample and duration budgets enforce hard bounds',async()=>{
  const digest=await digestPlayableWorld(createSamplePlayableWorld());
  const cap=Array.from({length:GHOST_MAX_SAMPLES},(_,i)=>({
    t:i*200,position:[0,1,0],grounded:true
  }));
  assert.equal(createGhostRun(digest,cap).samples.length,GHOST_MAX_SAMPLES);
  assert.throws(()=>appendGhostSample(cap,{t:GHOST_MAX_SAMPLES*200,
    position:[0,1,0],grounded:true}),/2400-sample/);
  assert.throws(()=>createGhostRun(digest,[...cap,{t:GHOST_MAX_SAMPLES*200,
    position:[0,1,0],grounded:true}]),/2 to 2400/);
  assert.ok(GHOST_MAX_DURATION_MS>=GHOST_MAX_SAMPLES*200);
});
test('ghost telemetry does not mutate creator scene or game save documents',async()=>{
  const source=createSamplePlayableWorld(),original=JSON.stringify(source);
  const digest=await digestPlayableWorld(source);
  let recorded=[];
  for(const point of frames())recorded=appendGhostSample(recorded,point);
  const run=createGhostRun(digest,recorded);
  const importAgain=parseGhostRun(JSON.stringify(run),digest);
  assert.equal(JSON.stringify(source),original);
  assert.notStrictEqual(run.samples[0].position,recorded[0].position);
  assert.deepEqual(importAgain,run);
});
