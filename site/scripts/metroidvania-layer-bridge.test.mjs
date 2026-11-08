import test from 'node:test';
import assert from 'node:assert/strict';
import {createMetroidvaniaStarter} from '../src/metroidvania-world.js';
import {createMetroidvaniaContent} from '../src/metroidvania-content.js';
import {buildMetroidvaniaLayerScene} from '../src/metroidvania-layer-bridge.js';
import {normalizeScene,createScene} from '../../layer-studio/engine.js';
import {createWorldSession,stepWorldSession} from '../../layer-studio/room-atlas.js';
import {stepPuzzle,startPuzzle} from '../../layer-studio/puzzle.js';
import {captureSave,restoreSave} from '../../layer-studio/adventure-journal.js';

function fixture(character='wanderer'){
  const world=createMetroidvaniaStarter(),content=createMetroidvaniaContent(world);
  return {world,content,scene:buildMetroidvaniaLayerScene(world,content,character)};
}
function enter(session,destination){
  const room=session.atlas.rooms.find(r=>r.id===session.roomId);
  const door=room.portals.find(p=>p.targetRoom===destination);
  assert.ok(door,'door '+session.roomId+' -> '+destination+' exists');
  session.game.player.x=door.x+4;session.game.player.y=door.y+25;
  return stepWorldSession(session,{interactPressed:true});
}
test('a Maker castle becomes a real normalized 2.5D Layer Studio atlas with no private assets',()=>{
  const {world,content,scene}=fixture();
  assert.equal(scene.atlas.rooms.length,6);
  assert.equal(scene.atlas.startRoom,world.startRoom);
  assert.deepEqual(scene.atlas.abilities,world.abilities.map(a=>a.id));
  assert.equal(scene.atlas.rooms.find(r=>r.id==='forgotten-crypt').grantsAbilities[0],'shadow-dash');
  assert.ok(scene.atlas.rooms.find(r=>r.id==='cathedral-nave').portals.some(p=>p.requiresAbilities.includes('shadow-dash')));
  assert.deepEqual(normalizeScene(scene),scene);
  assert.ok(!JSON.stringify(scene).includes('asset-passport'));
  assert.equal(content.secrets.length,2); // Not exported into executable world.
});
test('a locked dash-gated passage refuses Wanderer, then unlocks on crypt ability pickup',()=>{
  const {scene}=fixture();
  const s=createWorldSession(scene);
  assert.deepEqual([...s.abilities],[]);
  assert.equal(enter(s,'cathedral-nave').travelled,true);
  assert.equal(enter(s,'bell-tower').denied,'ability');
  assert.equal(s.roomId,'cathedral-nave');
  assert.equal(enter(s,'forgotten-crypt').travelled,true);
  assert.equal(s.abilities.has('shadow-dash'),true);
  assert.equal(enter(s,'cathedral-nave').travelled,true);
  assert.equal(enter(s,'bell-tower').travelled,true);
  assert.equal(s.roomId,'bell-tower');
});
test('Hunter starts with Dash and can traverse the gate immediately',()=>{
  const {scene}=fixture('hunter'),s=createWorldSession(scene);
  assert.equal(s.abilities.has('shadow-dash'),true);
  assert.equal(enter(s,'cathedral-nave').travelled,true);
  assert.equal(enter(s,'bell-tower').travelled,true);
});
test('dash genuinely increases horizontal movement only for an entitled character',()=>{
  const {scene}=fixture('hunter');
  const hunter=createWorldSession(scene),plain=createWorldSession(fixture('wanderer').scene);
  for(const s of [hunter,plain]){
    s.game.player.x=200;s.game.player.y=458;s.game.player.grounded=true;s.game.player.facing=1;
  }
  const input={right:true,dashPressed:true};
  for(let i=0;i<8;i++){
    stepWorldSession(hunter,{...input,dashPressed:i===0});
    stepWorldSession(plain,{...input,dashPressed:i===0});
  }
  assert.ok(hunter.game.player.x>plain.game.player.x+40);
  assert.ok(hunter.game.dashCooldown>0);
  assert.equal(plain.game.dashCooldown,0);
  const baseline=startPuzzle(createScene());
  baseline.player.x=200;baseline.player.grounded=true;
  stepPuzzle(baseline,{right:true,dashPressed:true});
  assert.equal(baseline.player.vx,265);
});
test('ability state survives local save restoration and cannot grant unknown IDs',()=>{
  const {scene}=fixture(),s=createWorldSession(scene);
  enter(s,'cathedral-nave');enter(s,'forgotten-crypt');
  assert.ok(s.abilities.has('shadow-dash'));
  const save=captureSave(scene,s,1);
  assert.deepEqual(save.abilities,['shadow-dash']);
  const restored=restoreSave(scene,save);
  assert.ok(restored.abilities.has('shadow-dash'));
  enter(restored,'cathedral-nave');
  assert.equal(enter(restored,'bell-tower').travelled,true);
  const forged={...save,abilities:['god-mode','shadow-dash']};
  const constrained=restoreSave(scene,forged);
  assert.deepEqual([...constrained.abilities],['shadow-dash']);
});
test('invalid ability definitions and gates fail closed instead of silently unlocking',()=>{
  const {scene}=fixture();
  const bad=structuredClone(scene);bad.atlas.rooms[0].portals[0].requiresAbilities=['console-root'];
  assert.throws(()=>normalizeScene(bad),/portal gate ability reference/);
  const badGrant=structuredClone(scene);
  badGrant.atlas.rooms[0].grantsAbilities=['console-root'];
  assert.throws(()=>normalizeScene(badGrant),/room grant ability reference/);
});
test('export fails explicitly when authored world exceeds bounded 2.5D adapter limits',()=>{
  const {world,content}=fixture();
  const tooBig=structuredClone(world);
  tooBig.rooms.push({id:'extra-corridor',name:'Extra Corridor',x:13,y:11,grants:[]});
  assert.throws(()=>buildMetroidvaniaLayerScene(tooBig,content,'wanderer'),/at most six rooms/);
  assert.throws(()=>buildMetroidvaniaLayerScene(world,content,'not-real'),/Select an existing/);
});
