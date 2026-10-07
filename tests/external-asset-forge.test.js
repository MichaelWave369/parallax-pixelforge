import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExternalAssetPassport,
  buildExternalAssetRegistry,
  buildUnrealExportJob,
  classifyExternalAsset,
} from '../scripts/lib/external_asset_forge.js';

const base = {
  publisher: 'Fixture Studio',
  style: 'Fixture',
  tags: [],
  gameplay_role: 'Fixture',
  project_matches: [],
  suggested_priority: 3,
  license_status: 'Owned / Library',
  install_status: 'Not audited',
  audit_status: 'Not reviewed',
  compatibility_state: 'UNTESTED',
  lane_verdict: 'UNDECIDED',
  source_kind: 'TEST_FIXTURE',
};

test('three-lane routing is deterministic', () => {
  assert.equal(classifyExternalAsset({ ...base, primary_category: 'Environment' }), 'PORTABLE');
  assert.equal(classifyExternalAsset({ ...base, primary_category: 'VFX' }), 'BAKEABLE');
  assert.equal(classifyExternalAsset({ ...base, primary_category: 'Gameplay System / Plugin' }), 'REIMPLEMENT');
});

test('passport preserves governed uncertainty instead of auto-promoting it', () => {
  const passport = buildExternalAssetPassport({
    ...base,
    record_id: 'ASSET-900001',
    source_inventory_id: 1,
    asset_name: 'Fixture Environment',
    primary_category: 'Environment',
  });
  assert.equal(passport.compatibility_state, 'UNTESTED');
  assert.equal(passport.lane_verdict, 'UNDECIDED');
  assert.equal(passport.qualified_for_use, false);
  assert.equal(passport.source_storage, 'LOCAL_ONLY');
  assert.equal(passport.source_redistribution_allowed, false);
});

test('qualified flag requires both PASS compatibility and an approved verdict', () => {
  const passport = buildExternalAssetPassport({
    ...base,
    record_id: 'ASSET-900002',
    asset_name: 'Qualified Fixture',
    primary_category: 'Environment',
    compatibility_state: 'PASS',
    lane_verdict: 'APPROVED',
  });
  assert.equal(passport.qualified_for_use, true);
});

test('registry rejects duplicate governed identities', () => {
  const row = {
    ...base,
    record_id: 'ASSET-900003',
    asset_name: 'Duplicate Fixture',
    primary_category: 'Environment',
  };
  assert.throws(() => buildExternalAssetRegistry([row, row]), /Duplicate governed asset id/);
});

test('portable asset can produce an operator-bound Unreal export job', () => {
  const passport = buildExternalAssetPassport({
    ...base,
    record_id: 'ASSET-900004',
    asset_name: 'Portable Fixture',
    primary_category: 'Environment',
  });
  const job = buildUnrealExportJob(passport, { mode: 'NATIVE_3D', format: 'GLB' });
  assert.equal(job.state, 'DRAFT_OPERATOR_BINDING_REQUIRED');
  assert.equal(job.source.unreal_asset_path, null);
  assert.equal(job.source.storage_policy, 'LOCAL_ONLY_DO_NOT_COMMIT');
  assert.equal(job.requested_interchange_format, 'GLB');
  assert.match(job.output.staging_root, /^local-assets\/staging\//);
});

test('reimplementation lane cannot masquerade as a direct asset export', () => {
  const passport = buildExternalAssetPassport({
    ...base,
    record_id: 'ASSET-900005',
    asset_name: 'System Fixture',
    primary_category: 'Gameplay System / Plugin',
  });
  assert.throws(() => buildUnrealExportJob(passport), /REIMPLEMENT/);
});
