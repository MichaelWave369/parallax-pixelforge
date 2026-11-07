import test from 'node:test';
import assert from 'node:assert/strict';
import {createSamplePlayableWorld} from '../src/playable-world.js';
import {digestPlayableWorld} from '../src/playtest-save.js';
import {createGhostRun,parseGhostRun} from '../src/ghost-run.js';
import {
  INSPECTOR_MAX_RUNS,INSPECTOR_REPORT_FORMAT,insertInspectorRun,
  inspectorCells,routeBounds,routeMapPoints,compareGhostRuns,createPlaytestReport
} from '../src/playtest-inspector.js';

function route(sha,positions,stamp=1770000000000){
  return createGhostRun(sha,positions.map((position,i)=>({
    t:i*200,position,grounded:true
  })),stamp);
}
async function samples(){
  const digest=await digestPlayableWorld(createSamplePlayableWorld());
  const a=route(digest,[[0,1,0],[0,1,0],[2,1,0],[2,1,0]]);
  const b=route(digest,[[.5,1,.4],[.5,1,.4],[-2,1,0],[-2,1,0]],1770000001000);
  const c=route(digest,[[6,1,6],[6,1,6],[7,1,6],[7,1,6]],1770000002000);
  const d=route(digest,[[4,1,4],[4,1,4],[5,1,4],[5,1,4]],1770000003000);
  return {digest,a,b,c,d};
}
test('comparison is world-digest bound and rejects imports from another level revision',async()=>{
  const {digest,a}=await samples();
  assert.deepEqual(insertInspectorRun([],a,digest),[a]);
  const altered=createSamplePlayableWorld();altered.gravity=-8;
  const other=await digestPlayableWorld(altered);
  assert.notEqual(other,digest);
  assert.throws(()=>insertInspectorRun([],a,other),/different playable world/);
  const imported=parseGhostRun(JSON.stringify(a),digest);
  assert.deepEqual(insertInspectorRun([],imported,digest),[a]);
});
test('up to four independent paths, duplicate route rejection and atomic pure updates',async()=>{
  const {digest,a,b,c,d}=await samples();
  let runs=[];
  for(const run of [a,b,c,d])runs=insertInspectorRun(runs,run,digest);
  assert.equal(runs.length,INSPECTOR_MAX_RUNS);
  assert.throws(()=>insertInspectorRun(runs,a,digest),/four/);
  assert.throws(()=>insertInspectorRun([a],a,digest),/Duplicate/);
  const copied=structuredClone(a);copied.created_at+=99;
  assert.throws(()=>insertInspectorRun([a],copied,digest),/Duplicate/);
  const invalid=structuredClone(b);invalid.samples[1].position=[Infinity,0,0];
  assert.throws(()=>insertInspectorRun([a],invalid,digest),/bounded/);
  assert.equal(a.samples[0].position[0],0);
});
test('comparison identifies cells visited by multiple runs without treating duplicates as independent',async()=>{
  const {digest,a,b,c}=await samples();
  const one=inspectorCells(a),two=inspectorCells(b);
  assert.equal(one.get('0,0'),400);
  assert.equal(two.get('0,0'),400);
  const comparison=compareGhostRuns([a,b,c],digest);
  assert.equal(comparison.runCount,3);
  assert.equal(comparison.sharedCells.length,1);
  assert.deepEqual(comparison.sharedCells[0],
    {x:1,z:1,runCount:2,totalSeconds:.8,meanSecondsPerVisitingRun:.4});
  assert.equal(comparison.bestDuration,.6);
  assert.equal(comparison.meanDuration,.6);
  assert.equal(comparison.metrics.length,3);
});
test('top-down bounds handle stationary, straight-line and negative-coordinate paths',async()=>{
  const {digest,a,b}=await samples();
  const bounds=routeBounds([a,b],digest);
  assert.ok(bounds.minX< -2 && bounds.maxX>2);
  assert.ok(bounds.minZ<0 && bounds.maxZ>0);
  const pts=routeMapPoints(a,bounds);
  assert.equal(pts.length,a.samples.length);
  assert.ok(pts.every(p=>p.x>=0&&p.x<=460&&p.y>=0&&p.y<=240));
  const single=route(digest,[[2,1,3],[2,1,3]]);
  const straight=routeMapPoints(single,routeBounds([single],digest));
  assert.equal(straight.length,2);
  assert.deepEqual(straight[0],straight[1]);
  assert.throws(()=>routeMapPoints(a,bounds,0,200),/Invalid route preview dimensions/);
});
test('long path overlays are downsampled and preserve first and final sample',async()=>{
  const {digest}=await samples();
  const many=route(digest,Array.from({length:2300},(_,i)=>[i/30-30,1,0]));
  const bounds=routeBounds([many],digest);
  const pts=routeMapPoints(many,bounds);
  assert.ok(pts.length<=401);
  assert.deepEqual(pts[0],routeMapPoints(
    route(digest,[many.samples[0].position,many.samples.at(-1).position]),bounds)[0]);
  assert.deepEqual(pts.at(-1),routeMapPoints(
    route(digest,[many.samples[0].position,many.samples.at(-1).position]),bounds).at(-1));
});
test('export is summary-only: no raw paths, names, account identifiers or game-save mutations',async()=>{
  const {digest,a,b}=await samples();
  const original=JSON.stringify(a);
  const report=createPlaytestReport([a,b],digest,1770001234000);
  assert.equal(report.format,INSPECTOR_REPORT_FORMAT);
  assert.equal(report.world_sha256,digest);
  assert.equal(report.generated_at,1770001234000);
  assert.equal(report.run_count,2);
  assert.equal(report.metrics[0].label,'Run 1');
  assert.equal(report.metrics[1].label,'Run 2');
  assert.ok(report.shared_cells[0].runCount===2);
  const payload=JSON.stringify(report);
  assert.equal(payload.includes('"samples":[{'),false);
  assert.equal(payload.includes('"position"'),false);
  assert.equal(payload.includes('"created_at"'),false);
  assert.equal(JSON.stringify(a),original);
  assert.throws(()=>createPlaytestReport([],digest),/Import a ghost/);
  assert.throws(()=>createPlaytestReport([a],digest,-1),/timestamp/);
});
test('empty inspector is a safe no-results view and cannot invent shared hotspots',async()=>{
  const {digest}=await samples();
  const result=compareGhostRuns([],digest);
  assert.equal(result.runCount,0);
  assert.deepEqual(result.metrics,[]);
  assert.deepEqual(result.sharedCells,[]);
  assert.equal(result.bestDuration,null);
});
