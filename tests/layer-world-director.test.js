import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene} from '../layer-studio/engine.js';
import {startPuzzle,stepPuzzle,cameraFor} from '../layer-studio/puzzle.js';
import {
  DIRECTOR_SCHEMA,emptyDirector,demoDirector,normalizeDirector,
  stepDirector,cameraFocus,renderDirectorLighting,renderDirectorGuides
} from '../layer-studio/world-director.js';

const run=(s,n,input={})=>{for(let i=0;i<n;i++)stepPuzzle(s,input,1/60);return s;};

test('default atmosphere and old files use bounded, backwards-compatible data payloads',()=>{
  const scene=createScene();
  assert.equal(scene.playable.director.schema,DIRECTOR_SCHEMA);
  assert.equal(scene.playable.director.triggers.length,2);
  const roundtrip=normalizeScene(JSON.parse(JSON.stringify(scene)));
  assert.deepEqual(roundtrip.playable.director,normalizeDirector(demoDirector()));
  const old=structuredClone(scene);delete old.playable.director;
  assert.deepEqual(normalizeScene(old).playable.director,emptyDirector());
  const legacy=structuredClone(scene);delete legacy.playable;
  assert.deepEqual(normalizeScene(legacy).playable.director,normalizeDirector(demoDirector())); // Pre-Rung-2 scenes receive the built-in playable demo.
});
test('untrusted zones and lights are bounded, types whitelisted, no executable actions',()=>{
  assert.throws(()=>normalizeDirector({schema:'evil',triggers:[]}),/Invalid PixelForge/);
  const raw=demoDirector();
  raw.ambient=20;
  raw.triggers=[
    {id:'same',kind:'javascript:alert(1)',x:Infinity,y:-5000,w:1,h:90000,
     message:'x'.repeat(4000),once:false,run:'window.location.href="evil"'},
    {id:'same',kind:'checkpoint',x:200,y:400,w:50,h:50}
  ];
  raw.cameras=[{id:'same',x:200,w:99999,focus:9}];
  raw.lights=[{id:'same',x:200,y:200,radius:9000,intensity:9,color:'javascript:alert(1)'}];
  const safe=normalizeDirector(raw);
  assert.equal(safe.ambient,.8);
  assert.equal(safe.triggers[0].kind,'message');
  assert.equal(safe.triggers[0].x,0); // nonfinite falls back to 0
  assert.equal(safe.triggers[0].y,-1000);
  assert.equal(safe.triggers[0].w,8);assert.equal(safe.triggers[0].h,1200);
  assert.equal(safe.triggers[0].message.length,180);
  assert.equal(safe.cameras[0].focus,.85);
  assert.equal(safe.lights[0].radius,1200);
  assert.equal(safe.lights[0].color,'#ffcf93');
  assert.equal(new Set([...safe.triggers,...safe.cameras,...safe.lights].map(x=>x.id)).size,4);
  assert.equal('run' in safe.triggers[0],false);
  assert.deepEqual(normalizeDirector({schema:DIRECTOR_SCHEMA,triggers:Array(70).fill({}),cameras:Array(80).fill({}),lights:Array(90).fill({})}).triggers.length,32);
  assert.equal(normalizeDirector({schema:DIRECTOR_SCHEMA,triggers:Array(70).fill({}),cameras:Array(80).fill({}),lights:Array(90).fill({})}).cameras.length,16);
  assert.equal(normalizeDirector({schema:DIRECTOR_SCHEMA,triggers:Array(70).fill({}),cameras:Array(80).fill({}),lights:Array(90).fill({})}).lights.length,24);
});
test('message triggers run on entry once, not every physics tick',()=>{
  const s=startPuzzle(createScene());
  s.player.x=220;s.player.y=458;s.player.grounded=true;
  stepDirector(s,1/60);
  assert.equal(s.eventVersion,1);
  assert.match(s.eventMessage,/STONE/);
  stepDirector(s,1/60);
  assert.equal(s.eventVersion,1);
  s.player.x=440;stepDirector(s,1/60);
  s.player.x=220;stepDirector(s,1/60);
  assert.equal(s.eventVersion,1);
  run(s,245);assert.equal(s.eventMessage,'');
});
test('repeatable trigger fires only after exiting and reentering zone',()=>{
  const s=startPuzzle(createScene());
  s.puzzle.director=normalizeDirector({
    schema:DIRECTOR_SCHEMA,ambient:0,triggers:[
      {id:'ping',kind:'message',x:50,y:400,w:90,h:130,message:'PING',once:false}
    ]
  });
  stepDirector(s);assert.equal(s.eventVersion,1);
  stepDirector(s);assert.equal(s.eventVersion,1);
  s.player.x=240;stepDirector(s);
  s.player.x=72;stepDirector(s);assert.equal(s.eventVersion,2);
});
test('grounded checkpoint activates after a midair entry, survives respawn and preserves puzzle state',()=>{
  const s=startPuzzle(createScene());
  s.player.x=925;s.player.y=405;s.player.grounded=false;
  stepDirector(s);assert.equal(s.checkpoint,null);
  // Land on the far-bank at y=458.
  s.player.y=458;s.player.grounded=true;
  stepDirector(s);assert.equal(s.checkpoint?.id,'far-bank-beacon');
  assert.equal(s.checkpoint.x,925);
  assert.equal(s.eventVersion,1);
  s.enemies[0].stone=true;s.petrified=1;s.keyCollected=true;
  s.player.x=701;s.player.y=780;
  stepPuzzle(s,{},1/60);
  assert.equal(s.player.x,925);assert.equal(s.player.y,458);
  assert.equal(s.enemies[0].stone,true);assert.equal(s.keyCollected,true);
  assert.equal(s.deaths,1);
});
test('camera framing switches only within authored zone, and clamps at level edges',()=>{
  const s=startPuzzle(createScene());
  assert.equal(cameraFocus(s),.38);
  s.player.x=1080;
  assert.equal(cameraFocus(s),.57);
  assert.equal(cameraFor(s,960),1080-960*.57);
  s.player.x=1500;
  assert.equal(cameraFocus(s),.38);
  assert.equal(cameraFor(s,960),740);
});
test('lighting is a separate offscreen compositing pass and never erases scene pixels',()=>{
  const previous=globalThis.document;
  let made=0,drawn=0,holes=0;
  const fakeCtx=()=>new Proxy({},{
    get(t,k){
      if(k in t)return t[k];
      if(k==='createRadialGradient')return ()=>({addColorStop(){}});
      if(k==='drawImage')return ()=>{drawn++};
      if(k==='arc')return ()=>{holes++};
      return ()=>{};
    },set(t,k,v){t[k]=v;return true;}
  });
  try{
    globalThis.document={createElement(type){assert.equal(type,'canvas');made++;return {width:0,height:0,getContext(){return fakeCtx()}};}};
    const ctx=fakeCtx(),director=normalizeDirector(demoDirector());
    assert.equal(renderDirectorLighting(ctx,director,0,960,540),true);
    assert.equal(made,1);
    assert.equal(renderDirectorLighting(ctx,director,200,960,540),true);
    assert.equal(made,1);
    assert.ok(drawn>=2&&holes>0);
    assert.equal(renderDirectorLighting(ctx,emptyDirector(),0,960,540),false);
    assert.equal(renderDirectorLighting(ctx,director,0,960,540,{enabled:false}),false);
    renderDirectorGuides(ctx,director,0,960,540);
  }finally{
    if(previous===undefined)delete globalThis.document;
    else globalThis.document=previous;
  }
});
test('editor exposes world events, lighting toggles and authoring controls',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  const play=readFileSync(new URL('../layer-studio/play.js',import.meta.url),'utf8');
  for(const id of ['directorObject','directorKind','directorX','directorY','directorW','directorH',
    'directorFocus','directorRadius','directorIntensity','directorColor','directorAmbient',
    'directorMessage','addMessage','addCheckpoint','addCamera','addLight','removeDirector',
    'directorPreview','previewLighting'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/renderDirectorGuides/);
  assert.match(js,/normalizeDirector/);
  assert.match(play,/renderDirectorLighting/);
  assert.match(play,/eventVersion/);
});
