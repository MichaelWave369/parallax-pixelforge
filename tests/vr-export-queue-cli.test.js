import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createExportQueue} from '../vr-studio/export-queue.js';
import {parseAssetCatalog} from '../vr-studio/asset-catalog.js';

const cli=fileURLToPath(new URL('../scripts/plan_unreal_export_queue.js',import.meta.url));
const rawRecord=n=>({
 record_id:'ASSET-'+String(n).padStart(6,'0'),
 asset_name:'Fixture Environment '+n,primary_category:'Environment',
 license_status:'Owned / Library',compatibility_state:'UNTESTED',
 lane_verdict:'UNDECIDED',source_kind:'TEST'
});
test('explicit local --confirm-plan creates only unbound v1 draft jobs',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixelforge-queue-'));
 try {
  const records=[rawRecord(1),rawRecord(2),rawRecord(3)];
  const source=path.join(dir,'catalog.json'),queuePath=path.join(dir,'queue.json');
  fs.writeFileSync(source,JSON.stringify(records));
  const queue=createExportQueue(['ASSET-000001','ASSET-000002'],
    parseAssetCatalog(JSON.stringify(records)));
  fs.writeFileSync(queuePath,JSON.stringify(queue));
  const run=(extra=[])=>spawnSync(process.execPath,[cli,source,queuePath,...extra],
    {cwd:dir,encoding:'utf8'});
  const noConfirm=run();
  assert.equal(noConfirm.status,2);
  assert.equal(fs.existsSync(path.join(dir,'local-assets')),false);
  const yes=run(['--confirm-plan']);
  assert.equal(yes.status,0,yes.stderr);
  const output=path.join(dir,'local-assets/jobs/queue-drafts');
  const files=fs.readdirSync(output);
  assert.deepEqual(files,[
   'ASSET-000001.unreal-export-job.v1.json',
   'ASSET-000002.unreal-export-job.v1.json'
  ]);
  for(const file of files){
   const job=JSON.parse(fs.readFileSync(path.join(output,file),'utf8'));
   assert.equal(job.schema,'pixelforge.unreal-export-job.v1');
   assert.equal(job.state,'DRAFT_OPERATOR_BINDING_REQUIRED');
   assert.equal(job.source.unreal_asset_path,null);
   assert.equal(job.source.storage_policy,'LOCAL_ONLY_DO_NOT_COMMIT');
   assert.equal(job.requested_interchange_format,'GLB');
   assert.notEqual(job.compatibility_state,'PASS');
  }
  const again=run(['--confirm-plan']);
  assert.equal(again.status,1);
  assert.match(again.stderr,/Refusing overwrite/);
  assert.equal(fs.readdirSync(output).length,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('local CLI fails closed for forged queue or ineligible source record',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pixelforge-bad-queue-'));
 try {
  const records=[rawRecord(1)];
  const source=path.join(dir,'records.json'),queuePath=path.join(dir,'queue.json');
  fs.writeFileSync(source,JSON.stringify(records));
  const eligible=parseAssetCatalog(JSON.stringify(records));
  const draft=createExportQueue(['ASSET-000001'],eligible);
  fs.writeFileSync(queuePath,JSON.stringify({...draft,authority:'EXECUTE_UE'}));
  const run=()=>spawnSync(process.execPath,[cli,source,queuePath,'--confirm-plan'],
    {cwd:dir,encoding:'utf8'});
  assert.equal(run().status,1);
  // The original plan was valid but the authoritative local catalog has changed.
  fs.writeFileSync(queuePath,JSON.stringify(draft));
  fs.writeFileSync(source,JSON.stringify([{...rawRecord(1),
    primary_category:'Gameplay System / Plugin'}]));
  assert.equal(run().status,1);
  assert.equal(fs.existsSync(path.join(dir,'local-assets')),false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
