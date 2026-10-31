import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {
  createStoryPathRun,advanceStoryPath,storyPathOptions
} from '../layer-studio/story-path-simulator.js';
import {
  createScenarioCatalog,addScenario
} from '../layer-studio/story-scenario-catalog.js';
import {analyzeRouteCoverage} from '../layer-studio/story-route-coverage.js';
import {
  ROUTE_GUIDE_SCHEMA,ROUTE_GUIDE_MAX_STATES,ROUTE_GUIDE_MAX_DEPTH,
  guideStateFingerprint,planCoverageRoute,guidedCoverageTargets
} from '../layer-studio/story-coverage-guide.js';

const clone=x=>JSON.parse(JSON.stringify(x));
function atlas(){
  const scene=createScene();scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene).atlas;
}
function advance(a,s,action){
  const result=advanceStoryPath(a,s,action);
  assert.equal(result.ok,true,result.reason||JSON.stringify(action));
  return result.state;
}
function covered(a,catalog=createScenarioCatalog()){
  return analyzeRouteCoverage(a,catalog);
}
function target(coverage,kind,fragment){
  const row=coverage.rows.find(x=>x.kind===kind&&x.id.includes(fragment));
  assert.ok(row,'Expected '+kind+' / '+fragment);
  return row.id;
}
function replay(a,start,plan){
  let state=start;
  for(const step of plan.steps){
    const before=state;
    state=advance(a,state,step.action);
    assert.equal(step.fromRoom,before.roomId);
    assert.equal(step.toRoom,state.roomId);
  }
  return state;
}
test('guide enumerates only uncovered or review-needed targets and prioritizes choice outcomes',()=>{
  const a=atlas(),c=covered(a),choices=guidedCoverageTargets(c);
  assert.equal(choices.length,c.summary.targets);
  assert.equal(choices[0].kind,'choice');
  assert.equal(choices.some(x=>x.id.includes('honor')),true);
  assert.equal(guidedCoverageTargets(null).length,0);
  assert.ok(ROUTE_GUIDE_MAX_STATES<=2000);
  assert.ok(ROUTE_GUIDE_MAX_DEPTH<=20);
});
test('planner finds the correct four-step authored route to an uncovered Honor outcome',()=>{
  const a=atlas(),s=createStoryPathRun(a),before=JSON.stringify({a,s});
  const coverage=covered(a);
  const honor=coverage.rows.find(r=>r.kind==='choice'&&
    r.label==='Carry the forgotten promise');
  assert.ok(honor);
  const guide=planCoverageRoute(a,s,honor.id,{coverage});
  assert.equal(guide.schema,ROUTE_GUIDE_SCHEMA);
  assert.equal(guide.status,'found');
  assert.deepEqual(guide.steps.map(step=>step.action),[
    {type:'discover',trackId:'the-stone-archive'},
    {type:'assumeGates',value:true},
    {type:'travel',portalId:'vault-to-reliquary'},
    {type:'discover',trackId:'forked-echo',choiceId:'honor'}
  ]);
  assert.equal(guide.steps.length,4);
  assert.equal(guide.assumptions,2);
  assert.equal(guide.targetId,honor.id);
  assert.equal(guide.truncated,false);
  assert.match(guide.warning,/not tested gameplay/);
  assert.equal(JSON.stringify({a,s}),before,'Planning must never mutate either input');
  const resulting=replay(a,s,guide);
  assert.ok(resulting.flags.includes('echo-honored'));
  assert.ok(!resulting.flags.includes('echo-silenced'));
});
test('the Silence alternative is a separate valid scenario from a new preview',()=>{
  const a=atlas(),s=createStoryPathRun(a),c=covered(a);
  const silence=target(c,'choice','silence');
  const path=planCoverageRoute(a,s,silence,{coverage:c});
  assert.equal(path.status,'found');
  assert.deepEqual(path.steps.at(-1).action,{
    type:'discover',trackId:'forked-echo',choiceId:'silence'
  });
  const after=replay(a,s,path);
  assert.ok(after.flags.includes('echo-silenced'));
  assert.ok(!after.flags.includes('echo-honored'));
  assert.equal(planCoverageRoute(a,after,silence,{coverage:c}).status,'already-covered');
});
test('discoveries and world flags are earned by actual Rung 15 actions, never inserted directly',()=>{
  const a=atlas(),s=createStoryPathRun(a),c=covered(a);
  for(const [kind,id] of [
    ['discovery','promise-path'],['flag','promise-kept'],
    ['discovery','silence-path'],['flag','chamber-hushed']
  ]){
    const route=planCoverageRoute(a,s,target(c,kind,id),{coverage:c});
    assert.equal(route.status,'found',kind+' / '+id+' / '+route.message);
    assert.equal(route.steps.length,5);
    assert.ok(route.steps.every(step=>
      ['discover','travel','assumeGates','source'].includes(step.action.type)));
    const result=replay(a,s,route);
    if(kind==='flag')assert.ok(result.flags.includes(id));
    else assert.ok(result.seen.includes('reliquary:'+id));
  }
});
test('after once-only Honor fork, planner never manufactures the exclusive Silence answer',()=>{
  const a=atlas(),s=createStoryPathRun(a),c=covered(a);
  const honor=planCoverageRoute(a,s,target(c,'choice','honor'),{coverage:c});
  const committed=replay(a,s,honor);
  const alternative=planCoverageRoute(a,committed,target(c,'choice','silence'),{
    coverage:c,maxStates:500,maxDepth:12
  });
  assert.notEqual(alternative.status,'found');
  assert.ok(['search-limited','no-route'].includes(alternative.status));
  assert.deepEqual(alternative.steps,[]);
  assert.match(alternative.message,/Reset|reset|bounded/);
  assert.equal(planCoverageRoute(a,committed,target(c,'choice','honor'),{
    coverage:c}).status,'already-covered');
});
test('the planner never silently assumes non-flag requirements or bypasses flag gates',()=>{
  const a=atlas(),c=covered(a),s=createStoryPathRun(a);
  const portal=planCoverageRoute(a,s,target(c,'portal','vault-to-reliquary'),{
    coverage:c
  });
  assert.equal(portal.status,'found');
  assert.equal(portal.steps[0].action.type,'assumeGates');
  assert.equal(portal.steps[1].action.type,'travel');
  assert.equal(portal.steps[1].assumed,true);
  const changed=clone(a);
  changed.rooms[0].portals.find(p=>p.id==='vault-to-reliquary')
    .requiresFlag='archive-revealed';
  const c2=covered(changed);
  const p2=planCoverageRoute(changed,createStoryPathRun(changed),
    target(c2,'portal','vault-to-reliquary'),{coverage:c2});
  assert.equal(p2.status,'found');
  assert.ok(p2.steps.some(x=>x.action.trackId==='the-stone-archive'));
  assert.ok(p2.steps.some(x=>x.action.type==='assumeGates'));
  assert.equal(replay(changed,createStoryPathRun(changed),p2).roomId,'reliquary');
});
test('authored event sources must be explicitly assumed and are labeled as such',()=>{
  const a=atlas(),c=covered(a),s=createStoryPathRun(a);
  const boss=target(c,'source','ash-warden');
  const result=planCoverageRoute(a,s,boss,{coverage:c});
  assert.equal(result.status,'found');
  assert.ok(result.steps.some(step=>step.action.type==='source'&&
    step.action.sourceId==='boss:ash-warden'));
  assert.ok(result.steps.find(step=>step.action.sourceId==='boss:ash-warden').assumed);
  assert.equal(replay(a,s,result).flags.includes('ash-warden-fallen'),true);
});
test('a missing flag producer is never conjured; a bounded search never claims impossibility',()=>{
  const a=atlas(),altered=clone(a);
  altered.rooms[1].sequences.tracks.push({
    id:'lost-track',title:'Lost Track',requiresFlag:'missing-unearned',
    completionFlag:'never-earned',beats:[{title:'Lost',seconds:2}],
    once:true,choices:[]
  });
  const c=covered(altered);
  const result=planCoverageRoute(altered,createStoryPathRun(altered),
    target(c,'discovery','lost-track'),{coverage:c,maxStates:100,maxDepth:7});
  assert.notEqual(result.status,'found');
  assert.deepEqual(result.steps,[]);
  assert.ok(result.status==='search-limited'||result.status==='no-route');
  assert.match(result.warning,/Narrative simulation only/);
});
test('limited searches return honest limits; fake targets fail closed',()=>{
  const a=atlas(),s=createStoryPathRun(a),c=covered(a);
  const honor=target(c,'choice','honor');
  const depth=planCoverageRoute(a,s,honor,{coverage:c,maxDepth:1});
  assert.equal(depth.status,'search-limited');
  assert.equal(depth.truncated,true);
  assert.deepEqual(depth.steps,[]);
  const state=planCoverageRoute(a,s,honor,{coverage:c,maxStates:1});
  assert.equal(state.status,'search-limited');
  const missing=planCoverageRoute(a,s,'choice:fake:fake:fake',{coverage:c});
  assert.equal(missing.status,'invalid-target');
  assert.equal(planCoverageRoute(null,s,honor).status,'no-atlas');
  assert.equal(planCoverageRoute(a,null,honor,{coverage:c}).status,'no-atlas');
});
test('undoing a choice makes the opposite route plannable without changing real saves',()=>{
  const a=atlas(),c=covered(a),start=createStoryPathRun(a);
  const honored=replay(a,start,planCoverageRoute(a,start,target(c,'choice','honor'),
    {coverage:c}));
  const undone=advance(a,honored,{type:'undo'});
  const silence=planCoverageRoute(a,undone,target(c,'choice','silence'),
    {coverage:c});
  assert.equal(silence.status,'found');
  assert.deepEqual(silence.steps.map(s=>s.action),[
    {type:'discover',trackId:'forked-echo',choiceId:'silence'}
  ]);
  const outcome=replay(a,undone,silence);
  assert.ok(outcome.flags.includes('echo-silenced'));
  assert.ok(!outcome.flags.includes('echo-honored'));
});
test('already visited rooms and traversed portals are not planned twice',()=>{
  const a=atlas(),c=covered(a),start=createStoryPathRun(a);
  const roomId=target(c,'room','lantern-vault');
  assert.equal(planCoverageRoute(a,start,roomId,{coverage:c}).status,'already-covered');
  const reached=replay(a,start,planCoverageRoute(a,start,
    target(c,'portal','vault-to-reliquary'),{coverage:c}));
  assert.equal(planCoverageRoute(a,reached,target(c,'room','reliquary'),{
    coverage:c}).status,'already-covered');
  assert.equal(planCoverageRoute(a,reached,target(c,'portal','vault-to-reliquary'),{
    coverage:c}).status,'already-covered');
});
test('historical or invalid coverage rows do not become green through the guide',()=>{
  const a=atlas(),s=createStoryPathRun(a),empty=covered(a);
  const honor=planCoverageRoute(a,s,target(empty,'choice','honor'),{
    coverage:empty
  });
  const run=replay(a,s,honor);
  const catalog=addScenario(createScenarioCatalog(),a,run,{name:'Honor only'});
  const current=covered(a,catalog);
  const targets=guidedCoverageTargets(current);
  assert.equal(targets.some(row=>row.kind==='choice'&&row.id.includes('honor')),false);
  assert.equal(targets.some(row=>row.kind==='choice'&&row.id.includes('silence')),true);
  const modified=clone(a);modified.rooms[1].title='Revised Reliquary';
  const stale=covered(modified,catalog);
  const need=guidedCoverageTargets(stale);
  assert.equal(need.some(row=>row.status==='needs-review'),true);
  assert.equal(guidedCoverageTargets(stale,{includeReviewed:false})
    .some(row=>row.status==='needs-review'),false);
});
test('a simulator change invalidates a UI plan fingerprint without mutating any state',()=>{
  const a=atlas(),start=createStoryPathRun(a);
  const before=guideStateFingerprint(start);
  const after=advance(a,start,{type:'discover',trackId:'the-stone-archive'});
  assert.notEqual(guideStateFingerprint(after),before);
  assert.equal(guideStateFingerprint(start),before);
  const undo=advance(a,after,{type:'undo'});
  assert.equal(guideStateFingerprint(undo),before);
});
test('legacy atlases and empty or disconnected route targets remain safe',()=>{
  const a=atlas();
  for(const room of a.rooms)delete room.sequences;
  const c=covered(a),s=createStoryPathRun(a);
  assert.equal(c.rows.some(x=>x.kind==='discovery'),false);
  assert.equal(planCoverageRoute(a,s,'discovery:fake:missing',{coverage:c})
    .status,'invalid-target');
  const source=c.rows.find(r=>r.kind==='source');
  assert.ok(source);
  const plan=planCoverageRoute(a,s,source.id,{coverage:c});
  assert.equal(plan.status,'found');
  assert.ok(plan.steps.length>0);
});
test('Rung 19 editor is keyboard operable and only applies explicit Rung 15 actions',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const guide=readFileSync(new URL('../layer-studio/story-coverage-guide.js',import.meta.url),'utf8');
  for(const id of ['storyGuideTarget','storyGuideFind','storyGuideNext',
    'storyGuideStatus','storyGuideSteps'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/planCoverageRoute/);
  assert.match(studio,/guideStateFingerprint/);
  assert.match(studio,/advanceStoryPath\(atlas,storySimState,next\.action\)/);
  assert.match(studio,/storyGuideNext/);
  assert.match(studio,/Plan Route/);
  assert.match(studio,/textContent=step\.label/);
  assert.doesNotMatch(guide,/localStorage|sessionStorage|fetch\(|eval\(|document\.|innerHTML/);
});
