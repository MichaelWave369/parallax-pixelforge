import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {startPuzzle,stepPuzzle} from '../layer-studio/puzzle.js';
import {
  TILE_SCHEMA,ACTOR_SCHEMA,importTileStudio,importSpriteStudio,
  normalizeTileWorld,normalizeActor,tileCellsNear,tileCell,
  actorFrame,renderTileWorld,renderActor
} from '../layer-studio/studio-bridge.js';

function makeNativeTileStudio(){
  const cells=8*8,ground=Array(cells).fill(null);
  const collision=Array(cells).fill(false);
  for(let col=0;col<8;col++){ground[7*8+col]=1;collision[7*8+col]=true;}
  ground[6*8+3]=1;collision[6*8+3]=true;
  ground[4*8+1]=1;collision[4*8+1]=true;
  ground[6*8+5]=2;
  return {
    studioType:'pixelforge.tile-studio.v5.10',
    tiles:[
      {id:'air',name:'Air',tag:'ground',walkable:true,pixels:Array(256).fill(null)},
      {id:'brick',name:'Brick',tag:'wall',walkable:false,pixels:Array(256).fill('#658498')},
      {id:'spike',name:'Spikes',tag:'hazard',walkable:true,pixels:Array(256).fill('#cc5544')}
    ],
    map:{width:8,height:8,sceneId:'catacomb-demo',layers:{ground,decor:Array(cells).fill(null),collision}}
  };
}
function makeNativeSpriteStudio(){
  const pixels=Array(64).fill(null);pixels[2+2*8]='#eacb9d';
  return {
    studioType:'pixelforge.sprite-studio.v5.9',
    canvas:{width:8,height:8},fps:8,
    frames:[
      {label:'idle',duration:2,pixels},
      {label:'walk',duration:1,pixels:Array(64).fill('#a1f0bc')},
      {label:'jump',duration:1,pixels:Array(64).fill('#aabbff')},
      {label:'damage',duration:1,pixels:Array(64).fill('#cc2244')}
    ]
  };
}
function setup(native=makeNativeTileStudio()){
  const scene=createScene();
  scene.playable.tileWorld=importTileStudio(native,{originY:300,scale:2});
  scene.playable.platforms=[];
  scene.playable.enemies=[];
  scene.playable.spawn={x:34,y:460};
  return startPuzzle(normalizeScene(scene));
}
const run=(s,n,input={})=>{for(let i=0;i<n;i++)stepPuzzle(s,input,1/60);return s;};

