import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {
  createStoryPathRun,advanceStoryPath,storyPathOptions
} from '../layer-studio/story-path-simulator.js';
import {
  ROUTE_REPORT_SCHEMA,routeWorldSignature,routeWorldFingerprint,
  createRouteReport,verifyRouteReport,routeReportMarkdown
} from '../layer-studio/story-path-reports.js';

function atlas(){
  const root=createScene();root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root).atlas;
}
function apply(world,state,action){
  const out=advanceStoryPath(world,state,action);
  assert.equal(out.ok,true,out.reason||JSON.stringify(action));
  return out.state;
}
function fork(world=atlas(),choice='honor',finish=true){
  let state=createStoryPathRun(world);
  state=apply(world,state,{type:'discover',trackId:'the-stone-archive'});
  state=apply(world,state,{type:'assumeGates',value:true});
  state=apply(world,state,{type:'travel',portalId:'vault-to-reliquary'});
  state=apply(world,state,{type:'discover',trackId:'forked-echo',choiceId:choice});
  if(finish)state=apply(world,state,{type:'discover',trackId:
    choice==='honor'?'promise-path':'silence-path'});
  return state;
}
const clone=x=>JSON.parse(JSON.stringify(x));
test('Rung 16 exports an exact versioned route receipt with choices, flags and explicit assumptions',()=>{
  const a=atlas(),before=JSON.stringify(a),run=fork(a,'honor');
  const report=createRouteReport(a,run);
  assert.equal(report.schema,ROUTE_REPORT_SCHEMA);
  assert.equal(report.reportType,'hypothetical-story-path');
  assert.equal(report.world.startRoom,'lantern-vault');
  assert.equal(report.world.roomCount,2);
  assert.equal(report.world.fingerprint,routeWorldFingerprint(a));
  assert.match(report.world.fingerprint,/^fnv1a32:[0-9a-f]{8}$/);
  assert.equal(report.steps.length,5);
  assert.deepEqual(report.steps.map(s=>s.action.type),
    ['discover','assumeGates','travel','discover','discover']);
  assert.deepEqual(report.steps[3].action,
    {type:'discover',trackId:'forked-echo',choiceId:'honor'});
  assert.deepEqual(report.steps[3].gainedFlags,['fork-decided','echo-honored']);
  assert.deepEqual(report.steps[2].unverifiedGateChecks,['key']);
  assert.equal(report.assumptions.some(x=>x.kind==='non-flag-gate'),true);
  assert.equal(report.final.roomId,'reliquary');
  assert.equal(report.final.flags.includes('echo-silenced'),false);
  assert.equal(report.final.flags.includes('promise-kept'),true);
  assert.equal(report.summary.completedDiscoveries,3);
  assert.match(report.caution,/HYPOTHETICAL ONLY/);
  assert.equal(JSON.stringify(a),before);
  assert.equal('snapshots' in report,false);
  assert.equal('game' in report,false);
  assert.equal(JSON.stringify(report).includes('"before"'),false);
});
test('a serialized report replays to the same state without changing an existing preview',()=>{
  const a=atlas(),run=fork(a,'silence');
  const serialized=JSON.stringify(createRouteReport(a,run),null,2);
  const validated=verifyRouteReport(a,JSON.parse(serialized));
  assert.equal(validated.ok,true);
  assert.equal(validated.code,'verified');
  assert.equal(validated.state.roomId,'reliquary');
  assert.deepEqual(validated.state.flags,run.flags);
  assert.deepEqual(validated.state.seen,run.seen);
  assert.deepEqual(validated.state.visited,run.visited);
  assert.equal(validated.state.assumeGates,true);
  assert.equal(validated.state.history.length,run.history.length);
  assert.equal(validated.state.history.at(-1).action.trackId,'silence-path');
  assert.match(validated.message,/hypothetical steps/);
  // Imported report verification is not a gameplay restore.
  assert.equal(JSON.stringify(createStoryPathRun(a)),JSON.stringify(createStoryPathRun(a)));
});
test('report generation is deterministic, including the topology change detector',()=>{
  const a=atlas(),r=fork(a,'honor');
  const json1=JSON.stringify(createRouteReport(a,r));
  const json2=JSON.stringify(createRouteReport(a,r));
  assert.equal(json1,json2);
  assert.equal(routeWorldSignature(a),routeWorldSignature(clone(a)));
  assert.equal(routeWorldFingerprint(a),routeWorldFingerprint(clone(a)));
  const changed=clone(a);
  changed.rooms[1].sequences.tracks[0].choices[0].label='Another choice';
  assert.notEqual(routeWorldFingerprint(changed),routeWorldFingerprint(a));
  assert.equal(verifyRouteReport(changed,JSON.parse(json1)).code,'world-mismatch');
  assert.equal(verifyRouteReport(null,JSON.parse(json1)).code,'no-atlas');
});
test('visual-only art changes do not invalidate a valid story path report',()=>{
  const original=atlas(),report=createRouteReport(original,fork(original,'honor'));
  const changed=clone(original);
  changed.rooms[0].scene.layers[0].opacity=.11;
  changed.rooms[1].scene.camera.x=215;
  assert.equal(routeWorldFingerprint(changed),report.world.fingerprint);
  assert.equal(verifyRouteReport(changed,report).ok,true);
});
test('forged completed flag, step label, or skipped gate assumption rejects verification',()=>{
  const a=atlas(),report=createRouteReport(a,fork(a,'honor'));
  const cases=[
    (x)=>x.final.flags.push('echo-silenced'),
    (x)=>x.steps[3].label='Picked a different path',
    (x)=>x.steps[2].unverifiedGateChecks=['none'],
    (x)=>x.summary.earnedFlags=999,
    (x)=>x.assumptions=[],
    (x)=>x.blockers.push({id:'fake',kind:'portal',label:'gate',reasons:[]})
  ];
  for(const mutate of cases){
    const bad=clone(report);mutate(bad);
    const result=verifyRouteReport(a,bad);
    assert.equal(result.ok,false);
    assert.equal(result.code,'receipt-mismatch');
  }
});
test('a valid fingerprint with an invalid action returns its failing step',()=>{
  const a=atlas(),report=createRouteReport(a,fork(a,'honor'));
  const unknown=clone(report);
  unknown.steps[3].action.choiceId='made-up';
  assert.deepEqual(
    {code:verifyRouteReport(a,unknown).code,step:verifyRouteReport(a,unknown).step},
    {code:'blocked-action',step:4}
  );
  const malformed=clone(report);
  malformed.steps[1].action={type:'eval',script:'alert(1)'};
  assert.equal(verifyRouteReport(a,malformed).code,'invalid-action');
  const noAssumption=clone(report);
  noAssumption.steps.splice(1,1);
  assert.equal(verifyRouteReport(a,noAssumption).code,'blocked-action');
  assert.equal(verifyRouteReport(a,{schema:'wrong'}).code,'invalid-report');
  assert.equal(verifyRouteReport(a,{...report,steps:Array(65).fill({action:{type:'undo'}})})
    .code,'invalid-report');
});
test('undo keeps only the replayable surviving decisions in a report',()=>{
  const a=atlas();let s=fork(a,'honor');
  s=apply(a,s,{type:'undo'});s=apply(a,s,{type:'undo'});
  s=apply(a,s,{type:'discover',trackId:'forked-echo',choiceId:'silence'});
  s=apply(a,s,{type:'discover',trackId:'silence-path'});
  const report=createRouteReport(a,s);
  assert.equal(report.steps.length,5);
  assert.deepEqual(report.steps.map(x=>x.action.type),
    ['discover','assumeGates','travel','discover','discover']);
  assert.deepEqual(report.steps[3].action,
    {type:'discover',trackId:'forked-echo',choiceId:'silence'});
  assert.equal(report.final.flags.includes('echo-honored'),false);
  assert.equal(report.final.flags.includes('echo-silenced'),true);
  assert.equal(report.final.flags.includes('chamber-hushed'),true);
  assert.equal(verifyRouteReport(a,report).ok,true);
});
test('authored dialogue and boss assumptions appear as non-gameplay evidence',()=>{
  const a=atlas();let s=fork(a,'honor',false);
  s=apply(a,s,{type:'source',sourceId:'dialogue:keeper-choice:restore'});
  s=apply(a,s,{type:'source',sourceId:'boss:ash-warden'});
  const r=createRouteReport(a,s);
  assert.equal(r.assumptions.filter(x=>x.kind==='authored-event').length,2);
  assert.equal(r.final.flags.includes('ash-warden-fallen'),true);
  assert.equal(verifyRouteReport(a,r).ok,true);
  assert.ok(r.assumptions.some(x=>x.detail.includes('boss defeated')));
});
test('report contains final-room blockers with grounded reasons',()=>{
  const a=atlas(),s=fork(a,'honor',false),r=createRouteReport(a,s);
  const blocked=r.blockers.find(t=>t.id==='silence-path');
  assert.equal(blocked.kind,'discovery');
  assert.match(blocked.reasons.join(' '),/Requires echo-silenced/);
  assert.equal(r.final.flags.includes('echo-honored'),true);
  assert.equal(r.summary.blockedItemsInRoom,r.blockers.length);
});
test('Markdown export is readable, explicitly hypothetical, and never executes authored markup',()=>{
  const a=atlas(),r=createRouteReport(a,fork(a,'honor'));
  const md=routeReportMarkdown(r);
  assert.match(md,/# PixelForge Branch Route Report/);
  assert.match(md,/hypothetical/i);
  assert.match(md,/Unverified gate conditions/);
  assert.match(md,/echo-honored/);
  assert.match(md,/action log/);
  assert.match(md,/not an Adventure Journal save/);
  assert.equal(md.includes('javascript:'),false);
  assert.throws(()=>routeReportMarkdown({schema:'wrong'}));
  const altered=clone(r);
  altered.steps[0].label='</script><img src=x onerror=bad()>';
  const escaped=routeReportMarkdown(altered);
  assert.equal(escaped.includes('</script>'),false);
  assert.equal(escaped.includes('\\<'),true);
});
test('reports work for empty routes and old atlases without authored discoveries',()=>{
  const a=atlas(),empty=createStoryPathRun(a);
  const zero=createRouteReport(a,empty);
  assert.equal(zero.steps.length,0);
  assert.equal(zero.final.flags.length,0);
  assert.equal(verifyRouteReport(a,zero).ok,true);
  const old=clone(a);
  for(const room of old.rooms)delete room.sequences;
  const r=createRouteReport(old,createStoryPathRun(old));
  assert.equal(r.summary.totalDiscoveries,0);
  assert.equal(verifyRouteReport(old,r).ok,true);
  assert.throws(()=>createRouteReport(null,empty));
});
test('tampering with local history or simulated state cannot produce a valid report',()=>{
  const a=atlas(),valid=fork(a,'honor');
  const modified={...valid,flags:[...valid.flags,'echo-silenced']};
  assert.throws(()=>createRouteReport(a,modified),/does not match authored actions/);
  const history={...valid,history:[...valid.history]};
  history.history[2]={...history.history[2],
    action:{type:'travel',portalId:'wrong-door'}};
  assert.throws(()=>createRouteReport(a,history),/Cannot export route/);
});
test('receipt exporter and import verifier are wired and remain separate from game saves',()=>{
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const reports=readFileSync(new URL('../layer-studio/story-path-reports.js',import.meta.url),'utf8');
  const simulator=readFileSync(new URL('../layer-studio/story-path-simulator.js',import.meta.url),'utf8');
  for(const id of ['storyRouteJson','storyRouteMarkdown','storyRouteFile',
    'storyRouteVerify','storyRouteApply','storyRouteStatus'])
    assert.match(editor,new RegExp('id="'+id+'"'));
  assert.match(studio,/createRouteReport/);
  assert.match(studio,/verifyRouteReport/);
  assert.match(studio,/routeReportMarkdown/);
  assert.match(studio,/URL\.createObjectURL/);
  assert.match(studio,/file\.text\(\)/);
  assert.match(studio,/routeWorldSignature/);
  assert.match(simulator,/next\.history\.push\(\{before,label,action:record\}\)/);
  assert.doesNotMatch(reports,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
  assert.doesNotMatch(reports,/Date\.now|new Date\(/);
});
