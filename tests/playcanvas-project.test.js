import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {newWorld,addObject,renameWorld} from '../vr-studio/world.js';
import {decodeGlbMesh} from '../vr-studio/glb-mesh.js';
import {exportPlayCanvasProject} from '../vr-studio/playcanvas-project.js';
const text=new TextDecoder();
function unzipStored(archive){
  const view=new DataView(archive.buffer,archive.byteOffset,archive.byteLength);
  const entries=new Map();let offset=0;
  while(view.getUint32(offset,true)===0x04034b50){
    const nameLength=view.getUint16(offset+26,true),extraLength=view.getUint16(offset+28,true);
    const filename=text.decode(archive.slice(offset+30,offset+30+nameLength));
    const length=view.getUint32(offset+18,true);
    const start=offset+30+nameLength+extraLength;
    entries.set(filename,archive.slice(start,start+length));offset=start+length;
  }
  assert.equal(view.getUint32(offset,true),0x02014b50,'ZIP central directory follows entries');
  return entries;
}
test('PlayCanvas project exports native GLB and correct standalone npm/Vite viewer',()=>{
  const world=renameWorld(newWorld(),'Multi-engine workshop');
  const original=JSON.stringify(world);
  const first=exportPlayCanvasProject(world),second=exportPlayCanvasProject(world);
  assert.deepEqual(first.bytes,second.bytes);
  assert.equal(JSON.stringify(world),original,'do not mutate canonical world');
  const entries=unzipStored(first.bytes);
  assert.deepEqual([...entries.keys()],[
    'package.json','index.html','src/main.js','vite.config.js',
    'public/world.glb','manifest.json','README.md'
  ]);
  const glb=entries.get('public/world.glb');
  assert.equal(new DataView(glb.buffer,glb.byteOffset,glb.byteLength).getUint32(0,true),0x46546c67);
  assert.equal(decodeGlbMesh(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.byteLength)).meshCount,world.objects.length);
  const pkg=JSON.parse(text.decode(entries.get('package.json')));
  assert.equal(pkg.dependencies.playcanvas,'2.23.3');
  assert.equal(pkg.scripts.build,'vite build');
  const main=text.decode(entries.get('src/main.js'));
  assert.match(main,/createGraphicsDevice/);
  assert.match(main,/loadFromUrl\('\.\/world\.glb','container'/);
  assert.match(main,/instantiateRenderEntity/);
  assert.doesNotMatch(main,/cdn\./);
  const syntax=spawnSync(process.execPath,['--check','--input-type=module'],{input:main,encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
  const manifest=JSON.parse(text.decode(entries.get('manifest.json')));
  assert.equal(manifest.status,'PROJECT_GENERATED_ENGINE_RUNTIME_UNTESTED');
  assert.equal(manifest.objectCount,3);
});
test('private asset proxies require explicit placeholder authorization and remain unbundled',()=>{
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,sha256:'a'.repeat(64)};
  const scene=addObject(newWorld(),'asset-proxy',asset);
  assert.throws(()=>exportPlayCanvasProject(scene),/Approve layout-only/);
  const pack=exportPlayCanvasProject(scene,{allowPlaceholders:true});
  const entries=unzipStored(pack.bytes);
  assert.equal(pack.report.placeholderCount,1);
  assert.equal(entries.size,7);
  assert.equal(JSON.parse(text.decode(entries.get('manifest.json'))).placeholderCount,1);
  assert.ok(!entries.has('assets/private.glb'));
  assert.ok(entries.has('public/world.glb'));
});
test('invalid settings/source cannot generate any project',()=>{
  assert.throws(()=>exportPlayCanvasProject(newWorld(),{execute:true}),/Invalid PlayCanvas/);
  assert.throws(()=>exportPlayCanvasProject(newWorld(),{allowPlaceholders:'true'}),/Invalid PlayCanvas/);
  const world=newWorld();
  assert.throws(()=>exportPlayCanvasProject({...world,runtime:{...world.runtime,physics:'SUPPORTED'}}),/runtime capability/);
});
