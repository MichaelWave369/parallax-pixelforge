import test from 'node:test';
import assert from 'node:assert/strict';
import {CATALOG_BYTES,parseAssetCatalog,searchCatalog,catalogCounts,laneFor,
  canPlanGlb,exportPlanningCommand} from '../vr-studio/asset-catalog.js';

const base=(number,category='Environment')=>({
  record_id:'ASSET-'+String(number).padStart(6,'0'),
  source_inventory_id:number,
  asset_name:'Environment '+number,
  publisher:'Fixture Studios',
  primary_category:category,
  style:'Stylized',
  tags:['Cyberpunk','Urban'],
  project_matches:['VR World Composer'],
  suggested_priority:4,
  license_status:'Owned / Library',
  compatibility_state:'UNTESTED',
  lane_verdict:'UNDECIDED',
  install_status:'Not audited'
});
test('loads complete private governed record collection and keeps stable IDs',()=>{
  const src=Array.from({length:263},(_,i)=>base(i+1));
  const got=parseAssetCatalog(JSON.stringify(src));
  assert.equal(got.length,263);
  assert.equal(got[0].id,'ASSET-000001');
  assert.equal(got[262].id,'ASSET-000263');
  assert.ok(got.every(x=>x.lane==='PORTABLE'&&!x.qualifiedForUse));
  assert.deepEqual(catalogCounts(got),{PORTABLE:263,BAKEABLE:0,REIMPLEMENT:0});
});
test('v5.28 passports/registry import works without granting compatibility',()=>{
  const input={
    schema:'pixelforge.external-asset-registry.v1',
    record_count:2,
    passports:[
      {...base(21),schema:'pixelforge.external-asset-passport.v1',
        pixelforge_lane:'PORTABLE',qualified_for_use:true,
        compatibility_state:'PASS',lane_verdict:'APPROVED'},
      {...base(44,'Gameplay System / Plugin'),pixelforge_lane:'PORTABLE',
        qualified_for_use:true}
    ]
  };
  const assets=parseAssetCatalog(JSON.stringify(input));
  assert.equal(assets[0].qualifiedForUse,false);
  assert.equal(assets[0].compatibility,'PASS');
  assert.equal(assets[1].lane,'REIMPLEMENT');
  assert.equal(canPlanGlb(assets[0]),true);
  assert.equal(canPlanGlb(assets[1]),false);
});
test('correct three-lane routing and non-GLB portable categories',()=>{
  const items=parseAssetCatalog(JSON.stringify([
    base(1,'Environment'),base(2,'VFX'),base(3,'Editor / Production Tool'),
    base(4,'Audio / Music'),base(5,'Animation'),base(6,'Vehicle / Machinery')
  ]));
  assert.deepEqual(catalogCounts(items),{PORTABLE:4,BAKEABLE:1,REIMPLEMENT:1});
  assert.equal(laneFor('Unknown'),'REIMPLEMENT');
  for(const id of ['ASSET-000002','ASSET-000003','ASSET-000004','ASSET-000005'])
    assert.equal(canPlanGlb(items.find(x=>x.id===id)),false);
  assert.equal(canPlanGlb(items.find(x=>x.id==='ASSET-000006')),true);
  assert.equal(searchCatalog(items,'Vehicle').length,1);
  assert.equal(searchCatalog(items,'Cyberpunk','Environment').length,1);
  assert.equal(searchCatalog(items,'','all','BAKEABLE').length,1);
  assert.throws(()=>searchCatalog(items,'','all','ELEVATED_ADMIN'));
});
test('duplicate, oversized, invalid category and bad identity all fail closed',()=>{
  assert.throws(()=>parseAssetCatalog(JSON.stringify([base(1),base(1)])),/Duplicate/);
  assert.throws(()=>parseAssetCatalog(JSON.stringify([{...base(2),record_id:'../../asset'}])));
  assert.throws(()=>parseAssetCatalog(JSON.stringify([{...base(2),primary_category:'TROJAN'}])));
  assert.throws(()=>parseAssetCatalog(JSON.stringify([])));
  assert.throws(()=>parseAssetCatalog(JSON.stringify(Array.from({length:1001},(_,i)=>base(i+1)))));
  assert.throws(()=>parseAssetCatalog('a'.repeat(CATALOG_BYTES+1)));
  assert.throws(()=>parseAssetCatalog(JSON.stringify({schema:'not-a-registry',passports:[base(1)]})));
});
test('all display text is bounded, user-provided approval never takes effect',()=>{
  const a=parseAssetCatalog(JSON.stringify([{
    ...base(7),
    asset_name:'<img src=x onerror=alert(1)>'.repeat(100),
    publisher:'P'.repeat(1200),qualified_for_use:true,source_redistribution_allowed:true,
    install_status:'Ready',tags:['T'.repeat(300)]
  }]))[0];
  assert.ok(a.name.length<=140);
  assert.ok(a.publisher.length<=100);
  assert.ok(a.tags[0].length<=75);
  assert.equal(a.qualifiedForUse,false);
});
test('export plan is draft command only, not executed, never offers bad paths',()=>{
  const world=parseAssetCatalog(JSON.stringify([base(21)]))[0];
  const cmd=exportPlanningCommand(world);
  assert.equal(cmd,'npm run asset:external -- local-assets/source/ue_asset_arsenal_263.records.json --record ASSET-000021 --mode NATIVE_3D --format GLB');
  assert.throws(()=>exportPlanningCommand(world,'https://example.invalid/private.json'));
  assert.throws(()=>exportPlanningCommand(parseAssetCatalog(JSON.stringify([
    base(1,'Gameplay System / Plugin')]))[0]));
});
