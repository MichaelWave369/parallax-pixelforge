import test from 'node:test';
import assert from 'node:assert/strict';
import {newWorld,addObject,editObject,renameWorld} from '../vr-studio/world.js';
import {decodeGlbMesh} from '../vr-studio/glb-mesh.js';
import {exportUniversalGlb} from '../vr-studio/universal-glb.js';
import {ENGINE_PROFILES,getEngineProfile,createEngineHandoff} from '../vr-studio/engine-registry.js';
const decode=new TextDecoder();
const jsonOf=bytes=>{
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  assert.equal(dv.getUint32(0,true),0x46546c67);
  assert.equal(dv.getUint32(4,true),2);
  assert.equal(dv.getUint32(8,true),bytes.length);
  assert.equal(dv.getUint32(16,true),0x4e4f534a);
  return JSON.parse(decode.decode(bytes.slice(20,20+dv.getUint32(12,true))).trim());
};
test('universal GLB is deterministic real binary geometry with scene transforms and identity',()=>{
  const world=renameWorld(
    editObject(addObject(newWorld(),'block'),'obj-4',
      {name:'Cube "Shasta"',position:[3,-2,-5],scale:[2,3,4],yaw:90,color:'#ff8000'}),
    'Not a runtime');
  const snapshot=JSON.stringify(world);
  const first=exportUniversalGlb(world);
  assert.equal(first.mime,'model/gltf-binary');
  assert.deepEqual(first.bytes,exportUniversalGlb(world).bytes);
  assert.equal(JSON.stringify(world),snapshot);
  const doc=jsonOf(first.bytes);
  assert.equal(doc.asset.version,'2.0');
  assert.equal(doc.nodes.length,4);
  assert.equal(doc.nodes[3].name,'Cube "Shasta"');
  assert.deepEqual(doc.nodes[3].translation,[3,-2,-5]);
  assert.deepEqual(doc.nodes[3].scale,[2,3,4]);
  assert.equal(doc.nodes[3].rotation[1],0.70710678);
  assert.equal(doc.materials[3].pbrMetallicRoughness.baseColorFactor[0],1);
  assert.equal(doc.materials[3].pbrMetallicRoughness.baseColorFactor[1],128/255);
  assert.equal(doc.nodes[3].extras.pixelforgeId,'obj-4');
  const preview=decodeGlbMesh(first.bytes.buffer);
  assert.equal(preview.meshCount,4);
  assert.equal(preview.vertexCount,4*36);
  assert.equal(first.report.status,'STATIC_CUBOIDS_GLTF2');
});
test('GLB export does not silently clone private assets into placeholder geometry',()=>{
  const asset={asset_id:'ASSET-000021',source_name:'private.glb',byte_length:700,sha256:'a'.repeat(64)};
  const world=addObject(newWorld(),'asset-proxy',asset);
  assert.throws(()=>exportUniversalGlb(world),/Approve layout-only/);
  const out=exportUniversalGlb(world,{allowPlaceholders:true});
  assert.equal(out.report.placeholderCount,1);
  assert.equal(jsonOf(out.bytes).nodes[3].extras.placeholderOnly,true);
  assert.doesNotMatch(decode.decode(out.bytes),/private\.glb/);
});
test('rejects invalid source and option values',()=>{
  const w=newWorld();
  assert.throws(()=>exportUniversalGlb(w,{launchExternalEngine:true}),/Invalid universal/);
  assert.throws(()=>exportUniversalGlb(w,{allowPlaceholders:'true'}),/Invalid universal/);
  assert.throws(()=>exportUniversalGlb({...w,runtime:{...w.runtime,physics:'SUPPORTED'}}),/runtime capability/);
  assert.throws(()=>exportUniversalGlb({...w,objects:[]}),/requires at least one/);
});
test('engine shelf covers all vetted recommendations without claiming integrations',()=>{
  assert.equal(ENGINE_PROFILES.length,12);
  assert.equal(new Set(ENGINE_PROFILES.map(p=>p.id)).size,12);
  for(const p of ENGINE_PROFILES){
    assert.ok(p.name&&p.license&&p.note&&p.url.startsWith('https://'));
    assert.ok(['GODOT_TSCN_AND_PRIVATE_GLB_PACK','ADVISORY_GLTF_ONLY','RESEARCH_2D_VISUAL','RESEARCH_2D_MOBILE','RESEARCH_FRAMEWORK','ADVISORY_GODOT_COMPAT'].includes(p.route));
    assert.equal(getEngineProfile(p.id),p);
    const brief=createEngineHandoff(newWorld(),p.id);
    assert.equal(brief.engine.id,p.id);
    assert.match(brief.disclosures[0],/advisory/);
    assert.ok(brief.availableArtifacts.includes('universal standalone static GLB (separate export)'));
    assert.equal(JSON.stringify(brief).includes('installationSucceeded'),false);
  }
  assert.throws(()=>getEngineProfile('unknown'));
  assert.equal(createEngineHandoff(newWorld(),'godot4').availableArtifacts.includes('Godot 4 .tscn'),true);
  assert.equal(createEngineHandoff(newWorld(),'brutal').availableArtifacts.includes('Godot 4 .tscn'),false);
});
