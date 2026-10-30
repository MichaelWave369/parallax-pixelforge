import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createScene,normalizeScene,normalizeLayer,isSafeAsset,layerOffset,renderScene,SCHEMA} from '../layer-studio/engine.js';

test('seven original depth planes each own independent animation and overlay',()=>{
  const s=createScene();
  assert.equal(s.schema,SCHEMA);
  assert.equal(s.layers.length,7);
  assert.equal(new Set(s.layers.map(l=>l.id)).size,7);
  assert.ok(s.layers.every(l=>l.motion && l.overlay && Number.isFinite(l.parallax)));
  assert.ok(s.layers[6].parallax>s.layers[0].parallax);
});
test('import clamps untrusted authored values and excludes external URLs',()=>{
  const s=createScene();
  s.layers[0].kind='image';s.layers[0].asset={dataUrl:'https://untrusted.example/asset.png',frames:800,fps:500};
  s.layers[0].parallax=Infinity;s.layers[0].opacity=-50;s.layers[0].overlay.speed=900;
  s.layers[1].id=s.layers[0].id;
  const r=normalizeScene(s);
  assert.equal(r.layers[0].asset,null);
  assert.equal(r.layers[0].opacity,0);
  assert.equal(r.layers[0].overlay.speed,8);
  assert.equal(new Set(r.layers.map(x=>x.id)).size,7);
  assert.equal(r.layers[0].parallax,.05);
  assert.equal(isSafeAsset('https://site/image.png'),false);
  assert.equal(isSafeAsset('data:image/svg+xml;base64,AAAA'),false);
  assert.equal(isSafeAsset('data:image/png;base64,AA=='),true);
  s.layers[0].overlay.asset={dataUrl:'data:image/png;base64,AA==',frames:250,fps:100};
  const withOverlay=normalizeScene(s).layers[0].overlay.asset;
  assert.equal(withOverlay.frames,64);
  assert.equal(withOverlay.fps,60);
  s.layers[0].overlay.asset={dataUrl:'https://some.site/animated.png',frames:12,fps:8};
  assert.equal(normalizeScene(s).layers[0].overlay.asset,null);
  assert.throws(()=>normalizeScene({schema:'other',layers:[]}),/Not a PixelForge/);
  assert.throws(()=>normalizeScene({schema:SCHEMA,layers:[]}),/1 to 24/);
});
test('parallax and each motion are independently deterministic',()=>{
  const l=normalizeLayer({parallax:1.2,x:25,y:7,motion:{type:'float',amplitude:10,speed:1}},0);
  const offset=layerOffset(l,Math.PI/4,100);
  assert.equal(offset.x,-95);
  assert.ok(offset.y>7);
  assert.deepEqual(layerOffset(l,Math.PI/4,100,true),{x:-95,y:7});
  const drift=normalizeLayer({motion:{type:'drift',amplitude:3,speed:2}},0);
  assert.ok(layerOffset(drift,3,0).x>layerOffset(drift,2,0).x);
});
test('renderer paints multiple bounded procedural planes without external assets',()=>{
  let drawCalls=0,drawn=0;
  const grad={addColorStop(){}};
  const ctx=new Proxy({},{
    get(target,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>grad;
      if(key==='fillRect')return ()=>{drawn++};
      if(key==='clearRect')return ()=>{drawCalls++};
      if(key==='drawImage')return ()=>{throw new Error('Unexpected external image');};
      return ()=>{};
    },
    set(target,key,value){target[key]=value;return true;}
  });
  renderScene(ctx,createScene(),1.2,{cameraX:150,spread:10});
  assert.equal(drawCalls,1);assert.ok(drawn>15);
});
test('browser editor and launcher contain required functional surfaces',()=>{
  const html=readFileSync(new URL('../layer-studio/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../layer-studio/studio.js',import.meta.url),'utf8');
  for(const id of ['sceneCanvas','layerList','layerDepth','overlayType','imageFile','assetFrames','overlayFile','overlayFrames','overlayFps','snapshot','exportScene','importScene'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(js,/requestAnimationFrame/);
  assert.match(js,/normalizeScene/);
});