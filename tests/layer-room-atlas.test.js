import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {startPuzzle,stepPuzzle} from '../layer-studio/puzzle.js';
import {
  ATLAS_SCHEMA,stripAtlas,normalizeAtlas,makeStarterAtlas,createWorldSession,
  stepWorldSession,nearbyPortal,renderPortals,renderPortalPrompt
} from '../layer-studio/room-atlas.js';

function starter(){
  const scene=createScene();
  scene.atlas=makeStarterAtlas(scene,normalizeScene);
  return normalizeScene(scene);
}
function enter(session){
  const portal=session.atlas.rooms.find(r=>r.id===session.roomId).portals[0];
  session.game.player.x=portal.x+3;
  session.game.player.y=portal.y+portal.h-42;
  session.game.player.grounded=true;
  return stepWorldSession(session,{interactPressed:true},1/60);
}
test('Rung 5 preserves existing single-room scene compatibility and winning gates',()=>{
  const source=createScene();
  assert.equal(source.atlas,null);
  const scene=normalizeScene(source);
  const session=createWorldSession(scene);
  assert.equal(session.atlas,null);
  assert.equal(nearbyPortal(session),null);
  assert.equal(stepWorldSession(session,{interactPressed:true}).travelled,false);
  const game=startPuzzle(scene);
  game.keyCollected=true;
  game.player.x=scene.playable.gate.x;
  game.player.y=scene.playable.gate.y+20;
  stepPuzzle(game);
  assert.equal(game.status,'won');
});
test('starter atlas contains two finite, distinct and bidirectionally linked scenes',()=>{
  const scene=starter(),atlas=scene.atlas;
  assert.equal(atlas.schema,ATLAS_SCHEMA);
  assert.equal(atlas.rooms.length,2);
  assert.equal(atlas.startRoom,'lantern-vault');
  assert.equal(atlas.rooms[0].portals[0].targetRoom,'reliquary');
  assert.equal(atlas.rooms[1].portals[0].targetRoom,'lantern-vault');
  assert.notEqual(atlas.rooms[0].scene.title,atlas.rooms[1].scene.title);
  assert.equal(atlas.rooms[0].scene.atlas,undefined);
  assert.equal(atlas.rooms[1].scene.atlas,undefined);
  assert.equal(atlas.rooms[0].scene.playable.director.ambient,.32);
  assert.equal(atlas.rooms[1].scene.playable.director.ambient,.5);
  const serialized=JSON.stringify(scene);
  assert.ok(serialized.length>3000);
  assert.deepEqual(normalizeScene(JSON.parse(serialized)).atlas,atlas);
});
test('keyed doorway requires local room key; health and per-room progress persist',()=>{
  const session=createWorldSession(starter());
  assert.equal(session.roomId,'lantern-vault');
  const denied=enter(session);
  assert.equal(denied.denied,'key');
  assert.equal(session.roomId,'lantern-vault');
  assert.equal(session.game.status,'playing');
  assert.match(session.notice,/KEY/);
  const vault=session.game;
  vault.health=2;vault.keyCollected=true;vault.enemies[0].stone=true;vault.petrified=1;
  vault.directorSeen.add('vault-whisper');
  vault.checkpoint={id:'far-bank-beacon',x:920,y:458};
  const passed=enter(session);
  assert.equal(passed.travelled,true);
  assert.equal(passed.from,'lantern-vault');
  assert.equal(passed.to,'reliquary');
  assert.equal(session.transitions,1);
  assert.equal(session.game.health,2);
  assert.equal(session.game.keyCollected,false);
  assert.equal(session.game.player.x,112);
  assert.equal(session.game.status,'playing');
  const back=enter(session);
  assert.equal(back.travelled,true);
  assert.equal(session.roomId,'lantern-vault');
  assert.equal(session.game.keyCollected,true);
  assert.equal(session.game.enemies[0].stone,true);
  assert.equal(session.game.petrified,1);
  assert.equal(session.game.directorSeen.has('vault-whisper'),true);
  assert.equal(session.game.checkpoint.id,'far-bank-beacon');
  assert.equal(session.game.player.x,1460);
  assert.equal(session.game.health,2);
});
test('progress of each independent room survives repeated trips',()=>{
  const session=createWorldSession(starter());
  session.game.keyCollected=true;
  assert.equal(enter(session).travelled,true);
  session.game.enemies[1].stone=true;
  session.game.petrified=1;
  session.game.keyCollected=true;
  assert.equal(enter(session).travelled,true);
  assert.equal(enter(session).travelled,true);
  assert.equal(session.game.enemies[1].stone,true);
  assert.equal(session.game.keyCollected,true);
  assert.equal(session.transitions,3);
});
test('atlas normalization bounds rooms, portals and destinations',()=>{
  assert.throws(()=>normalizeAtlas({schema:'wrong',rooms:[]},normalizeScene),/Invalid/);
  assert.throws(()=>normalizeAtlas({schema:ATLAS_SCHEMA,rooms:[]},normalizeScene),/1 to 6/);
  const scene=stripAtlas(createScene());
  const raw={schema:ATLAS_SCHEMA,startRoom:'unknown',rooms:[
    {id:'duplicate',title:'R'.repeat(400),scene,portals:[
      {id:'door',x:Infinity,y:-3000,w:9999,h:0,targetRoom:'not-here',arrivalX:9000,arrivalY:1000,requiresKey:1,label:'X'.repeat(200)}
    ]},
    {id:'duplicate',scene,portals:[]}
  ]};
  const atlas=normalizeAtlas(raw,room=>normalizeScene({...room,atlas:null}));
  assert.equal(atlas.startRoom,'duplicate');
  assert.notEqual(atlas.rooms[0].id,atlas.rooms[1].id);
  const door=atlas.rooms[0].portals[0];
  assert.equal(door.x,100);assert.equal(door.y,-200);
  assert.equal(door.w,300);assert.equal(door.h,12);
  assert.equal(door.targetRoom,'');
  assert.equal(door.requiresKey,false);
  assert.equal(door.label.length,60);
  assert.equal(door.arrivalY,750);
  assert.equal(atlas.rooms[0].title.length,80);
  assert.throws(()=>normalizeAtlas({schema:ATLAS_SCHEMA,rooms:[{id:'x',scene:{layers:null}}]},normalizeScene),/Every atlas room/);
});
test('unlinked doors cannot send actors to invented destinations',()=>{
  const root=starter();
  root.atlas.rooms[0].portals[0].targetRoom='';
  const session=createWorldSession(root);
  const result=enter(session);
  assert.equal(result.denied,'unlinked');
  assert.equal(session.transitions,0);
});
test('portal rendering has no remote assets and can draw guides',()=>{
  const session=createWorldSession(starter());
  const calls={rect:0,text:0};
  const ctx=new Proxy({},{
    get(t,k){
      if(k in t)return t[k];
      if(k==='fillRect')return ()=>{calls.rect++};
      if(k==='fillText')return ()=>{calls.text++};
      return ()=>{};
    },set(t,k,v){t[k]=v;return true;}
  });
  renderPortals(ctx,session,0,{guides:true});
  assert.ok(calls.rect>=2); // one doorway frame and its illuminated marker
  session.game.player.x=1517;session.game.player.y=458;
  assert.ok(nearbyPortal(session));
  renderPortalPrompt(ctx,session,960,540);
  assert.ok(calls.text>1);
});
test('editor and controls expose room/portal authoring and local play interactions',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const editor=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const playHtml=readFileSync(new URL('../layer-studio/play.html',import.meta.url),'utf8');
  const playJs=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const id of ['makeAtlas','atlasRoom','atlasRoomTitle','addRoom','removeRoom','setStartRoom',
    'atlasPortal','addPortal','removePortal','portalTarget','portalX','portalY','portalW','portalH',
    'portalArrivalX','portalArrivalY','portalRequiresKey','portalPreview'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(playHtml,/id="touchInteract"/);
  assert.match(playJs,/KeyE/);
  assert.match(playJs,/stepWorldSession/);
  assert.match(editor,/commitActiveRoom/);
  assert.match(editor,/makeStarterAtlas/);
});
