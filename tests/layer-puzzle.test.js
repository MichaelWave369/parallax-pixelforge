import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene,renderScene} from '../layer-studio/engine.js';
import {PUZZLE_SCHEMA,createPuzzle,normalizePuzzle,startPuzzle,stepPuzzle,shoot,stonePlatform,cameraFor,renderPuzzle,renderPuzzleHud} from '../layer-studio/puzzle.js';

function run(game,steps,input={}) {
  for(let i=0;i<steps;i++)stepPuzzle(game,input,1/60);
  return game;
}
test('existing seven-layer scenes gain a backwards-compatible, bounded playable payload',()=>{
  const demo=createScene();
  assert.equal(demo.playable.schema,PUZZLE_SCHEMA);
  assert.equal(demo.playable.platforms.length,4);
  const old=structuredClone(demo);delete old.playable;
  assert.deepEqual(normalizeScene(old).playable,createPuzzle());
  assert.deepEqual(normalizeScene(demo).playable,normalizePuzzle(demo.playable));
});
test('untrusted puzzle import constrains world geometry and duplicate identifiers',()=>{
  const p=createPuzzle();p.worldWidth=1e20;
  p.platforms=[{id:'same',x:-500,y:Infinity,w:900000,h:-100},{id:'same',x:1,y:1,w:20,h:20}];
  p.enemies=[{id:'ghost',x:1e8,y:-20000,w:0,h:200}];
  p.key.x='not a number';
  const q=normalizePuzzle(p);
  assert.equal(q.worldWidth,6000);
  assert.equal(q.platforms[0].x,0);assert.equal(q.platforms[0].w,2500);
  assert.equal(q.platforms[0].h,8);
  assert.equal(q.platforms[0].y,440);
  assert.equal(q.enemies[0].x,6000);
  assert.equal(q.enemies[0].y,-200);
  assert.equal(q.key.x,1150);
  assert.equal(new Set(q.platforms.map(x=>x.id)).size,2);
  assert.equal(normalizePuzzle({platforms:Array.from({length:100},(_,i)=>({id:'p'+i}))}).platforms.length,64);
  assert.equal(normalizePuzzle({enemies:Array.from({length:100},(_,i)=>({id:'e'+i}))}).enemies.length,32);
});
test('gravity lands the player and jump launches from solid ground',()=>{
  const s=startPuzzle(createScene());
  run(s,12);
  assert.equal(s.player.grounded,true);
  assert.equal(s.player.y,458);
  stepPuzzle(s,{jumpPressed:true},1/60);
  assert.ok(s.player.y<458);
  assert.equal(s.player.grounded,false);
  run(s,75);
  assert.equal(s.player.grounded,true);
  assert.equal(s.player.y,458);
});
test('petrification creates a solid bridging surface and respects cooldown',()=>{
  const s=startPuzzle(createScene());run(s,5);
  s.player.x=520;s.player.facing=1;
  assert.equal(shoot(s),true);
  assert.equal(shoot(s),false);
  run(s,25);
  const target=s.enemies.find(e=>e.id==='bridge-sentinel');
  assert.equal(target.stone,true);
  assert.equal(s.petrified,1);
  const platform=stonePlatform(target);
  assert.ok(platform.x<target.x&&platform.w>target.w);
  s.player.x=target.x+5;
  s.player.y=platform.y-110;
  s.player.vy=0;
  s.player.grounded=false;
  run(s,42);
  assert.equal(s.player.grounded,true);
  assert.equal(s.player.y,platform.y-s.player.h);
});
test('key unlocks a gate, but proximity alone cannot win',()=>{
  const s=startPuzzle(createScene());run(s,5);
  s.player.x=s.puzzle.gate.x;s.player.y=s.puzzle.gate.y+20;
  stepPuzzle(s,{},1/60);assert.equal(s.status,'playing');
  s.player.x=s.puzzle.key.x-12;s.player.y=s.puzzle.key.y-22;
  stepPuzzle(s,{},1/60);assert.equal(s.keyCollected,true);
  s.player.x=s.puzzle.gate.x;s.player.y=s.puzzle.gate.y+20;
  stepPuzzle(s,{},1/60);assert.equal(s.status,'won');
  assert.equal(s.keyCollected,true);
});
test('falling into chasm respawns without resetting petrified geometry',()=>{
  const s=startPuzzle(createScene());s.enemies[0].stone=true;s.petrified=1;
  s.player.x=690;s.player.y=780;
  stepPuzzle(s,{},1/60);
  assert.equal(s.deaths,1);
  assert.equal(s.player.x,s.puzzle.spawn.x);
  assert.equal(s.enemies[0].stone,true);
});
test('camera is bounded and tracks player across the long level',()=>{
  const s=startPuzzle(createScene());
  assert.equal(cameraFor(s,960),0);
  s.player.x=1100;
  const cam=cameraFor(s,960);
  assert.ok(cam>0&&cam<740);
  s.player.x=1700;
  assert.equal(cameraFor(s,960),740);
});
test('renderer supports base, gameplay, foreground and HUD as distinct passes',()=>{
  let clear=0,draw=0;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      if(key==='clearRect')return ()=>{clear++};
      if(key==='fillRect')return ()=>{draw++};
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>gradient;
      return ()=>{};
    },
    set(target,key,value){target[key]=value;return true;}
  });
  const scene=createScene(),s=startPuzzle(scene);
  renderScene(ctx,scene,0,{endLayer:6});
  renderPuzzle(ctx,s,{hud:false});
  renderScene(ctx,scene,0,{startLayer:6,clear:false});
  renderPuzzleHud(ctx,s);
  assert.equal(clear,1);
  assert.ok(draw>30);
});
test('default puzzle is actually beatable: statue bridge, second ray, key and gate',()=>{
  const s=startPuzzle(createScene());
  run(s,99,{right:true}); // approach the gap on the left bank
  stepPuzzle(s,{firePressed:true},1/60);
  run(s,26);
  assert.equal(s.enemies[0].stone,true);
  stepPuzzle(s,{right:true,jumpPressed:true},1/60);
  run(s,38,{right:true});
  assert.equal(s.player.grounded,true);
  assert.ok(s.player.x>635&&s.player.x<720);
  run(s,20); // stand on the newly created bridge
  stepPuzzle(s,{right:true,jumpPressed:true},1/60);
  run(s,60,{right:true});
  assert.ok(s.player.x>820&&s.player.grounded);
  stepPuzzle(s,{firePressed:true},1/60);
  run(s,20); // petrify the second spirit
  run(s,170,{right:true});
  assert.equal(s.status,'won');
  assert.equal(s.keyCollected,true);
  assert.equal(s.petrified,2);
  assert.equal(s.deaths,0);
});
test('browser routes expose builder and play controls',()=>{
  const editor=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.html',import.meta.url),'utf8');
  const script=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const id of ['playPuzzle','puzzleObject','puzzlePreview','puzzleX','puzzleY','addEnemy','addPlatform'])
    assert.ok(editor.includes('id="'+id+'"'),id);
  for(const id of ['game','touchJump','touchFire','pause','restart'])
    assert.ok(play.includes('id="'+id+'"'),id);
  assert.match(script,/getGamepads/);
  assert.match(script,/renderScene/);
  assert.match(script,/stepPuzzle/);
});