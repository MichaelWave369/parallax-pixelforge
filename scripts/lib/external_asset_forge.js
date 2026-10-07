import crypto from 'node:crypto';

export const EXTERNAL_ASSET_SCHEMA = 'pixelforge.external-asset-passport.v1';
export const EXPORT_JOB_SCHEMA = 'pixelforge.unreal-export-job.v1';

const PORTABLE = new Set([
  'Environment',
  'Audio / Music',
  'Character / NPC',
  'Vehicle / Machinery',
  'Props / Furniture',
  'Weapon Pack',
  'Materials / Textures',
  'Creature / Animal',
  'UI / Media',
  'Animation',
  'Bundle',
]);

const BAKEABLE = new Set(['VFX']);

const REIMPLEMENT = new Set([
  'Gameplay System / Plugin',
  'Editor / Production Tool',
  'Template / Sample',
  'Tutorial / Training',
]);

const APPROVED_VERDICTS = new Set(['APPROVED', 'APPROVED_WITH_RESTRICTIONS']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

export function stableSha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function classifyExternalAsset(record) {
  const category = String(record?.primary_category || '').trim();
  if (BAKEABLE.has(category)) return 'BAKEABLE';
  if (REIMPLEMENT.has(category)) return 'REIMPLEMENT';
  if (PORTABLE.has(category)) return 'PORTABLE';
  return 'REIMPLEMENT';
}

export function forgeTargetsFor(record, lane = classifyExternalAsset(record)) {
  const category = String(record?.primary_category || '').trim();

  if (lane === 'REIMPLEMENT') return ['FEATURE_REFERENCE'];
  if (lane === 'BAKEABLE') return ['FLIPBOOK', 'SPRITE_SHEET', 'BACKGROUND_PLATE', 'TEXTURE_SET'];

  if (category === 'Audio / Music') return ['AUDIO_CUE_PACK'];
  if (category === 'UI / Media') return ['UI_MEDIA'];
  if (category === 'Materials / Textures') return ['TEXTURE_SET', 'TILESET', 'BACKGROUND_PLATE'];
  if (category === 'Animation') return ['ANIMATION_SOURCE', 'PIXEL_SPRITE'];

  return ['NATIVE_3D', 'TWO_POINT_FIVE_D', 'PIXEL_SPRITE', 'TILESET', 'BACKGROUND_PLATE'];
}

export function buildExternalAssetPassport(record) {
  if (!record || typeof record !== 'object') throw new Error('Asset record must be an object.');
  if (!/^ASSET-\d{6}$/.test(String(record.record_id || ''))) {
    throw new Error(`Invalid governed asset record_id: ${record.record_id || '<missing>'}`);
  }
  if (!record.asset_name || !record.primary_category) {
    throw new Error(`Asset ${record.record_id} is missing asset_name or primary_category.`);
  }

  const lane = classifyExternalAsset(record);
  const compatibilityState = record.compatibility_state || 'UNKNOWN';
  const laneVerdict = record.lane_verdict || 'UNDECIDED';
  const qualifiedForUse = compatibilityState === 'PASS' && APPROVED_VERDICTS.has(laneVerdict);

  return {
    schema: EXTERNAL_ASSET_SCHEMA,
    record_id: record.record_id,
    source_inventory_id: record.source_inventory_id ?? null,
    asset_name: record.asset_name,
    publisher: record.publisher || 'Unknown',
    primary_category: record.primary_category,
    style: record.style || '',
    tags: Array.isArray(record.tags) ? record.tags : [],
    gameplay_role: record.gameplay_role || '',
    project_matches: Array.isArray(record.project_matches) ? record.project_matches : [],
    suggested_priority: record.suggested_priority ?? null,
    license_status: record.license_status || 'Unknown',
    install_status: record.install_status || 'Unknown',
    audit_status: record.audit_status || 'Unknown',
    compatibility_state: compatibilityState,
    lane_verdict: laneVerdict,
    source_kind: record.source_kind || 'UNKNOWN',
    source_record_sha256: stableSha256(record),
    pixelforge_lane: lane,
    forge_targets: forgeTargetsFor(record, lane),
    source_storage: 'LOCAL_ONLY',
    source_redistribution_allowed: false,
    qualified_for_use: qualifiedForUse,
    qualification_boundary:
      'Classification is a routing hint only. Compatibility and license authority remain governed by the source record and human review.',
  };
}

export function buildExternalAssetRegistry(records, options = {}) {
  if (!Array.isArray(records)) throw new Error('External asset registry input must be an array.');
  const seen = new Set();
  const passports = records.map(record => {
    if (seen.has(record?.record_id)) throw new Error(`Duplicate governed asset id: ${record.record_id}`);
    seen.add(record?.record_id);
    return buildExternalAssetPassport(record);
  });

  const lane_counts = passports.reduce(
    (acc, passport) => {
      acc[passport.pixelforge_lane] += 1;
      return acc;
    },
    { PORTABLE: 0, BAKEABLE: 0, REIMPLEMENT: 0 },
  );

  return {
    schema: 'pixelforge.external-asset-registry.v1',
    generated_at: options.generatedAt || new Date().toISOString(),
    source_label: options.sourceLabel || 'LOCAL_GOVERNED_REGISTRY',
    source_sha256: options.sourceSha256 || null,
    record_count: passports.length,
    lane_counts,
    qualified_count: passports.filter(passport => passport.qualified_for_use).length,
    passports,
    boundary:
      'This registry indexes local governed metadata. It does not contain marketplace source files, grant redistribution rights, or auto-promote compatibility.',
  };
}

export function buildUnrealExportJob(passport, options = {}) {
  if (!passport || passport.schema !== EXTERNAL_ASSET_SCHEMA) {
    throw new Error('A PixelForge external asset passport is required.');
  }
  if (passport.pixelforge_lane === 'REIMPLEMENT') {
    throw new Error(`${passport.record_id} is REIMPLEMENT and has no direct Unreal export job.`);
  }

  const mode = options.mode || passport.forge_targets[0];
  if (!passport.forge_targets.includes(mode)) {
    throw new Error(`Unsupported forge target ${mode} for ${passport.record_id}.`);
  }

  const format = String(options.format || (mode === 'NATIVE_3D' || mode === 'TWO_POINT_FIVE_D' ? 'GLB' : 'PNG')).toUpperCase();

  return {
    schema: EXPORT_JOB_SCHEMA,
    job_id: `PF-UE-${passport.record_id}-${mode}`,
    state: 'DRAFT_OPERATOR_BINDING_REQUIRED',
    record_id: passport.record_id,
    source_record_sha256: passport.source_record_sha256,
    requested_forge_target: mode,
    requested_interchange_format: format,
    source: {
      unreal_asset_path: null,
      requires_operator_binding: true,
      storage_policy: 'LOCAL_ONLY_DO_NOT_COMMIT',
    },
    output: {
      staging_root: `local-assets/staging/${passport.record_id}`,
      overwrite: false,
      manifest_required: true,
      hash_outputs: true,
    },
    unreal_editor_requirements: ['PythonScriptPlugin', 'EditorScriptingUtilities'],
    authority_boundary:
      'This job requests export only. It does not approve the asset, change its compatibility state, or authorize redistribution.',
  };
}
