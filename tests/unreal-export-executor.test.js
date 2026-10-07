import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bindUnrealExportJob, normalizeUnrealAssetPath, requiredPlugins } from '../scripts/lib/unreal_export_job.js';
import { sha256File, verifyUnrealExportReceipt } from '../scripts/lib/unreal_export_receipt.js';

const v1 = {
  schema:'pixelforge.unreal-export-job.v1',
  job_id:'PF-UE-ASSET-900021-NATIVE_3D',
  state:'DRAFT_OPERATOR_BINDING_REQUIRED',
  record_id:'ASSET-900021',
  source_record_sha256:'1'.repeat(64),
  requested_forge_target:'NATIVE_3D',
  requested_interchange_format:'GLB',
  source:{unreal_asset_path:null,requires_operator_binding:true,storage_policy:'LOCAL_ONLY_DO_NOT_COMMIT'},
  output:{staging_root:'local-assets/staging/ASSET-900021',overwrite:false,manifest_required:true,hash_outputs:true},
  unreal_editor_requirements:['PythonScriptPlugin','EditorScriptingUtilities'],
  authority_boundary:'fixture',
};

test('Unreal asset paths normalize without inventing content paths', () => {
  assert.equal(normalizeUnrealAssetPath('/Game/Fantasy/SM_Castle'), '/Game/Fantasy/SM_Castle');
  assert.throws(() => normalizeUnrealAssetPath('C:\\Content\\SM_Castle'), /Invalid Unreal asset path/);
  assert.throws(() => normalizeUnrealAssetPath('/Game/../Secret'), /Invalid Unreal asset path/);
});

test('GLB execution requires the GLTF exporter plugin', () => {
  const plugins=requiredPlugins('GLB',['PythonScriptPlugin']);
  assert.ok(plugins.includes('PythonScriptPlugin'));
  assert.ok(plugins.includes('EditorScriptingUtilities'));
  assert.ok(plugins.includes('GLTFExporter'));
});

test('binding upgrades v1 draft to a local-only v2 executable job', () => {
  const bound=bindUnrealExportJob(v1,{projectPath:'./Fixtures/Bridge.uproject',assetPath:'/Game/Fantasy/SM_Castle',repoRoot:'/tmp/pixelforge'});
  assert.equal(bound.schema,'pixelforge.unreal-export-job.v2');
  assert.equal(bound.state,'READY_FOR_UNREAL_EXECUTION');
  assert.equal(bound.source.requires_operator_binding,false);
  assert.equal(bound.source.unreal_asset_path,'/Game/Fantasy/SM_Castle');
  assert.ok(bound.unreal_editor_requirements.includes('GLTFExporter'));
  assert.equal(bound.output.overwrite,false);
  assert.match(bound.output.receipt_path,/ASSET-900021\.unreal-export-receipt\.v1\.json$/);
});

test('binding refuses non-GLB/GLTF formats in the first executor rung', () => {
  assert.throws(() => bindUnrealExportJob({...v1,requested_interchange_format:'FBX'},{projectPath:'./Bridge.uproject',assetPath:'/Game/Foo/Bar'}), /supports GLB\/GLTF only/);
});

test('receipt verification checks bytes and sha256 without granting compatibility', () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pf-ue-'));
  const file=path.join(dir,'ASSET-900021.glb');
  fs.writeFileSync(file,Buffer.from('fixture-glb'));
  const bound=bindUnrealExportJob(v1,{projectPath:'./Fixtures/Bridge.uproject',assetPath:'/Game/Fantasy/SM_Castle',repoRoot:dir});
  const receipt={
    schema:'pixelforge.unreal-export-receipt.v1',status:'PASS',record_id:bound.record_id,
    source_record_sha256:bound.source_record_sha256,
    output:{file_path:file,bytes:fs.statSync(file).size,sha256:sha256File(file)},
  };
  const result=verifyUnrealExportReceipt(bound,receipt);
  assert.equal(result.verified,true);
  assert.equal(result.status,'EXPORT_VERIFIED_IMPORT_PENDING');
  assert.match(result.boundary,/does not grant source compatibility PASS/);
});