test('imports the native Tile Studio 16x16 pixel colors, map layers and flags',()=>{
  const world=importTileStudio(makeNativeTileStudio(),{originY:300,scale:2});
  assert.equal(world.schema,TILE_SCHEMA);
  assert.equal(world.width,8);assert.equal(world.height,8);
  assert.equal(world.tileSize,16);assert.equal(world.scale,2);
  assert.equal(world.tiles[1].pixels[0],'#658498');
  assert.equal(tileCell(world,3,6).solid,true);
  assert.equal(tileCell(world,5,6).hazard,true);
  assert.equal(tileCell(world,4,6).solid,false);
  assert.equal(tileCell(world,-1,6),null);
  assert.equal(tileCellsNear(world,96,492,29,32).filter(t=>t.solid).length>0,true);
});
test('accepts exact exported .tile-map.json with safe metadata-only fallback',()=>{
  const source=makeNativeTileStudio();
  const exported={schema:'pixelforge.tile-map.v5.10',tileSize:16,
    width:source.map.width,height:source.map.height,sceneId:'map-export',
    tiles:source.tiles.map(({pixels,...rest})=>rest),
    layers:source.map.layers};
  const world=importTileStudio(exported);
  assert.equal(world.tiles[1].pixels.some(Boolean),false);
  assert.equal(world.layers.collision[7*8+4],true);
  assert.equal(world.sceneId,'map-export');
  assert.throws(()=>importTileStudio({schema:'world.from.another.engine'}),/Tile Studio/);
  assert.throws(()=>importTileStudio({...exported,layers:{...exported.layers,collision:[]}}),/sizes/);
});
test('native PixelForge project export can supply both art studios',()=>{
  const project={tileStudio:makeNativeTileStudio(),spriteStudio:makeNativeSpriteStudio()};
  assert.equal(importTileStudio(project).tiles.length,3);
  assert.equal(importSpriteStudio(project).frames.length,4);
  assert.throws(()=>importSpriteStudio({schema:'pixelforge.sprite-animation.v5.9'}),/Sprite Studio/);
});
test('sprite animation honors PixelForge frame labels and duration',()=>{
  const actor=importSpriteStudio(makeNativeSpriteStudio());
  assert.equal(actor.schema,ACTOR_SCHEMA);
  assert.equal(actorFrame(actor,'idle',0).label,'idle');
  assert.equal(actorFrame(actor,'run',0).label,'walk');
  assert.equal(actorFrame(actor,'air',0).label,'jump');
  assert.equal(actorFrame(actor,'hurt',0).label,'damage');
  assert.deepEqual(actorFrame(actor,'idle',1.2).label,'idle');
  assert.equal(actor.frames[0].pixels[18],'#eacb9d');
});
test('floor collision lands actor on imported tiles without authored platforms',()=>{
  const s=setup();run(s,25);
  assert.equal(s.player.grounded,true);
  assert.equal(s.player.y,482);
  assert.equal(s.puzzle.platforms.length,0);
});
test('Tile Studio solid walls block horizontal movement, not just landing',()=>{
  const s=setup();run(s,25);
  run(s,45,{right:true});
  assert.equal(s.player.x,68); // wall at 3*32=96, player width 28
  assert.equal(s.player.vx,0);
});
test('Tile Studio solid ceiling blocks upward jump from below',()=>{
  const s=setup();run(s,25);
  stepPuzzle(s,{jumpPressed:true},1/60);
  let minY=s.player.y;
  for(let i=0;i<40;i++){stepPuzzle(s,{},1/60);minY=Math.min(minY,s.player.y);}
  assert.ok(minY>=460,'hero must stop at the underside of row 4 (y=460), observed '+minY);
});
test('hazard tiles inflict bounded damage with invulnerability',()=>{
  const s=setup();run(s,25);
  s.player.x=5*32+3;
  stepPuzzle(s,{},1/60);
  assert.equal(s.health,2);
  assert.ok(s.player.invulnerable>0);
  run(s,5);
  assert.equal(s.health,2);
});
test('imported world survives scene JSON export-import without mutating original layout',()=>{
  const scene=createScene();
  const world=importTileStudio(makeNativeTileStudio(),{originY:300});
  const actor=importSpriteStudio(makeNativeSpriteStudio());
  scene.playable.tileWorld=world;scene.playable.actor=actor;
  const output=normalizeScene(JSON.parse(JSON.stringify(scene)));
  assert.deepEqual(output.playable.tileWorld,world);
  assert.deepEqual(output.playable.actor,actor);
  const old=createScene();delete old.playable;
  assert.equal(normalizeScene(old).playable.tileWorld,null);
  assert.equal(normalizeScene(old).playable.actor,null);
});
test('overlong untrusted imported art metadata is bounded',()=>{
  const input=makeNativeTileStudio();
  input.tiles[0].pixels[0]='javascript:prompt(1)';
  input.tiles[0].name='Z'.repeat(300);
  const w=importTileStudio(input,{scale:999,originY:1e6});
  assert.equal(w.tiles[0].pixels[0],null);
  assert.equal(w.tiles[0].name.length,80);
  assert.equal(w.scale,4);assert.equal(w.originY,2048);
  assert.equal(normalizeTileWorld(null),null);
  assert.equal(normalizeActor(null),null);
  assert.throws(()=>normalizeActor({schema:ACTOR_SCHEMA,frames:[]}),/1–64/);
});
test('custom artwork is drawn using local pixels without any network fetch',()=>{
  let painted=0;
  const grad={addColorStop(){}};
  const ctx=new Proxy({},{
    get(target,key){
      if(key in target)return target[key];
      if(key==='fillRect')return ()=>painted++;
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>grad;
      return ()=>{};
    },set(target,key,value){target[key]=value;return true;}
  });
  const world=importTileStudio(makeNativeTileStudio(),{originY:300});
  renderTileWorld(ctx,world,0,960,540);
  const actor=importSpriteStudio(makeNativeSpriteStudio());
  assert.equal(renderActor(ctx,actor,{x:10,y:20,w:28,h:42,facing:1,vx:0,grounded:true,invulnerable:0},'playing',0),true);
  assert.ok(painted>0);
});
test('editor exposes local-only bridge import and collision controls',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  for(const id of ['useSavedStudio','importTileWorld','tileWorldFile','tileScale','tileOriginX','tileOriginY','importActor','actorFile','removeActor','removeTileWorld','showTileCollision'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/parallax\.pixelforge\.v5\.0\.project/);
  assert.match(js,/importTileStudio/);
  assert.match(js,/importSpriteStudio/);
});
