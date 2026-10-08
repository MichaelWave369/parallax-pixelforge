import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LIGHTING,LIGHTING_PRESETS,validateLighting,
  resolvedLighting,lightingWithPatch,lightingPreset,matchingLightingPreset,
  rgbOf,sunDirection} from '../vr-studio/world-lighting.js';
import {newWorld,editWorldLighting,replaceWorldLighting,
  validateWorld,parseWorld,editObject} from '../vr-studio/world.js';

test('new worlds use neutral defaults; earlier v1 scenes load without migration',()=>{
  const world=newWorld();
  assert.deepEqual(world.lighting,DEFAULT_LIGHTING);
  const old=structuredClone(world);
  delete old.lighting;
  assert.equal(validateWorld(old),old);
  assert.deepEqual(parseWorld(JSON.stringify(old)),old);
  assert.deepEqual(resolvedLighting(old),DEFAULT_LIGHTING);
  const after=editWorldLighting(old,{sunStrength:.8});
  assert.equal(after.lighting.sunStrength,.8);
  assert.equal(after.format,old.format);
  assert.deepEqual(after.objects,old.objects);
  assert.deepEqual(after.runtime,old.runtime);
  assert.equal('lighting' in old,false);
  assert.deepEqual(parseWorld(JSON.stringify(after)),after);
});

test('every atmosphere preset is complete, distinct and roundtrips',()=>{
  assert.deepEqual(Object.keys(LIGHTING_PRESETS).sort(),['daylight','midnight','neon-lab','sunset']);
  const serialized=new Set();
  for(const name of Object.keys(LIGHTING_PRESETS)){
    const preset=lightingPreset(name);
    validateLighting(preset);
    assert.equal(matchingLightingPreset(preset),name);
    const scene=replaceWorldLighting(newWorld(),preset);
    assert.deepEqual(parseWorld(JSON.stringify(scene)).lighting,preset);
    serialized.add(JSON.stringify(preset));
  }
  assert.equal(serialized.size,4);
  assert.equal(matchingLightingPreset({...DEFAULT_LIGHTING}),'custom');
  assert.throws(()=>lightingPreset('__proto__'));
  assert.throws(()=>lightingPreset('none'));
});

test('color controls and strength controls must be strictly bounded',()=>{
  const world=newWorld();
  const rejected=[
    {sunStrength:-1},{sunStrength:10},{sunStrength:Infinity},
    {ambientStrength:NaN},{ambientStrength:1.51},
    {sunAzimuth:181},{sunElevation:-1},{fogDensity:.2},
    {fogColor:'javascript:alert(1)'},{sunColor:'#abc'},
    {bogus:1},{authority:'AGENT_ADMIN'},{}
  ];
  for(const bad of rejected)
    assert.throws(()=>editWorldLighting(world,bad));
  assert.throws(()=>validateLighting({sunColor:'#ffffff'}));
  assert.throws(()=>validateWorld({...world,lighting:{...DEFAULT_LIGHTING,script:'evil'}}));
  assert.throws(()=>validateWorld({...world,lighting:{...DEFAULT_LIGHTING,fogColor:'red'}}));
  assert.throws(()=>validateWorld({...world,lighting:[]}));
  assert.throws(()=>lightingWithPatch(DEFAULT_LIGHTING,null));
  assert.equal(world.lighting.sunStrength,DEFAULT_LIGHTING.sunStrength);
});

test('operator world edits retain object transforms, authorizations and undoable snapshots',()=>{
  const initial=newWorld();
  const moved=editObject(initial,'obj-2',{position:[3,1,-6]});
  const preset=replaceWorldLighting(moved,lightingPreset('sunset'));
  const adjusted=editWorldLighting(preset,{sunElevation:20,fogDensity:.032});
  assert.equal(adjusted.lighting.sunElevation,20);
  assert.equal(adjusted.lighting.fogDensity,.032);
  assert.equal(matchingLightingPreset(adjusted.lighting),'custom');
  assert.deepEqual(adjusted.objects,moved.objects);
  assert.deepEqual(adjusted.runtime,initial.runtime);
  assert.equal(adjusted.runtime.authority,'OPERATOR_ONLY');
  assert.deepEqual(JSON.parse(JSON.stringify(adjusted)).lighting,adjusted.lighting);
  assert.equal(initial.lighting.sunElevation,DEFAULT_LIGHTING.sunElevation);
});

test('renderer color/direction math is finite and physically bounded',()=>{
  assert.deepEqual(rgbOf('#000000'),[0,0,0]);
  assert.deepEqual(rgbOf('#FFFFFF'),[1,1,1]);
  assert.deepEqual(rgbOf('#FF0000'),[1,0,0]);
  assert.throws(()=>rgbOf('url(https://invalid.example)'));
  for(const preset of Object.values(LIGHTING_PRESETS)){
    const vec=sunDirection(preset);
    assert.ok(vec.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...vec)-1)<1e-10);
    assert.ok(vec[1]>=0);
  }
  const zenith=sunDirection({...DEFAULT_LIGHTING,sunElevation:90});
  assert.ok(Math.abs(zenith[1]-1)<1e-10);
  assert.throws(()=>sunDirection({sunAzimuth:200,sunElevation:35}));
});
