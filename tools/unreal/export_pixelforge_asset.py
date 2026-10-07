"""PixelForge Unreal-side GLB executor.

Run only inside Unreal Editor through UnrealEditor-Cmd -ExecutePythonScript.
The script consumes a bound v2 job from PIXELFORGE_UNREAL_EXPORT_JOB, exports
one explicitly named Unreal asset, hashes the payload, and writes a receipt.
It never edits source governance or marks an asset compatibility-approved.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import unreal

JOB_SCHEMA = 'pixelforge.unreal-export-job.v2'
RECEIPT_SCHEMA = 'pixelforge.unreal-export-receipt.v1'


def now_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def log(message: str) -> None:
    unreal.log(f'[PIXELFORGE EXPORT] {message}')


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def message_list(obj, name: str) -> list[str]:
    if obj is None:
        return []
    try:
        value = getattr(obj, name)
        return [str(item) for item in value]
    except Exception:
        return []


def engine_version() -> str:
    try:
        return str(unreal.SystemLibrary.get_engine_version())
    except Exception:
        return 'UNKNOWN'


def export_gltf(asset, output_path: Path):
    if not hasattr(unreal, 'GLTFExporter') or not hasattr(unreal, 'GLTFExportOptions'):
        raise RuntimeError('GLTFExporter plugin/API is unavailable. Enable the GLTF Exporter plugin in the Unreal project.')

    options = unreal.GLTFExportOptions()
    try:
        if hasattr(unreal, 'GLTFTextureImageFormat'):
            options.set_editor_property('texture_image_format', unreal.GLTFTextureImageFormat.PNG)
    except Exception:
        pass

    result = unreal.GLTFExporter.export_to_gltf(asset, str(output_path), options, set())
    success = False
    messages = None
    if isinstance(result, tuple):
        success = bool(result[0])
        messages = result[1] if len(result) > 1 else None
    elif isinstance(result, bool):
        success = result
    elif result is None:
        success = output_path.exists()
    else:
        messages = result
        success = len(message_list(messages, 'errors')) == 0 and output_path.exists()
    return success, messages


def main() -> int:
    job_env = os.environ.get('PIXELFORGE_UNREAL_EXPORT_JOB', '').strip()
    if not job_env:
        unreal.log_error('[PIXELFORGE EXPORT] PIXELFORGE_UNREAL_EXPORT_JOB is not set.')
        return 2

    job_path = Path(job_env).expanduser().resolve()
    job = json.loads(job_path.read_text(encoding='utf-8'))
    receipt_path = Path(job.get('output', {}).get('receipt_path', '')).expanduser()
    if not receipt_path.is_absolute():
        receipt_path = (job_path.parent / receipt_path).resolve()
    receipt_path.parent.mkdir(parents=True, exist_ok=True)

    receipt = {
        'schema': RECEIPT_SCHEMA,
        'generated_utc': now_utc(),
        'status': 'FAIL',
        'record_id': job.get('record_id'),
        'source_record_sha256': job.get('source_record_sha256'),
        'engine_version': engine_version(),
        'job_path': str(job_path),
        'unreal_asset_path': job.get('source', {}).get('unreal_asset_path'),
        'requested_interchange_format': job.get('requested_interchange_format'),
        'output': None,
        'messages': {'warnings': [], 'errors': [], 'suggestions': []},
        'qualification_state': 'EXPORT_NOT_VERIFIED',
        'boundary': 'This receipt records export execution only. It does not grant compatibility PASS, license approval, visual approval, or PixelForge runtime readiness.',
    }

    try:
        if job.get('schema') != JOB_SCHEMA or job.get('state') != 'READY_FOR_UNREAL_EXECUTION':
            raise RuntimeError('Expected a READY_FOR_UNREAL_EXECUTION PixelForge Unreal export job v2.')
        fmt = str(job.get('requested_interchange_format', '')).upper()
        if fmt not in ('GLB', 'GLTF'):
            raise RuntimeError(f'v5.29 executor supports GLB/GLTF only, received {fmt or "<missing>"}.')
        asset_path = job['source']['unreal_asset_path']
        asset = unreal.load_asset(asset_path)
        if asset is None:
            raise RuntimeError(f'Unreal asset could not be loaded: {asset_path}')

        staging = Path(job['output']['staging_root']).expanduser().resolve()
        staging.mkdir(parents=True, exist_ok=True)
        extension = '.glb' if fmt == 'GLB' else '.gltf'
        output_path = staging / f"{job['record_id']}{extension}"
        if output_path.exists() and not bool(job['output'].get('overwrite')):
            raise RuntimeError(f'Refusing to overwrite existing export: {output_path}')

        success, messages = export_gltf(asset, output_path)
        receipt['messages'] = {
            'warnings': message_list(messages, 'warnings'),
            'errors': message_list(messages, 'errors'),
            'suggestions': message_list(messages, 'suggestions'),
        }
        if not success or not output_path.exists():
            raise RuntimeError('Unreal glTF exporter did not produce a successful output file.')

        receipt['status'] = 'PASS'
        receipt['asset_class'] = asset.get_class().get_name() if asset.get_class() else 'UNKNOWN'
        receipt['output'] = {
            'file_path': str(output_path),
            'bytes': output_path.stat().st_size,
            'sha256': sha256_file(output_path),
        }
        receipt['qualification_state'] = 'EXPORT_PASS_AWAITING_PIXELFORGE_VERIFICATION'
        log(f"PASS {job['record_id']} -> {output_path}")
        rc = 0
    except Exception as exc:
        receipt['status'] = 'FAIL'
        receipt['error'] = repr(exc)
        receipt['messages']['errors'].append(str(exc))
        unreal.log_error(f'[PIXELFORGE EXPORT] {exc!r}')
        rc = 1

    receipt_path.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    log(f'Receipt: {receipt_path}')
    return rc


raise SystemExit(main())
