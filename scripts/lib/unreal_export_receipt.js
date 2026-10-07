import crypto from 'node:crypto';
import fs from 'node:fs';

export const UNREAL_EXPORT_RECEIPT_V1 = 'pixelforge.unreal-export-receipt.v1';

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function verifyUnrealExportReceipt(job, receipt) {
  const checks = {
    job_schema: job?.schema === 'pixelforge.unreal-export-job.v2',
    receipt_schema: receipt?.schema === UNREAL_EXPORT_RECEIPT_V1,
    receipt_pass: receipt?.status === 'PASS',
    record_matches: receipt?.record_id === job?.record_id,
    source_hash_matches: receipt?.source_record_sha256 === job?.source_record_sha256,
    output_declared: typeof receipt?.output?.file_path === 'string' && receipt.output.file_path.length > 0,
    output_exists: false,
    bytes_match: false,
    hash_match: false,
  };

  if (checks.output_declared && fs.existsSync(receipt.output.file_path)) {
    checks.output_exists = true;
    const stat = fs.statSync(receipt.output.file_path);
    checks.bytes_match = stat.isFile() && stat.size === receipt.output.bytes;
    if (stat.isFile()) checks.hash_match = sha256File(receipt.output.file_path) === receipt.output.sha256;
  }

  const verified = Object.values(checks).every(Boolean);
  return {
    schema: 'pixelforge.external-asset-export-verification.v1',
    record_id: job?.record_id || null,
    verified,
    status: verified ? 'EXPORT_VERIFIED_IMPORT_PENDING' : 'EXPORT_VERIFICATION_FAIL',
    checks,
    boundary:
      'A verified export proves file production and provenance integrity only. It does not grant source compatibility PASS, license approval, visual approval, or PixelForge runtime readiness.',
  };
}
