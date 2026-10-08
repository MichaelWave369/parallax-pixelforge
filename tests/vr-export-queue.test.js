import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAssetCatalog} from '../vr-studio/asset-catalog.js';
import {createExportQueue,parseExportQueue,validateExportQueue,
  EXPORT_QUEUE_MAX} from '../vr-studio/export-queue.js';
import {validateThumbnailFiles,THUMBNAIL_MAX_TOTAL_BYTES,
  THUMBNAIL_MAX_FILES} from '../vr-studio/private-thumbnails.js';

const record=(n,category='Environment')=>({
 record_id:'ASSET-'+String(n).padStart(6,'0'),
 asset_name:'Fixture Asset '+n,primary_category:category,
 publisher:'Test',license_status:'Unknown',compatibility_state:'UNTESTED'
});
const catalog=parseAssetCatalog(JSON.stringify([
 record(1),record(2,'Vehicle / Machinery'),record(3,'Gameplay System / Plugin'),
 record(4,'VFX'),record(5,'Materials / Textures'),record(6)
]));
test('reviewed queue includes only known static 3D candidates and no execution authority',()=>{
 const draft=createExportQueue(['ASSET-000001','ASSET-000002'],catalog);
 assert.equal(draft.state,'OPERATOR_REVIEWED_DRAFT');
 assert.equal(draft.authority,'PLAN_ONLY_NO_EXECUTION');
 assert.deepEqual(draft.record_ids,['ASSET-000001','ASSET-000002']);
 assert.deepEqual(parseExportQueue(JSON.stringify(draft)),draft);
 assert.equal(JSON.stringify(draft).includes('file_path'),false);
 assert.equal(JSON.stringify(draft).includes('unreal_asset_path'),false);
});
test('browser queue refuses duplicates, unknown IDs and non-static category routes',()=>{
 for(const ids of [
  [],['ASSET-000001','ASSET-000001'],['ASSET-000999'],
  ['ASSET-000003'],['ASSET-000004'],['ASSET-000005']
 ])assert.throws(()=>createExportQueue(ids,catalog));
 assert.throws(()=>createExportQueue(Array.from({length:EXPORT_QUEUE_MAX+1},()=> 'ASSET-000001'),catalog));
});
test('fake executable fields or forged approvals cannot become a queue',()=>{
 const base=createExportQueue(['ASSET-000001'],catalog);
 for(const bad of [
  {...base,state:'EXECUTE_APPROVED'},
  {...base,authority:'RUN_UNREAL_EDITOR'},
  {...base,qualified_for_use:true},
  {...base,record_ids:['../evil']},
  {...base,record_ids:['ASSET-000001','ASSET-000001']},
  {...base,target:'RUN_SCRIPTS'},
  {...base,record_ids:[]},
  {...base,boundary:'trust me'}
 ])assert.throws(()=>validateExportQueue(bad));
 assert.throws(()=>parseExportQueue(' '.repeat(8193)));
});
test('thumbnail names bind to known IDs and supported local MIME types',()=>{
 const ids=new Set(catalog.map(x=>x.id));
 const files=[
  {name:'ASSET-000001.png',type:'image/png',size:30000},
  {name:'ASSET-000002.jpeg',type:'image/jpeg',size:20000},
  {name:'ASSET-000003.webp',type:'image/webp',size:25000}
 ];
 const out=validateThumbnailFiles(files,ids);
 assert.deepEqual(out.map(x=>x.id),['ASSET-000001','ASSET-000002','ASSET-000003']);
 const rejects=[
  [{name:'ASSET-000999.png',type:'image/png',size:30000}],
  [{name:'../../asset.png',type:'image/png',size:30000}],
  [{name:'ASSET-000001.svg',type:'image/svg+xml',size:30000}],
  [{name:'ASSET-000001.png',type:'image/jpeg',size:30000}],
  [{name:'ASSET-000001.png',type:'image/png',size:2_000_001}],
  [files[0],files[0]],
  []
 ];
 for(const bad of rejects)assert.throws(()=>validateThumbnailFiles(bad,ids));
 assert.ok(THUMBNAIL_MAX_TOTAL_BYTES<=64_000_000);
 assert.equal(THUMBNAIL_MAX_FILES,400);
});
test('263-entry private inventory can form stable maximum-bounded review queues',()=>{
 const collection=parseAssetCatalog(JSON.stringify(Array.from({length:263},(_,i)=>record(i+1))));
 const ids=collection.slice(0,EXPORT_QUEUE_MAX).map(x=>x.id);
 const queue=createExportQueue(ids,collection);
 assert.equal(queue.record_ids.length,EXPORT_QUEUE_MAX);
 assert.equal(queue.record_ids[0],'ASSET-000001');
 assert.equal(queue.record_ids.at(-1),'ASSET-000024');
});
