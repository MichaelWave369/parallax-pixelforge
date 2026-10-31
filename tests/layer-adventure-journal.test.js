import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {startPuzzle,stepPuzzle} from '../layer-studio/puzzle.js';
import {
  makeStarterAtlas,normalizeAtlas,availableRelicKeys,createWorldSession,
  stepWorldSession,atlasMapData,renderRelics
} from '../layer-studio/room-atlas.js';
import {
  SAVE_SCHEMA,SLOT_COUNT,worldFingerprint,slotStorageKey,captureSave,
  restoreSave,writeSaveSlot,readSaveSlot,inspectSaveSlot,deleteSaveSlot
} from '../layer-studio/adventure-journal.js';

function makeWorld(){
  const scene=createScene();
  scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
}
function fakeStore(){
  const data=new Map();
  return {
    getItem(k){return data.has(k)?data.get(k):null;},
    setItem(k,v){data.set(k,String(v));},
    removeItem(k){data.delete(k);}
  };
}
function walkToPortal(session){
  const room=session.atlas.rooms.find(r=>r.id===session.roomId);
  const door=room.portals[0];
  session.game.player.x=door.x+3;
  session.game.player.y=door.y+door.h-42;
  session.game.player.grounded=true;
  return stepWorldSession(session,{interactPressed:true});
}

