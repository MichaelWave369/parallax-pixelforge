import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {createWorldSession,makeStarterAtlas,stepWorldSession} from '../layer-studio/room-atlas.js';
import {normalizeBoss,normalizeBossBeats,createBossTimeline,stepBossTimeline}
  from '../layer-studio/boss-stage.js';
import {
  CINEMATIC_FOCUS,normalizeCinematicCue,createCinematicDirector,
  stepCinematicDirector,cinematicView
} from '../layer-studio/cinematic-director.js';
import {captureSave,restoreSave} from '../layer-studio/adventure-journal.js';

function world(){
  const root=createScene();root.atlas=makeStarterAtlas(root,normalizeScene);
  return normalizeScene(root);
}
function reliquary(){
  const root=world(),session=createWorldSession(root);
  session.game.keyCollected=true;
  const gate=session.atlas.rooms[0].portals[0];
  session.game.player.x=gate.x+4;
  session.game.player.y=gate.y+gate.h-42;session.game.player.grounded=true;
  assert.equal(stepWorldSession(session,{interactPressed:true}).travelled,true);
  return {root,session};
}
test('Rung 11 Ash Warden cinematic beats author camera, light and readable cues',()=>{
  const root=world(),def=root.atlas.rooms[1].boss;
  assert.equal(def.introBeats.length,3);
  assert.equal(def.victoryBeats.length,2);
  assert.deepEqual(def.introBeats.map(b=>b.camera),['player','boss','room']);
  assert.deepEqual(def.victoryBeats.map(b=>b.camera),['boss','room']);
  assert.deepEqual(def.introBeats.map(b=>b.ambient),[.42,.66,.34]);
  assert.match(def.introBeats[0].cue,/STONE/);
  assert.match(def.victoryBeats[1].cue,/LIGHT/);
  assert.deepEqual(normalizeScene(JSON.parse(JSON.stringify(root))).atlas,root.atlas);
});
test('older Rung 10 boss beat data is preserved verbatim without phantom camera fields',()=>{
  const beats=[{title:'OLD',text:'Original authored text',seconds:2.5}];
  assert.deepEqual(normalizeBossBeats(beats),beats);
  const old=normalizeBoss({schema:'pixelforge.layer-boss.v1',
    introBeats:beats,victoryBeats:beats});
  assert.deepEqual(old.introBeats,beats);
  assert.deepEqual(normalizeBoss(old),old);
});
test('untrusted cinematic cue properties are clamped and never interpreted as executable actions',()=>{
  assert.deepEqual(CINEMATIC_FOCUS,['player','boss','room']);
  assert.deepEqual(normalizeCinematicCue({camera:'javascript:alert(1)',
    ambient:900,cue:'A'.repeat(200),script:'execute()',href:'https://example.com'}),{
      ambient:.8,cue:'A'.repeat(80)
    });
  assert.deepEqual(normalizeCinematicCue({camera:'boss',ambient:-900}),{
    camera:'boss',ambient:0
  });
  assert.deepEqual(normalizeCinematicCue({camera:null,ambient:null,cue:42}),{});
  const def=normalizeBoss({schema:'pixelforge.layer-boss.v1',
    introBeats:[{title:'Test',text:'Test',seconds:1,
      camera:'room',ambient:99,cue:'B'.repeat(200),evil:'injected'}]});
  assert.equal(def.introBeats[0].ambient,.8);
  assert.equal(def.introBeats[0].cue.length,80);
  assert.equal('evil' in def.introBeats[0],false);
});
test('cinematic camera eases toward the boss and uses authored ambient without moving the player',()=>{
  const {session}=reliquary(),def=session.atlas.rooms[1].boss;
  const originalX=session.game.player.x;
  const originalFlags=[...session.worldFlags];
  const timeline=createBossTimeline(def,'intro');
  const controller=createCinematicDirector(session,timeline,0);
  assert.equal(controller.cameraX,0);
  assert.ok(controller.ambient>=0);
  stepCinematicDirector(controller,session,.15);
  assert.equal(controller.cue,def.introBeats[0].cue);
  const before=controller.cameraX;
  timeline.index=1;
  const target=Math.max(0,Math.min(
    session.game.puzzle.worldWidth-session.scene.width,
    def.x+def.w/2-session.scene.width/2
  ));
  stepCinematicDirector(controller,session,.1);
  assert.equal(controller.beatIndex,1);
  assert.ok(controller.cameraX>before);
  assert.ok(controller.cameraX<target);
  assert.ok(controller.ambient>.42);
  for(let i=0;i<70;i++)stepCinematicDirector(controller,session,.1);
  assert.ok(Math.abs(controller.cameraX-target)<1);
  assert.ok(Math.abs(controller.ambient-.66)<.001);
  assert.equal(session.game.player.x,originalX);
  assert.deepEqual([...session.worldFlags],originalFlags);
  assert.equal(session.game.boss.status,'dormant');
});
test('reduced motion snaps to room framing and lighting on the next frame',()=>{
  const {session}=reliquary(),def=session.atlas.rooms[1].boss;
  const timeline=createBossTimeline(def,'intro');
  const controller=createCinematicDirector(session,timeline,100);
  timeline.index=2;
  const frame=stepCinematicDirector(controller,session,.001,{reducedMotion:true});
  const target=Math.max(0,(session.game.puzzle.worldWidth-session.scene.width)/2);
  assert.equal(frame.cameraX,target);
  assert.equal(frame.ambient,.34);
  assert.equal(frame.focus,'room');
  assert.equal(frame.cue,'THE ARENA OPENS');
  assert.deepEqual(cinematicView(controller),{
    cameraX:target,ambient:.34,cue:'THE ARENA OPENS'
  });
});
test('timeline beat changes retarget camera/lighting but never advance combat or start a fight',()=>{
  const {session}=reliquary(),def=session.atlas.rooms[1].boss;
  const timeline=createBossTimeline(def,'intro');
  const camera=createCinematicDirector(session,timeline,0);
  assert.equal(session.game.boss.status,'dormant');
  for(let i=0;i<80;i++){
    stepBossTimeline(timeline,.1);
    stepCinematicDirector(camera,session,.1);
  }
  assert.equal(timeline.finished,true);
  assert.equal(timeline.index,2);
  assert.equal(camera.beatIndex,2);
  assert.equal(session.game.boss.status,'dormant');
  assert.equal(session.game.shots.length,0);
});
test('cinematic direction is temporary and excluded from existing local save records',()=>{
  const {root,session}=reliquary(),def=session.atlas.rooms[1].boss;
  const timeline=createBossTimeline(def,'victory');
  const director=createCinematicDirector(session,timeline,120);
  stepCinematicDirector(director,session,.1);
  const data=captureSave(root,session,1);
  assert.equal('cinematicDirector' in data,false);
  assert.equal('cinematic' in data,false);
  const resumed=restoreSave(root,data);
  assert.equal('cinematicDirector' in resumed,false);
  assert.equal(resumed.roomId,'reliquary');
  assert.equal(resumed.game.boss.status,'dormant');
});
test('Cinematic Director remains inert for legacy scenes without a Room Atlas boss',()=>{
  const scene=createScene(),session=createWorldSession(scene);
  const controller=createCinematicDirector(session,null,0);
  const frame=stepCinematicDirector(controller,session,.1);
  assert.equal(frame.cameraX,0);
  assert.equal(frame.cue,'');
  assert.equal(cinematicView(null),null);
  assert.equal(session.atlas,null);
});
test('cinematic authoring and playback are wired to actual UI controls',()=>{
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const studio=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const [kind,count] of [['Intro',3],['Victory',2]])
    for(let i=1;i<=count;i++)for(const field of ['Camera','Ambient','Cue'])
      assert.match(editor,new RegExp('id="boss'+kind+'Beat'+i+field+'"'));
  assert.match(studio,/bossTimelineBeats/);
  assert.match(studio,/room\.boss=normalizeBoss/);
  assert.match(play,/createCinematicDirector/);
  assert.match(play,/stepCinematicDirector/);
  assert.match(play,/cinematicView/);
  assert.match(play,/boss-director-caption/);
});
