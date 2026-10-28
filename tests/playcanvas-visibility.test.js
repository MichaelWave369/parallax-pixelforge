import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {newWorld,renameWorld,addObject} from '../vr-studio/world.js';
import {createGameplayBlueprint,compileGDevelopVisibilityEvents} from '../vr-studio/gameplay-keys.js';
import {compilePlayCanvasVisibility,playcanvasNodeName,playcanvasVisibilityRuntime} from '../vr-studio/playcanvas-visibility.js';
import {exportPlayCanvasProject} from '../vr-studio/playcanvas-project.js';
const decoder=new TextDecoder();
function filesFromZip(zip){
  const v=new DataView(zip.buffer,zip.byteOffset,zip.byteLength),files=new Map();
  let p=0;
  while(p+4<zip.length&&v.getUint32(p,true)===0x04034b50){
    const n=v.getUint16(p+26,true),extra=v.getUint16(p+28,true),size=v.getUint32(p+18,true);
    const name=decoder.decode(zip.slice(p+30,p+30+n)),offset=p+30+n+extra;
    files.set(name,zip.slice(offset,offset+size));p=offset+size;
  }
  assert.equal(v.getUint32(p,true),0x02014b50);
  return files;
}
function glbScene(bytes){
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(v.getUint32(0,true),0x46546c67);
  assert.equal(v.getUint32(8,true),bytes.length);
  return JSON.parse(decoder.decode(bytes.slice(20,20+v.getUint32(12,true))).trim());
}
function bindRuntime(world,blueprint,root){
  const compiled=compilePlayCanvasVisibility(world,blueprint);
  const handler=playcanvasVisibilityRuntime(compiled),listeners={};
  const status={textContent:''};
  const fakeWindow={addEventListener:(type,callback)=>{
    if(listeners[type])throw Error('Duplicate listener');listeners[type]=callback;
  }};
  // Tests use the exactly generated bounded script with a fake PlayCanvas graph.
  // Actual PlayCanvas browser import remains an independent acceptance gate.
  Function('imported','status','window','console',handler)(root,status,fakeWindow,{warn:()=>{}});
  return {status,listeners,script:handler};
}
test('same validated blueprint compiles to GDevelop and PlayCanvas without changing source',()=>{
  const world=renameWorld(newWorld(),'Portable Playground');
  const before=JSON.stringify(world),b=createGameplayBlueprint(world,'obj-2','e','hide');
  const gd=compileGDevelopVisibilityEvents(world,b)[0],pc=compilePlayCanvasVisibility(world,b);
  assert.equal(gd.conditions[0].type.value,'KeyReleased');
  assert.equal(gd.actions[0].type.value,'Hide');
  assert.equal(gd.actions[0].parameters[0],'PF_Obj_002');
  assert.equal(pc.rules[0].entityName,'PF_ID_obj-2');
  assert.equal(pc.rules[0].effect,'hide');
  const a=exportPlayCanvasProject(world,{behavior:b});
  const again=exportPlayCanvasProject(world,{behavior:b});
  assert.deepEqual(a.bytes,again.bytes);
  assert.equal(JSON.stringify(world),before);
  const entries=filesFromZip(a.bytes);
  assert.deepEqual([...entries.keys()],[
    'package.json','index.html','src/main.js','vite.config.js',
    'public/world.glb','public/gameplay.json','manifest.json','README.md'
  ]);
  const glb=glbScene(entries.get('public/world.glb'));
  assert.deepEqual(glb.nodes.map(x=>x.name),world.objects.map(x=>playcanvasNodeName(x.id)));
  assert.deepEqual(JSON.parse(decoder.decode(entries.get('public/gameplay.json'))),pc);
  const js=decoder.decode(entries.get('src/main.js'));
  assert.match(js,/const imported=asset.resource.instantiateRenderEntity/);
  assert.match(js,/window.addEventListener\('keyup'/);
  assert.match(js,/target.enabled=rule.effect==='show'/);
  assert.match(js,/PF_ID_obj-2/);
  assert.doesNotMatch(js,/\beval\s*\(/);
  const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:js,encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
  const manifest=JSON.parse(decoder.decode(entries.get('manifest.json')));
  assert.equal(manifest.status,'KEY_VISIBILITY_RUNTIME_GENERATED_NOT_BROWSER_VERIFIED');
  assert.equal(manifest.behavior.rules[0].targetId,'obj-2');
  assert.equal(a.report.behaviorCount,1);
});
test('generated key-release runtime activates exact target, handles modifiers and skips unrelated keys',()=>{
  const world=newWorld(),hide=createGameplayBlueprint(world,'obj-2','e','hide');
  const target={name:'PF_ID_obj-2',enabled:true,children:[]};
  const other={name:'PF_ID_obj-3',enabled:true,children:[]};
  const runtime=bindRuntime(world,hide,{name:'root',children:[other,target]});
  assert.equal(typeof runtime.listeners.keyup,'function');
  assert.match(runtime.status.textContent,/visibility rule/);
  runtime.listeners.keyup({key:'x'});
  assert.equal(target.enabled,true);
  runtime.listeners.keyup({key:'e',ctrlKey:true});
  assert.equal(target.enabled,true);
  runtime.listeners.keyup({key:'e'});
  assert.equal(target.enabled,false);
  assert.equal(other.enabled,true);
  const show=createGameplayBlueprint(world,'obj-2','space','show');
  const next=bindRuntime(world,show,{name:'root',children:[target]});
  next.listeners.keyup({key:' '});
  assert.equal(target.enabled,true);
});
test('missing or ambiguous imported glTF nodes fail closed: never install an input listener',()=>{
  const world=newWorld(),b=createGameplayBlueprint(world,'obj-2');
  for(const nodes of [[],[{name:'PF_ID_obj-2',children:[]},{name:'PF_ID_obj-2',children:[]}]]) {
    const run=bindRuntime(world,b,{name:'root',children:nodes});
    assert.equal(run.listeners.keyup,undefined);
    assert.match(run.status.textContent,/not activated/);
  }
});
test('plain PlayCanvas ZIP remains byte-for-byte behavior-free and independent',()=>{
  const world=newWorld(),normal=exportPlayCanvasProject(world);
  const files=filesFromZip(normal.bytes);
  assert.equal(files.size,7);
  assert.equal(files.has('public/gameplay.json'),false);
  assert.doesNotMatch(decoder.decode(files.get('src/main.js')),/visibility rule\(s\) active/);
  assert.equal(normal.report.behaviorCount,0);
});
test('reject injected, stale or missing object rules before producing GLB files',()=>{
  const world=newWorld(),ok=createGameplayBlueprint(world,'obj-2');
  const invalid=[
    {...ok,script:'alert(1)'},
    {...ok,worldTitle:'different'},
    {...ok,rules:[{...ok.rules[0],key:'Escape'}]},
    {...ok,rules:[{...ok.rules[0],targetId:'obj-999'}]}
  ];
  for(const b of invalid)assert.throws(()=>exportPlayCanvasProject(world,{behavior:b}),/Invalid/);
  assert.throws(()=>exportPlayCanvasProject(world,{behavior:null}),/Invalid/);
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,sha256:'a'.repeat(64)};
  const withAsset=addObject(world,'asset-proxy',asset);
  const behavior=createGameplayBlueprint(withAsset,'obj-4');
  assert.throws(()=>exportPlayCanvasProject(withAsset,{behavior}),/Approve layout-only/);
  const out=exportPlayCanvasProject(withAsset,{behavior,allowPlaceholders:true});
  const contents=filesFromZip(out.bytes);
  assert.ok(!contents.has('private.glb'));
  assert.equal(glbScene(contents.get('public/world.glb')).nodes[3].name,'PF_ID_obj-4');
});
