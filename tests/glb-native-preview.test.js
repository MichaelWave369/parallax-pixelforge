import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGlbPreviewPlan, buildPreviewReceipt } from '../scripts/lib/glb_preview_plan.js';

test('static mesh GLB is eligible for native WebGL2 preview',()=>{
  const plan=buildGlbPreviewPlan({valid:true,summary:{meshes:2,animations:0,skins:0,cameras:0},extensions_required:[]});
  assert.equal(plan.eligible,true);
  assert.equal(plan.renderer,'NATIVE_WEBGL2_STATIC_GLTF2');
  assert.deepEqual(plan.warnings,[]);
});

test('animation and skinning remain explicit static-preview warnings',()=>{
  const plan=buildGlbPreviewPlan({valid:true,summary:{meshes:1,animations:2,skins:1,cameras:1},extensions_required:['KHR_draco_mesh_compression']});
  assert.ok(plan.warnings.includes('ANIMATION_PRESENT_PREVIEW_STATIC_ONLY'));
  assert.ok(plan.warnings.includes('SKINNING_PRESENT_PREVIEW_STATIC_ONLY'));
  assert.ok(plan.warnings.includes('EMBEDDED_CAMERAS_IGNORED'));
  assert.ok(plan.warnings.includes('REQUIRED_EXTENSIONS_MAY_BE_UNSUPPORTED'));
});

test('GLB without meshes does not become preview eligible',()=>{
  const plan=buildGlbPreviewPlan({valid:true,summary:{meshes:0},extensions_required:[]});
  assert.equal(plan.eligible,false);
  assert.ok(plan.warnings.includes('NO_MESHES'));
});

test('successful draw remains visual-review pending rather than compatibility PASS',()=>{
  const plan=buildGlbPreviewPlan({valid:true,summary:{meshes:1},extensions_required:[]});
  const receipt=buildPreviewReceipt(plan,{status:'RENDERED',drawn_primitives:2,skipped_primitives:0,warnings:[]});
  assert.equal(receipt.rendered,true);
  assert.equal(receipt.status,'PREVIEW_RENDERED_VISUAL_REVIEW_PENDING');
  assert.match(receipt.boundary,/does not grant source compatibility PASS/);
});
