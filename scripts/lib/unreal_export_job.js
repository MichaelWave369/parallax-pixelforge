import path from 'node:path';

export const UNREAL_EXPORT_JOB_V1 = 'pixelforge.unreal-export-job.v1';
export const UNREAL_EXPORT_JOB_V2 = 'pixelforge.unreal-export-job.v2';

export function normalizeUnrealAssetPath(value) {
  const assetPath = String(value || '').trim().replaceAll('\\', '/');
  if (!assetPath.startsWith('/') || assetPath.includes('..') || /\s/.test(assetPath)) {
    throw new Error(`Invalid Unreal asset path: ${value || '<missing>'}`);
  }
  const segments = assetPath.split('/').filter(Boolean);
  if (segments.length < 2 || segments.some(segment => !/^[A-Za-z0-9_.-]+$/.test(segment))) {
    throw new Error(`Invalid Unreal asset path: ${value || '<missing>'}`);
  }
  return assetPath;
}

export function requiredPlugins(format, existing = []) {
  const plugins = new Set(existing || []);
  plugins.add('PythonScriptPlugin');
  plugins.add('EditorScriptingUtilities');
  const normalized = String(format || '').toUpperCase();
  if (normalized === 'GLB' || normalized === 'GLTF') plugins.add('GLTFExporter');
  return [...plugins];
}

export function bindUnrealExportJob(job, options = {}) {
  if (!job || job.schema !== UNREAL_EXPORT_JOB_V1) {
    throw new Error('A PixelForge Unreal export job v1 is required for binding.');
  }
  if (job.state !== 'DRAFT_OPERATOR_BINDING_REQUIRED') {
    throw new Error(`Job ${job.job_id || '<unknown>'} is not awaiting operator binding.`);
  }
  const projectPath = path.resolve(String(options.projectPath || '').trim());
  if (!projectPath.toLowerCase().endsWith('.uproject')) {
    throw new Error('A .uproject path is required.');
  }
  const unrealAssetPath = normalizeUnrealAssetPath(options.assetPath);
  const format = String(job.requested_interchange_format || '').toUpperCase();
  if (!['GLB', 'GLTF'].includes(format)) {
    throw new Error(`v5.29 executor supports GLB/GLTF only, received ${format || '<missing>'}.`);
  }
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const stagingRoot = path.resolve(repoRoot, job.output?.staging_root || `local-assets/staging/${job.record_id}`);
  const receiptPath = path.resolve(repoRoot, `local-assets/receipts/${job.record_id}.unreal-export-receipt.v1.json`);

  return {
    ...job,
    schema: UNREAL_EXPORT_JOB_V2,
    state: 'READY_FOR_UNREAL_EXECUTION',
    source: {
      ...job.source,
      project_path: projectPath,
      unreal_asset_path: unrealAssetPath,
      requires_operator_binding: false,
      storage_policy: 'LOCAL_ONLY_DO_NOT_COMMIT',
    },
    output: {
      ...job.output,
      staging_root: stagingRoot,
      receipt_path: receiptPath,
      overwrite: false,
      manifest_required: true,
      hash_outputs: true,
    },
    unreal_editor_requirements: requiredPlugins(format, job.unreal_editor_requirements),
    execution_boundary:
      'READY means paths are bound and syntax-valid. It does not mean Unreal, the exporter plugin, the asset, or the license has been qualified.',
  };
}