test('starter world contains two independently named relics while old scenes remain untouched',()=>{
  const root=makeWorld();
  assert.deepEqual(availableRelicKeys(root.atlas),
    ['lantern-vault:lantern-shard','reliquary:echo-seal']);
  assert.equal(root.atlas.rooms[0].relics[0].name,'Lantern Shard');
  const copy=normalizeScene(JSON.parse(JSON.stringify(root)));
  assert.deepEqual(copy.atlas,root.atlas);
  const old=createWorldSession(createScene());
  assert.equal(old.atlas,null);
  assert.equal(old.inventory.size,0);
  const oldGame=startPuzzle(createScene());
  oldGame.keyCollected=true;
  oldGame.player.x=oldGame.puzzle.gate.x;
  oldGame.player.y=oldGame.puzzle.gate.y+20;
  stepPuzzle(oldGame,{});
  assert.equal(oldGame.status,'won');
});
test('relics collect once and remain in inventory during backtracking',()=>{
  const session=createWorldSession(makeWorld());
  session.game.player.x=310;session.game.player.y=335;session.game.player.grounded=false;
  stepWorldSession(session);
  assert.equal(session.inventory.has('lantern-vault:lantern-shard'),true);
  assert.equal(session.inventory.size,1);
  assert.match(session.notice,/LANTERN SHARD/);
  stepWorldSession(session);
  assert.equal(session.inventory.size,1);
  session.game.keyCollected=true;
  assert.equal(walkToPortal(session).travelled,true);
  assert.equal(session.visitedRooms.has('reliquary'),true);
  session.game.player.x=1190;session.game.player.y=432;session.game.player.grounded=false;
  stepWorldSession(session);
  assert.equal(session.inventory.has('reliquary:echo-seal'),true);
  assert.equal(session.inventory.size,2);
  assert.equal(walkToPortal(session).travelled,true);
  assert.equal(session.roomId,'lantern-vault');
  session.game.player.x=310;session.game.player.y=335;
  stepWorldSession(session);
  assert.equal(session.inventory.size,2);
  const map=atlasMapData(session);
  assert.equal(map.rooms.length,2);
  assert.equal(map.edges.length,2);
  assert.equal(map.rooms[0].collected,1);
  assert.equal(map.rooms[1].collected,1);
  assert.ok(map.rooms.every(r=>r.visited));
});
test('an authored relic-gated door refuses travel until the specific inventory item is found',()=>{
  const root=makeWorld();
  root.atlas.rooms[0].portals[0].requiresRelic='lantern-vault:lantern-shard';
  const session=createWorldSession(root);
  session.game.keyCollected=true;
  assert.equal(walkToPortal(session).denied,'relic');
  session.game.player.x=314;session.game.player.y=335;
  stepWorldSession(session);
  assert.ok(session.inventory.has('lantern-vault:lantern-shard'));
  assert.equal(walkToPortal(session).travelled,true);
});
test('untrusted relic metadata and unsupported key requirements are bounded and inert',()=>{
  const root=makeWorld();
  const atlas=root.atlas;
  atlas.rooms[0].relics=[
    {id:'same',name:'N'.repeat(300),x:Infinity,y:-6000,code:'alert(1)'},
    {id:'same',name:'Other',x:8000,y:9000}
  ];
  atlas.rooms[0].portals[0].requiresRelic='missing:no-such-relic';
  const normalized=normalizeAtlas(atlas,scene=>normalizeScene({...scene,atlas:null}));
  assert.equal(normalized.rooms[0].relics.length,2);
  assert.notEqual(normalized.rooms[0].relics[0].id,normalized.rooms[0].relics[1].id);
  assert.equal(normalized.rooms[0].relics[0].name.length,70);
  assert.equal(normalized.rooms[0].relics[0].x,350);
  assert.equal(normalized.rooms[0].relics[0].y,-200);
  assert.equal(normalized.rooms[0].relics[1].x,6000);
  assert.equal('code' in normalized.rooms[0].relics[0],false);
  assert.equal(normalized.rooms[0].portals[0].requiresRelic,'');
  atlas.rooms[0].relics=Array.from({length:30},(_,i)=>({id:'r'+i}));
  assert.equal(normalizeAtlas(atlas,scene=>normalizeScene({...scene,atlas:null})).rooms[0].relics.length,8);
});
test('manual save slot round trip restores active room, hero, health, relics and progress',()=>{
  const root=makeWorld(),store=fakeStore(),session=createWorldSession(root);
  session.game.player.x=312;session.game.player.y=335;
  stepWorldSession(session);
  session.game.keyCollected=true;
  session.game.checkpoint={id:'far-bank-beacon',x:930,y:458};
  session.game.enemies[0].stone=true;
  session.game.petrified=1;
  session.game.directorSeen.add('vault-whisper');
  session.game.health=2;
  assert.equal(walkToPortal(session).travelled,true);
  session.game.player.x=1185;session.game.player.y=430;
  stepWorldSession(session);
  session.game.player.x=400;session.game.player.y=458;
  session.game.deaths=2;
  const saved=writeSaveSlot(store,root,session,2);
  assert.equal(saved.schema,SAVE_SCHEMA);
  assert.equal(saved.slot,2);assert.equal(saved.roomId,'reliquary');
  assert.equal(saved.health,2);assert.equal(saved.inventory.length,2);
  assert.equal(SLOT_COUNT,3);
  assert.match(slotStorageKey(root,2),/^pixelforge\.layer-save\.v1\./);
  assert.equal(inspectSaveSlot(store,root,2).roomId,'reliquary');
  const resumed=readSaveSlot(store,root,2);
  assert.equal(resumed.roomId,'reliquary');
  assert.equal(resumed.game.health,2);
  assert.equal(resumed.game.deaths,2);
  assert.equal(resumed.game.player.x,400);
  assert.equal(resumed.game.player.y,458);
  assert.equal(resumed.inventory.size,2);
  assert.equal(resumed.visitedRooms.size,2);
  assert.equal(resumed.transitions,1);
  assert.equal(resumed.game.checkpoint,null);
  assert.equal(walkToPortal(resumed).travelled,true);
  assert.equal(resumed.game.keyCollected,true);
  assert.equal(resumed.game.checkpoint?.x,930);
  assert.equal(resumed.game.enemies[0].stone,true);
  assert.equal(resumed.game.directorSeen.has('vault-whisper'),true);
});
test('single-room manual save restores old Stonebridge with no Room Atlas',()=>{
  const root=createScene(),store=fakeStore(),session=createWorldSession(root);
  session.game.keyCollected=true;
  session.game.player.x=520;session.game.player.y=458;
  const save=writeSaveSlot(store,root,session,1);
  assert.equal(save.roomId,'single');
  const restored=readSaveSlot(store,root,1);
  assert.equal(restored.atlas,null);
  assert.equal(restored.game.keyCollected,true);
  assert.equal(restored.game.player.x,520);
  assert.equal(restored.game.worldTravel,false);
  assert.deepEqual(atlasMapData(restored),{rooms:[],edges:[]});
});
test('save slots isolate modified authored worlds and allow intentional deletion',()=>{
  const world=makeWorld(),store=fakeStore();
  writeSaveSlot(store,world,createWorldSession(world),1);
  assert.equal(inspectSaveSlot(store,world,1).slot,1);
  assert.equal(inspectSaveSlot(store,world,2),null);
  const modified=structuredClone(world);
  modified.atlas.rooms[0].portals[0].label='ANOTHER DOOR';
  assert.notEqual(worldFingerprint(world),worldFingerprint(modified));
  assert.equal(readSaveSlot(store,modified,1),null);
  const foreign={...captureSave(world,createWorldSession(world),1),fingerprint:'other-world'};
  assert.throws(()=>restoreSave(world,foreign),/different version/);
  deleteSaveSlot(store,world,1);
  assert.equal(readSaveSlot(store,world,1),null);
  assert.throws(()=>writeSaveSlot(store,world,createWorldSession(world),4),/slot 1, 2, or 3/);
});
test('malformed local saves cannot inject unknown rooms, inventory or checkpoint targets',()=>{
  const world=makeWorld(),session=createWorldSession(world);
  const data=captureSave(world,session,1);
  data.roomId='fictional-room';
  assert.throws(()=>restoreSave(world,data),/Save room is missing/);
  data.roomId='lantern-vault';
  data.inventory=['fictional-room:holy-grail','reliquary:echo-seal'];
  data.player={x:10000000,y:-10000};
  data.health=900;data.deaths=-5;
  data.snapshots['lantern-vault']={
    keyCollected:true,stones:['unknown','bridge-sentinel'],
    seen:['unknown','vault-whisper'],
    checkpoint:{id:'made-up',x:999999,y:-999}
  };
  const loaded=restoreSave(world,data);
  assert.equal(loaded.inventory.size,1);
  assert.equal(loaded.game.player.x,loaded.game.puzzle.worldWidth-loaded.game.player.w);
  assert.equal(loaded.game.player.y,-200);
  assert.equal(loaded.game.health,3);assert.equal(loaded.game.deaths,0);
  assert.equal(loaded.game.keyCollected,true);
  assert.equal(loaded.game.enemies[0].stone,true);
  assert.equal(loaded.game.checkpoint,null);
  assert.deepEqual([...loaded.game.directorSeen],['vault-whisper']);
});
test('relic rendering uses original Canvas 2D only and map reveals visited status',()=>{
  const session=createWorldSession(makeWorld());
  let rectangles=0,polygons=0;
  const ctx=new Proxy({},{
    get(t,k){if(k in t)return t[k];if(k==='fillRect')return ()=>{rectangles++};
      if(k==='closePath')return ()=>{polygons++};return ()=>{};},
    set(t,k,v){t[k]=v;return true;}
  });
  renderRelics(ctx,session,0);
  assert.ok(rectangles>0&&polygons>0);
  const map=atlasMapData(session);
  assert.equal(map.rooms[0].active,true);
  assert.equal(map.rooms[1].visited,false);
  assert.equal(map.rooms[0].total,1);
});
test('play route provides real map, inventory and save journal controls',()=>{
  const html=readFileSync(new URL('../layer-studio/play.html',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  for(const id of ['mapButton','inventoryButton','journalButton','journalPanel',
    'journalContent','journalTitle','closeJournal'])
    assert.match(html,new RegExp('id="'+id+'"'));
  for(const id of ['atlasRelic','relicName','relicX','relicY',
    'addRelic','removeRelic','portalRequiresRelic'])
    assert.match(editor,new RegExp('id="'+id+'"'));
  assert.match(play,/writeSaveSlot/);assert.match(play,/readSaveSlot/);
  assert.match(play,/KeyM/);assert.match(play,/KeyI/);assert.match(play,/KeyJ/);
  assert.match(play,/atlasMapData/);assert.match(studio,/portalRequiresRelic/);
});
