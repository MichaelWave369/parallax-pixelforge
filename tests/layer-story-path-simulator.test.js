import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {analyzeWorldBranches} from '../layer-studio/world-branch-map.js';
import {renderWorldBranchMap} from '../layer-studio/world-branch-view.js';
import {
  createStoryPathRun,storyPathOptions,advanceStoryPath,storyPathSummary
} from '../layer-studio/story-path-simulator.js';

function sample(){
  const root=createScene();
  root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root).atlas;
}
function step(atlas,state,action){
  const r=advanceStoryPath(atlas,state,action);
  assert.equal(r.ok,true,r.reason||JSON.stringify(action));
  return r.state;
}
function startFork(atlas=sample()){
  let run=createStoryPathRun(atlas);
  run=step(atlas,run,{type:'discover',trackId:'the-stone-archive'});
  run=step(atlas,run,{type:'assumeGates',value:true});
  run=step(atlas,run,{type:'travel',portalId:'vault-to-reliquary'});
  return run;
}
function forkDecision(atlas,run,choiceId){
  return step(atlas,run,{type:'discover',trackId:'forked-echo',choiceId});
}

test('simulator starts in actual authored start room with empty local-only progress',()=>{
  const atlas=sample(),before=JSON.stringify(atlas);
  const s=createStoryPathRun(atlas);
  assert.deepEqual(s,{
    roomId:'lantern-vault',flags:[],seen:[],sources:[],
    visited:['lantern-vault'],assumeGates:false,history:[]
  });
  assert.equal(storyPathOptions(atlas,s).room.title,atlas.rooms[0].title);
  assert.deepEqual(storyPathOptions(atlas,s).tracks.map(x=>x.ready),[true]);
  assert.deepEqual(storyPathSummary(atlas,s).flags,[]);
  assert.equal(JSON.stringify(atlas),before);
});
test('Stone Archive completion unlocks fork flag but does not silently resolve a branch',()=>{
  const atlas=sample(),base=createStoryPathRun(atlas);
  const unavailable=advanceStoryPath(atlas,base,{
    type:'discover',trackId:'forked-echo',choiceId:'honor'});
  assert.equal(unavailable.ok,false);
  assert.equal(unavailable.state,base);
  const after=step(atlas,base,{type:'discover',trackId:'the-stone-archive'});
  assert.deepEqual(after.flags,['archive-revealed']);
  assert.deepEqual(after.seen,['lantern-vault:the-stone-archive']);
  assert.equal(after.roomId,'lantern-vault');
  assert.equal(storyPathOptions(atlas,after).tracks[0].ready,false);
  assert.equal(storyPathSummary(atlas,after).completed,1);
});
test('portal travel never bypasses authored flags or non-flag gates without explicit assumption',()=>{
  const atlas=sample(),s=createStoryPathRun(atlas);
  const blocked=storyPathOptions(atlas,s).portals[0];
  assert.equal(blocked.ready,false);
  assert.match(blocked.reasons.join(' '),/Unverified key/);
  assert.equal(advanceStoryPath(atlas,s,{
    type:'travel',portalId:'vault-to-reliquary'}).ok,false);
  const allowed=step(atlas,s,{type:'assumeGates',value:true});
  assert.equal(storyPathOptions(atlas,allowed).portals[0].ready,true);
  const next=step(atlas,allowed,{type:'travel',portalId:'vault-to-reliquary'});
  assert.equal(next.roomId,'reliquary');
  assert.deepEqual(next.visited,['lantern-vault','reliquary']);
  assert.match(next.history.at(-1).label,/assumed/);
  const modified=sample();
  modified.rooms[0].portals[0].requiresFlag='echo-honored';
  const m=step(modified,createStoryPathRun(modified),
    {type:'assumeGates',value:true});
  assert.equal(storyPathOptions(modified,m).portals[0].ready,false);
  assert.match(storyPathOptions(modified,m).portals[0].reasons.join(' '),/echo-honored/);
});
test('Forked Echo requires an explicit valid authored answer and honors exclusivity',()=>{
  const atlas=sample(),s=startFork(atlas);
  const fork=storyPathOptions(atlas,s).tracks.find(t=>t.id==='forked-echo');
  assert.equal(fork.ready,true);
  assert.deepEqual(fork.choices.map(c=>c.id),['honor','silence']);
  for(const invalid of [undefined,'imaginary','__proto__']){
    const failure=advanceStoryPath(atlas,s,{
      type:'discover',trackId:'forked-echo',choiceId:invalid});
    assert.equal(failure.ok,false);
    assert.equal(failure.state,s);
  }
  const honored=forkDecision(atlas,s,'honor');
  assert.ok(honored.flags.includes('fork-decided'));
  assert.ok(honored.flags.includes('echo-honored'));
  assert.equal(honored.flags.includes('echo-silenced'),false);
  const tracks=storyPathOptions(atlas,honored).tracks;
  assert.equal(tracks.find(t=>t.id==='forked-echo').ready,false);
  assert.equal(advanceStoryPath(atlas,honored,{
    type:'discover',trackId:'forked-echo',choiceId:'silence'}).ok,false);
});
test('one specific branch unlocks its follow-up and blocks the other',()=>{
  const atlas=sample();
  for(const [answer,allowed,blocked,outFlag] of [
    ['honor','promise-path','silence-path','promise-kept'],
    ['silence','silence-path','promise-path','chamber-hushed']
  ]){
    const s=forkDecision(atlas,startFork(atlas),answer);
    const options=storyPathOptions(atlas,s).tracks;
    assert.equal(options.find(t=>t.id===allowed).ready,true);
    assert.equal(options.find(t=>t.id===blocked).ready,false);
    assert.equal(advanceStoryPath(atlas,s,{
      type:'discover',trackId:blocked}).ok,false);
    const finished=step(atlas,s,{type:'discover',trackId:allowed});
    assert.ok(finished.flags.includes(outFlag));
    assert.ok(finished.seen.includes('reliquary:'+allowed));
    assert.equal(storyPathOptions(atlas,finished).tracks
      .find(t=>t.id===allowed).ready,false);
  }
});
test('undo reverses earned flags, resolved branches, travel, and gate assumptions',()=>{
  const atlas=sample(),base=startFork(atlas);
  const picked=forkDecision(atlas,base,'silence');
  const done=step(atlas,picked,{type:'discover',trackId:'silence-path'});
  const undone=step(atlas,done,{type:'undo'});
  assert.equal(undone.flags.includes('chamber-hushed'),false);
  assert.equal(undone.flags.includes('echo-silenced'),true);
  const changed=step(atlas,undone,{type:'undo'});
  assert.equal(changed.flags.includes('echo-silenced'),false);
  assert.equal(changed.flags.includes('fork-decided'),false);
  assert.equal(storyPathOptions(atlas,changed).tracks.find(t=>t.id==='forked-echo').ready,true);
  const opposite=forkDecision(atlas,changed,'honor');
  assert.equal(storyPathOptions(atlas,opposite).tracks.find(t=>t.id==='promise-path').ready,true);
  const undoneTravel=step(atlas,step(atlas,step(atlas,base,{type:'undo'}),{type:'undo'}),
    {type:'undo'});
  assert.equal(undoneTravel.roomId,'lantern-vault');
  assert.equal(undoneTravel.assumeGates,false);
  assert.deepEqual(undoneTravel.flags,[]);
  assert.equal(undoneTravel.history.length,0);
});
test('reset clears the hypothetical session and never mutates the atlas or live saves',()=>{
  const atlas=sample(),original=JSON.stringify(atlas);
  const s=forkDecision(atlas,startFork(atlas),'honor');
  const reset=step(atlas,s,{type:'reset'});
  assert.deepEqual(reset,createStoryPathRun(atlas));
  assert.equal(JSON.stringify(atlas),original);
  assert.equal('worldFlags' in atlas,false);
  assert.equal('storySimState' in atlas,false);
});
test('authored source assumptions are explicit and story dialogue once-choice is exclusive',()=>{
  const atlas=sample(),s=startFork(atlas);
  const options=storyPathOptions(atlas,s);
  assert.ok(options.sources.some(e=>e.kind==='trigger'&&e.flag==='reliquary-awakened'));
  assert.ok(options.sources.some(e=>e.kind==='boss'&&e.flag==='ash-warden-fallen'));
  assert.ok(options.sources.some(e=>e.kind==='dialogue'&&e.flag==='reliquary-lit'));
  const chosen=step(atlas,s,{type:'source',sourceId:'dialogue:keeper-choice:restore'});
  assert.ok(chosen.flags.includes('reliquary-lit'));
  assert.equal(chosen.flags.includes('reliquary-silent'),false);
  assert.equal(advanceStoryPath(atlas,chosen,{
    type:'source',sourceId:'dialogue:keeper-choice:quiet'}).ok,false);
  const boss=step(atlas,chosen,{type:'source',sourceId:'boss:ash-warden'});
  assert.ok(boss.flags.includes('ash-warden-fallen'));
  assert.ok(boss.sources.includes('reliquary:boss:ash-warden'));
  assert.equal(storyPathOptions(atlas,boss).sources.some(x=>x.kind==='boss'),false);
  assert.equal(advanceStoryPath(atlas,boss,{
    type:'source',sourceId:'boss:ash-warden'}).ok,false);
});
test('unknown actions, invented tracks, forged source IDs and empty undo never alter state',()=>{
  const atlas=sample(),s=createStoryPathRun(atlas),original=JSON.stringify(s);
  const bad=[
    {type:'teleport',roomId:'reliquary'},
    {type:'source',sourceId:'javascript:alert(1)'},
    {type:'discover',trackId:'__proto__'},
    {type:'travel',portalId:'fake-gate'},
    {type:'undo'},
    {type:'assumeGates',value:'yes'},
    {type:'assumeGates',value:false}
  ];
  for(const action of bad){
    const out=advanceStoryPath(atlas,s,action);
    assert.equal(out.ok,false);
    assert.equal(out.state,s);
  }
  assert.equal(JSON.stringify(s),original);
});
test('64-step bound limits simulator history without impacting undone or reset runs',()=>{
  const atlas=sample();
  let s=createStoryPathRun(atlas);
  for(let i=0;i<64;i++)s=step(atlas,s,{type:'assumeGates',value:i%2===0});
  assert.equal(s.history.length,64);
  const blocked=advanceStoryPath(atlas,s,{type:'assumeGates',value:true});
  assert.equal(blocked.ok,false);
  assert.match(blocked.reason,/64-step/);
  s=step(atlas,s,{type:'undo'});
  assert.equal(s.history.length,63);
  s=step(atlas,s,{type:'reset'});
  assert.equal(s.history.length,0);
});
test('legacy atlas without choices/sequences and standalone scene remain safe',()=>{
  const atlas=sample();
  for(const room of atlas.rooms)delete room.sequences;
  const s=createStoryPathRun(atlas);
  const options=storyPathOptions(atlas,s);
  assert.deepEqual(options.tracks,[]);
  assert.equal(storyPathSummary(atlas,s).totalTracks,0);
  const empty=createStoryPathRun(null);
  assert.equal(empty.roomId,null);
  assert.equal(storyPathOptions(null,empty).room,null);
  assert.equal(advanceStoryPath(null,empty,{type:'reset'}).ok,false);
});
test('World Branch Map marks earned flags, ready paths and completed discoveries per simulation',()=>{
  class FakeElement{
    constructor(name){this.tagName=name;this.children=[];this.attrs={};this.listeners={};this.textContent=''}
    setAttribute(k,v){this.attrs[k]=String(v)}
    append(...parts){this.children.push(...parts)}
    replaceChildren(...parts){this.children=[...parts]}
    addEventListener(k,cb){this.listeners[k]=cb}
  }
  const original=globalThis.document;
  globalThis.document={createElementNS:(_ns,name)=>new FakeElement(name)};
  try{
    const atlas=sample(),s=startFork(atlas),g=analyzeWorldBranches(atlas);
    const svg=new FakeElement('svg'),options=storyPathOptions(atlas,s);
    renderWorldBranchMap(svg,atlas,{graph:g,simulator:{
      roomId:s.roomId,flags:s.flags,
      readyTracks:options.tracks.filter(t=>t.ready).map(t=>
        'track:'+encodeURIComponent(s.roomId)+':'+encodeURIComponent(t.id)),
      completedTracks:g.nodes.filter(n=>n.kind==='track'&&
        s.seen.includes(n.roomId+':'+n.trackId)).map(n=>n.id)
    }});
    const nodes=svg.children.filter(e=>e.attrs['data-node-id']);
    const archive=nodes.find(x=>x.attrs['data-node-id']==='flag:archive-revealed');
    const fork=nodes.find(x=>x.attrs['data-node-id']==='track:reliquary:forked-echo');
    const completed=nodes.find(x=>x.attrs['data-node-id']==='track:lantern-vault:the-stone-archive');
    assert.match(archive.attrs.class,/branch-map-node--sim-earned/);
    assert.match(fork.attrs.class,/branch-map-node--sim-ready/);
    assert.match(completed.attrs.class,/branch-map-node--sim-finished/);
    assert.match(archive.attrs['aria-label'],/Earned in simulated run/);
  }finally{
    if(original===undefined)delete globalThis.document;
    else globalThis.document=original;
  }
});
test('editor controls exist and are connected to runtime-free simulator',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const simulation=readFileSync(new URL('../layer-studio/story-path-simulator.js',import.meta.url),'utf8');
  for(const id of ['storySimReset','storySimUndo','storySimAssumeGates',
    'storySimStatus','storySimSources','storySimTracks','storySimPortals',
    'storySimFlags','storySimHistory'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/ensureStorySimulator/);
  assert.match(studio,/storySimSignature/);
  assert.match(studio,/stepStorySimulator/);
  assert.match(studio,/renderStorySimulator/);
  assert.match(studio,/renderWorldBranchMap/);
  assert.doesNotMatch(simulation,/localStorage|sessionStorage|fetch\(|eval\(|innerHTML|document\./);
});
