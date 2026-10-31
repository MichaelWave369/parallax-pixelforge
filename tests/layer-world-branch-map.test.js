import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {makeStarterAtlas} from '../layer-studio/room-atlas.js';
import {analyzeWorldBranches} from '../layer-studio/world-branch-map.js';
import {renderWorldBranchMap,selectBranchNodes} from '../layer-studio/world-branch-view.js';

function sample(){
  const root=createScene();
  root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root);
}
function issue(report,code){return report.diagnostics.filter(d=>d.code===code)}
function extraTrack(id,requiresFlag,completionFlag,unlessFlag=''){
  return {id,title:id,beats:[{title:id,text:'Discovery',seconds:2}],
    requiresFlag,completionFlag,unlessFlag,once:true,choices:[]};
}
test('starter branch graph links Stone Archive, Forked Echo, exclusive flags and quest/door consumers',()=>{
  const root=sample(),original=JSON.stringify(root);
  const g=analyzeWorldBranches(root.atlas);
  assert.deepEqual(g.summary,{
    rooms:2,sequences:4,flags:10,connections:16,warnings:0,errors:0,
    potentiallyReachable:4
  });
  assert.equal(g.diagnostics.length,0);
  assert.equal(g.nodes.some(n=>n.id==='track:lantern-vault:the-stone-archive'),true);
  assert.equal(g.edges.some(e=>e.from==='track:lantern-vault:the-stone-archive'&&
    e.to==='flag:archive-revealed'&&e.kind==='grant'),true);
  assert.equal(g.edges.some(e=>e.from==='flag:archive-revealed'&&
    e.to==='track:reliquary:forked-echo'&&e.kind==='requires'),true);
  assert.equal(g.edges.some(e=>e.from==='track:reliquary:forked-echo'&&
    e.to==='flag:echo-honored'&&e.kind==='choice'),true);
  assert.equal(g.edges.some(e=>e.from==='flag:echo-silenced'&&
    e.to==='track:reliquary:promise-path'&&e.kind==='blocks'),true);
  assert.equal(g.reachability.tracks.length,4);
  // Branch analysis must never mutate the authoring/export payload.
  assert.equal(JSON.stringify(root),original);
});
test('unknown prerequisites show both missing producers and unreachable tracks',()=>{
  const root=sample();
  root.atlas.rooms[0].sequences.tracks.push(extraTrack('lost','forgotten-flag','lost-done'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'missing-producer').some(d=>d.subject==='track:lantern-vault:lost'),true);
  assert.equal(issue(g,'unreachable-sequence').some(d=>d.subject==='track:lantern-vault:lost'),true);
  assert.equal(g.reachability.flags.includes('lost-done'),false);
});
test('negative guards with no producer are advisory, not positive missing-prerequisite warnings',()=>{
  const root=sample();
  root.atlas.rooms[0].sequences.tracks.push(extraTrack('optional','','optional-done','nonexistent'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'never-blocking-guard').some(d=>d.subject==='track:lantern-vault:optional'),true);
  assert.equal(issue(g,'missing-producer').some(d=>d.subject==='track:lantern-vault:optional'),false);
  assert.equal(g.reachability.tracks.includes('track:lantern-vault:optional'),true);
});
test('contradictory positive and negative guards cannot be satisfied',()=>{
  const root=sample(),room=root.atlas.rooms[0];
  room.sequences.tracks.push(extraTrack('paradox','archive-revealed','paradox-done','archive-revealed'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'contradictory-guard').length,1);
  assert.equal(g.summary.errors,1);
  assert.equal(g.reachability.tracks.includes('track:lantern-vault:paradox'),false);
});
test('discovery requiring its own completion flag is a self-dependency',()=>{
  const root=sample();
  root.atlas.rooms[0].sequences.tracks.push(extraTrack('self','self-done','self-done'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'self-dependency').length,1);
  assert.equal(issue(g,'dependency-cycle').length,1);
  assert.equal(issue(g,'unreachable-sequence').length,1);
});
test('a two-track circular prerequisite chain emits a cycle warning, and both are unreachable',()=>{
  const root=sample(),room=root.atlas.rooms[0];
  room.sequences.tracks.push(extraTrack('alpha','beta-earned','alpha-earned'));
  room.sequences.tracks.push(extraTrack('beta','alpha-earned','beta-earned'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'dependency-cycle').length,1);
  assert.match(issue(g,'dependency-cycle')[0].description,/Alpha|alpha/i);
  assert.equal(issue(g,'unreachable-sequence').length,2);
  assert.equal(g.summary.errors,0);
});
test('an externally seeded cycle is only a warning, not declared impossible',()=>{
  const root=sample(),room=root.atlas.rooms[0];
  room.sequences.tracks.push(extraTrack('alpha','archive-revealed','beta-earned'));
  room.sequences.tracks.push(extraTrack('beta','beta-earned','archive-revealed'));
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'dependency-cycle').length,1);
  assert.equal(g.reachability.tracks.includes('track:lantern-vault:alpha'),true);
  assert.equal(g.reachability.tracks.includes('track:lantern-vault:beta'),true);
  assert.equal(issue(g,'unreachable-sequence').length,0);
});
test('a room with no portal path is detected even if its discovery has no flag prerequisite',()=>{
  const root=sample(),room=root.atlas.rooms[1];
  const hidden={...room,id:'hidden-chamber',title:'Hidden Chamber',portals:[],boss:undefined,
    sequences:{schema:'pixelforge.layer-world-sequences.v1',
      tracks:[extraTrack('hidden-track','','hidden-earned')]}};
  root.atlas.rooms.push(hidden);
  const g=analyzeWorldBranches(root.atlas);
  assert.equal(issue(g,'unreachable-room').length,1);
  assert.equal(issue(g,'unreachable-sequence').some(d=>d.subject==='track:hidden-chamber:hidden-track'),true);
});
test('an authored choice creates two possible outcomes, not a guarantee both occur together',()=>{
  const g=analyzeWorldBranches(sample().atlas);
  assert.ok(g.reachability.flags.includes('echo-honored'));
  assert.ok(g.reachability.flags.includes('echo-silenced'));
  assert.ok(g.reachability.tracks.includes('track:reliquary:promise-path'));
  assert.ok(g.reachability.tracks.includes('track:reliquary:silence-path'));
  // The optimistic reachability data is advisory, not actual player choices.
  assert.equal(g.summary.potentiallyReachable,4);
});
test('global authored event flags and boss rewards appear as source nodes',()=>{
  const g=analyzeWorldBranches(sample().atlas);
  const sources=g.nodes.filter(n=>n.kind==='source');
  assert.ok(sources.some(n=>n.detail==='World Director flag trigger'));
  assert.ok(sources.some(n=>n.detail==='Story dialogue choice'));
  assert.ok(sources.some(n=>n.detail==='Boss defeat'));
  assert.ok(g.edges.some(e=>e.to==='flag:ash-warden-fallen'&&e.kind==='grant'));
});
test('room-scoped branch view includes relevant cross-room flag producers',()=>{
  const g=analyzeWorldBranches(sample().atlas);
  const all=selectBranchNodes(g);
  const scoped=selectBranchNodes(g,'reliquary');
  assert.equal(all.length,g.nodes.length);
  assert.ok(scoped.length<all.length);
  assert.ok(scoped.some(n=>n.id==='track:reliquary:forked-echo'));
  assert.ok(scoped.some(n=>n.id==='flag:archive-revealed'));
  assert.ok(scoped.some(n=>n.id==='track:lantern-vault:the-stone-archive'));
});
test('colon-containing authored IDs generate collision-safe graph identifiers',()=>{
  const root=sample(),room=root.atlas.rooms[0];
  room.sequences.tracks.push(extraTrack('one:two','','special:done'));
  room.sequences.tracks.push(extraTrack('one','special:done','special-done'));
  const g=analyzeWorldBranches(root.atlas);
  assert.ok(g.nodes.some(n=>n.id==='track:lantern-vault:one%3Atwo'));
  assert.ok(g.nodes.some(n=>n.id==='flag:special%3Adone'));
  assert.equal(new Set(g.nodes.map(n=>n.id)).size,g.nodes.length);
});
test('renderer paints accessible SVG nodes, colored edges and keyboard-selectable controls',()=>{
  class FakeElement {
    constructor(tag){this.tagName=tag;this.attrs={};this.children=[];this.listeners={};
      this.textContent='';}
    setAttribute(k,v){this.attrs[k]=String(v)}
    append(...children){this.children.push(...children)}
    replaceChildren(...children){this.children=[...children]}
    addEventListener(k,fn){this.listeners[k]=fn}
  }
  const old=globalThis.document;
  globalThis.document={createElementNS:(_ns,tag)=>new FakeElement(tag)};
  try{
    const svg=new FakeElement('svg'),atlas=sample().atlas;
    let picked=null;
    const state=renderWorldBranchMap(svg,atlas,{
      selectedId:'track:reliquary:forked-echo',onSelect:n=>{picked=n}
    });
    assert.equal(state.report.summary.sequences,4);
    assert.equal(state.visibleNodes,state.report.nodes.length);
    assert.ok(state.visibleEdges>0);
    assert.equal(state.truncated,0);
    assert.equal(svg.attrs.role,'group');
    const nodes=svg.children.filter(c=>c.tagName==='g'&&c.attrs['data-node-id']);
    assert.ok(nodes.length>0);
    const fork=nodes.find(n=>n.attrs['data-node-id']==='track:reliquary:forked-echo');
    assert.ok(fork);
    assert.equal(fork.attrs.tabindex,'0');
    assert.match(fork.attrs.class,/branch-map-node--selected/);
    fork.listeners.keydown({key:'Enter',preventDefault(){}});
    assert.equal(picked.id,'track:reliquary:forked-echo');
    const edges=svg.children.find(x=>x.attrs.class==='branch-map-edges');
    assert.ok(edges.children.some(e=>e.attrs.class.includes('branch-map-edge--blocks')));
    assert.ok(edges.children.some(e=>e.attrs.class.includes('branch-map-edge--choice')));
  }finally{
    if(old===undefined)delete globalThis.document;
    else globalThis.document=old;
  }
});
test('empty and malformed scene requests remain safe and never create network or script content',()=>{
  const g=analyzeWorldBranches(null);
  assert.equal(g.nodes.length,0);
  assert.equal(g.edges.length,0);
  assert.equal(g.summary.rooms,0);
  const root=sample(),room=root.atlas.rooms[0];
  room.sequences.tracks[0].title='<img src=x onerror=alert(1)>';
  const report=analyzeWorldBranches(root.atlas);
  const t=report.nodes.find(n=>n.id==='track:lantern-vault:the-stone-archive');
  assert.equal(t.label,'<img src=x onerror=alert(1)>');
  const viewer=readFileSync(new URL('../layer-studio/world-branch-view.js',import.meta.url),'utf8');
  assert.doesNotMatch(viewer,/\.innerHTML\s*=/);
  assert.match(viewer,/\.textContent=/);
});
test('Studio contains live room selector, diagnostics, selected-node edit and refresh UI',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  for(const id of ['branchMapScope','branchMapRefresh','branchMapEdit','branchMapSummary',
    'branchMapScroll','branchMapCanvas','branchMapSelection','branchMapDiagnostics'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(studio,/syncBranchMap/);
  assert.match(studio,/renderWorldBranchMap/);
  assert.match(studio,/analyzeWorldBranches/);
  assert.match(studio,/branchMapEdit/);
  assert.match(studio,/syncSequenceControls\(\)/);
});
