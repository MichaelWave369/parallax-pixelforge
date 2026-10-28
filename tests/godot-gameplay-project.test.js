import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,renameWorld,addObject} from '../vr-studio/world.js';
import {createGameplayBlueprint,validateGameplayBlueprint,compileGDevelopVisibilityEvents} from '../vr-studio/gameplay-keys.js';
import {compilePlayCanvasVisibility} from '../vr-studio/playcanvas-visibility.js';
import {exportSceneForEngine} from '../vr-studio/engine-export.js';
import {compileGodotVisibility,renderGodotVisibilityScript,exportGodotVisibilityProject} from '../vr-studio/godot-gameplay-project.js';
const decoder=new TextDecoder();
function readZip(zip){
  const v=new DataView(zip.buffer,zip.byteOffset,zip.byteLength);
  const files=new Map();let pos=0;
  while(pos+4<zip.length&&v.getUint32(pos,true)===0x04034b50){
    const size=v.getUint32(pos+18,true),len=v.getUint16(pos+26,true),extra=v.getUint16(pos+28,true);
    const path=decoder.decode(zip.slice(pos+30,pos+30+len)),start=pos+30+len+extra;
    files.set(path,decoder.decode(zip.slice(start,start+size)));pos=start+size;
  }
  assert.equal(v.getUint32(pos,true),0x02014b50);
  return files;
}
test('Godot interaction ZIP is deterministic with a valid scene resource and fixed GDScript',()=>{
  const world=renameWorld(newWorld(),'Gameplay "Workshop"\nNot code');
  const old=JSON.stringify(world);
  const blueprint=createGameplayBlueprint(world,'obj-2','e','hide');
  const pack=exportGodotVisibilityProject(world,{behavior:blueprint});
  assert.deepEqual(pack.bytes,exportGodotVisibilityProject(world,{behavior:blueprint}).bytes);
  assert.equal(JSON.stringify(world),old);
  assert.equal(pack.report.ruleCount,1);
  assert.equal(pack.report.status,'GODOT_INTERACTION_PROJECT_GENERATED_EDITOR_UNVERIFIED');
  const files=readZip(pack.bytes);
  assert.deepEqual([...files.keys()],[
    'project.godot','scene.tscn','scripts/visibility_rules.gd',
    'gameplay.json','manifest.json','README.md'
  ]);
  const project=files.get('project.godot');
  assert.match(project,/run\/main_scene="res:\/\/scene\.tscn"/);
  const scene=files.get('scene.tscn'),script=files.get('scripts/visibility_rules.gd');
  assert.match(scene,/^\[gd_scene load_steps=8 format=3\]/);
  assert.match(scene,/\[ext_resource type="Script" path="res:\/\/scripts\/visibility_rules\.gd" id="PFBehavior"\]/);
  assert.match(scene,/\[node name="PixelForgeWorld" type="Node3D"\]\nscript = ExtResource\("PFBehavior"\)/);
  assert.equal((scene.match(/type="MeshInstance3D"/g)||[]).length,3);
  assert.match(scene,/\[node name="PreviewCamera" type="Camera3D" parent="\."\]/);
  assert.match(scene,/\[node name="PreviewSun" type="DirectionalLight3D" parent="\."\]/);
  assert.match(script,/^extends Node3D/m);
  assert.match(script,/func _ready\(\) -> void:/);
  assert.match(script,/func _unhandled_key_input\(event: InputEvent\) -> void:/);
  assert.match(script,/"keycode": KEY_E, "target": "Obj_2", "visible": false/);
  assert.match(script,/key_event\.pressed or key_event\.echo/);
  assert.match(script,/target\.visible = rule\["visible"\]/);
  assert.match(script,/push_error\("PixelForge visibility rules inactive: missing node/);
  assert.doesNotMatch(script,/\beval\s*\(|\bload\s*\(|\bpreload\s*\(/);
  const behavior=JSON.parse(files.get('gameplay.json'));
  assert.equal(behavior.rules[0].targetId,'obj-2');
  assert.equal(behavior.rules[0].nodeName,'Obj_2');
  const manifest=JSON.parse(files.get('manifest.json'));
  assert.equal(manifest.sourceObjects[1].sourceId,'obj-2');
  assert.equal(manifest.sourceObjects[1].nodeName,'Obj_2');
  assert.equal(manifest.status,pack.report.status);
  const originalScene=exportSceneForEngine(world).content;
  assert.doesNotMatch(originalScene,/PFBehavior|PreviewSun/);
});
test('one blueprint compiles consistently for GDevelop, PlayCanvas and Godot',()=>{
  const world=newWorld();
  const blueprint=createGameplayBlueprint(world,'obj-3','f','show');
  const gd=compileGDevelopVisibilityEvents(world,blueprint);
  const pc=compilePlayCanvasVisibility(world,blueprint);
  const godot=compileGodotVisibility(world,blueprint);
  assert.equal(gd[0].conditions[0].type.value,'KeyReleased');
  assert.equal(gd[0].actions[0].type.value,'Show');
  assert.equal(pc.rules[0].effect,'show');
  assert.equal(pc.rules[0].entityName,'PF_ID_obj-3');
  assert.equal(godot.rules[0].visible,true);
  assert.equal(godot.rules[0].nodeName,'Obj_3');
  assert.equal(godot.rules[0].keycode,'KEY_F');
  const script=renderGodotVisibilityScript(godot);
  assert.match(script,/"keycode": KEY_F, "target": "Obj_3", "visible": true/);
});
test('multiple independent validated rules generate deterministic Godot handlers',()=>{
  const world=newWorld();
  const first=createGameplayBlueprint(world,'obj-2');
  const multi=validateGameplayBlueprint(world,{...first,rules:[
    first.rules[0],
    {id:'rule-002',on:'keyReleased',key:'space',targetId:'obj-3',effect:'show'}
  ]});
  const pack=exportGodotVisibilityProject(world,{behavior:multi});
  const script=readZip(pack.bytes).get('scripts/visibility_rules.gd');
  assert.equal(pack.report.ruleCount,2);
  assert.match(script,/KEY_E/);
  assert.match(script,/KEY_SPACE/);
  assert.equal((script.match(/"target": "Obj_/g)||[]).length,2);
});
test('fail closed on missing or stale blueprint, unsafe scripts, and GLB proxies',()=>{
  const world=newWorld(),good=createGameplayBlueprint(world,'obj-2');
  for(const altered of [
    {...good,worldTitle:'another world'},
    {...good,script:'exec("bad")'},
    {...good,rules:[{...good.rules[0],key:'Escape'}]},
    {...good,rules:[{...good.rules[0],targetId:'obj-99'}]}
  ])assert.throws(()=>exportGodotVisibilityProject(world,{behavior:altered}),/Invalid|mismatched/);
  assert.throws(()=>exportGodotVisibilityProject(world),/Invalid Godot gameplay export settings/);
  assert.throws(()=>exportGodotVisibilityProject(world,{behavior:good,runCode:true}),/Invalid/);
  assert.throws(()=>exportGodotVisibilityProject(world,{behavior:good,allowPlaceholders:'yes'}),/Invalid/);
  assert.throws(()=>renderGodotVisibilityScript({
    schema:'pixelforge.godot-key-visibility.v1',
    rules:[{id:'rule-001',on:'keyReleased',key:'e',keycode:'KEY_E); bad()',targetId:'obj-2',nodeName:'Obj_2',visible:true}]
  }),/compiled ruleset/);
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,sha256:'a'.repeat(64)};
  const proxyWorld=addObject(world,'asset-proxy',asset);
  const proxyRule=createGameplayBlueprint(proxyWorld,'obj-4');
  assert.throws(()=>exportGodotVisibilityProject(proxyWorld,{behavior:proxyRule}),/approve placeholder/);
  const pack=exportGodotVisibilityProject(proxyWorld,{behavior:proxyRule,allowPlaceholders:true});
  const files=readZip(pack.bytes);
  assert.equal(pack.report.placeholders,1);
  assert.equal(files.size,6);
  assert.equal(JSON.parse(files.get('manifest.json')).sourceObjects[3].placeholderOnly,true);
  assert.doesNotMatch(files.get('scene.tscn'),/^\[ext_resource type="PackedScene"/m);
  assert.match(files.get('scene.tscn'),/metadata\/pixelforge_placeholder_only = true/);
});
